import {allowedRequest} from './network.mjs';
import fs from 'node:fs';
import {packet,transmit} from './eos-control.mjs';
export function createCueHandler(cfg,sender=cue=>transmit(packet(cue,cfg.controlList||2),cfg.eosHost,cfg.eosPort),lookup=()=> 'loading'){
 let busy=false;
 
 return async(req,res)=>{
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(req.method!=='POST')return reply(405,{error:'POST required'});
  if(!allowedRequest(req,cfg.port))return reply(403,{error:'Open the keypad from this server'});
  if(busy)return reply(409,{error:'Another cue command is being sent'});
  let body='';for await(const chunk of req){body+=chunk;if(body.length>256)return reply(413,{error:'Request too large'});}
  let cue;try{const input=JSON.parse(body);if(input.revision!==cfg.revision)return reply(409,{error:'Settings changed. Refresh before sending a cue.'});cue=input.cue;if(typeof cue!=='string')throw Error();packet(cue,cfg.controlList||2);}catch{return reply(400,{error:'Enter a valid cue number'});}
  const existence=lookup(cfg.controlList||2,cue);
  if(existence==='missing')return reply(404,{error:`Cue ${cfg.controlList||2}/${cue} does not exist`});
  if(existence!=='found')return reply(503,{error:'Cue list is updating. Try again shortly.'});
  busy=true;
  try{await sender(cue);fs.appendFileSync(new URL('./web-eos-actions.jsonl',import.meta.url),JSON.stringify({at:new Date().toISOString(),source:req.socket.remoteAddress,list:cfg.controlList||2,cue,status:'sent'})+'\n');return reply(200,{sent:true,list:cfg.controlList||2,cue});}
  catch(e){fs.appendFileSync(new URL('./web-eos-actions.jsonl',import.meta.url),JSON.stringify({at:new Date().toISOString(),list:cfg.controlList||2,cue,error:e.message})+'\n');return reply(502,{error:e.message});}
  finally{busy=false;}
 };
}
