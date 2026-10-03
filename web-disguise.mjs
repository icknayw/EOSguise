import {allowedRequest} from './network.mjs';
import fs from 'node:fs';

export function createDirectorSender(cfg,request=fetch){
 async function api(path,body){
  const r=await request(cfg.director+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(6000)});
  const p=await r.json();if(!r.ok||p.status?.code!==0)throw Error(p.status?.message||'Director command failed');return p;
 }
 return async (action,state)=>{
  const transport={uid:state.transportUid};
  if(['fade-up','fade-down'].includes(action))return api('/api/v1/transportcontrol/'+(action==='fade-up'?'fadeup':'fadedown'),{});
  if(['engage','disengage'].includes(action))return api('/api/session/transport/engaged',{transports:[{transport:transport,engaged:action==='engage'}]});
  if(['play','stop'].includes(action))return api('/api/session/transport/'+(action==='play'?'playsection':'stop'),{transports:[transport]});
  if(['previous','next'].includes(action))return api('/api/session/transport/'+(action==='previous'?'gotoprevsection':'gotonextsection'),{transports:[{transport:transport,playmode:'NotSet'}]});
  if(action==='previous-end'){
   if(state.section<=1)return {message:'Already in the first section'};
   if(!Number.isFinite(state.sectionStart)||!Number.isFinite(state.previousStart))throw Error('Previous section timing is unavailable');
   return api('/api/session/transport/gototime',{transports:[{transport,time:Math.max(state.previousStart,state.sectionStart-1),playmode:'NotSet'}]});
  }
  throw Error('Unknown command');
 };
}
export function createDirectorHandler(cfg,getState,sender=createDirectorSender(cfg),log=entry=>fs.appendFileSync(new URL('./web-disguise-actions.jsonl',import.meta.url),JSON.stringify(entry)+'\n')){
 let busy=false;
 return async(req,res)=>{
  const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(req.method!=='POST')return reply(405,{error:'POST required'});
  if(!allowedRequest(req,cfg.port))return reply(403,{error:'Open controls from this server'});
  let body='';for await(const chunk of req){body+=chunk;if(body.length>256)return reply(413,{error:'Request too large'});}
  let action,input;try{input=JSON.parse(body);action=input.action;}catch{return reply(400,{error:'Invalid request'});}
  if(!['fade-up','fade-down','engage','disengage','play','stop','previous','previous-end','next'].includes(action))return reply(400,{error:'Unknown command'});
  if(input.revision!==cfg.revision)return reply(409,{error:'Settings changed. Refresh before sending a command.'});
  if(busy)return reply(409,{error:'Command in progress'});
  const state=getState();if(!state.connected||Date.now()-state.updated>5000)return reply(503,{error:'Director unavailable'});
  busy=true;
  try{const result=await sender(action,{...state});log({at:new Date().toISOString(),source:req.socket.remoteAddress,action,status:'accepted'});return reply(200,{accepted:true,message:result?.message||'Command accepted'});}
  catch(e){log({at:new Date().toISOString(),source:req.socket.remoteAddress,action,error:e.message});return reply(502,{error:e.message});}
  finally{busy=false;}
 };
}
