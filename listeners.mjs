import http from 'node:http';
import {addresses} from './network.mjs';
export function createListeners(cfg,handler,getAddresses=()=>addresses(cfg.port)){
 const active=new Map(),errors=new Map();let stopped=false;
 function reconcile(){
  if(stopped)return;
  const wanted=new Map(getAddresses().filter(a=>a.local||!(cfg.disabledInterfaces||[]).includes(a.adapter)).map(a=>[a.host,a]));
  for(const [host,server] of active)if(!wanted.has(host)){active.delete(host);server.close();server.closeAllConnections();errors.delete(host);}
  for(const [host,a] of wanted)if(!active.has(host)){
   const server=http.createServer(handler);active.set(host,server);
   server.on('error',e=>{if(active.get(host)===server)active.delete(host);errors.set(host,e.message);server.close();});
   server.listen({port:cfg.port,host,...(host.includes(':')?{ipv6Only:true}:{})},()=>errors.delete(host));
  }
 }
 reconcile();const timer=setInterval(reconcile,3000);
 return {reconcile,rows:()=>getAddresses().map(a=>({...a,shared:a.local||!(cfg.disabledInterfaces||[]).includes(a.adapter),error:errors.get(a.host)||''})),stop(){stopped=true;clearInterval(timer);for(const s of active.values()){s.close();s.closeAllConnections();}active.clear();}};
}
