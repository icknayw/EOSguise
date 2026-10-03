import os from 'node:os';
export function addresses(port,interfaces=os.networkInterfaces()){
 const rows=[];const seen=new Set();
 for(const [name,entries] of Object.entries(interfaces))for(const item of entries||[]){
  if(seen.has(item.address))continue;seen.add(item.address);
  const ipv6=item.family==='IPv6'||item.family===6;
  const scoped=ipv6&&/^fe80:/i.test(item.address);
  rows.push({name:item.internal?'This computer':name,address:item.address,local:!!item.internal,adapter:name,host:scoped?item.address+'%'+item.scopeid:item.address,
   url:scoped?null:'http://'+(ipv6?'['+item.address+']':item.address)+':'+port+'/',
   ...(scoped?{note:'IPv6 link-local'}:{})});
 }
 return rows.sort((a,b)=>Number(a.local)-Number(b.local)||a.name.localeCompare(b.name)||a.address.localeCompare(b.address));
}
export function allowedRequest(req,port,interfaces=os.networkInterfaces()){
 const hosts=new Set(['localhost',os.hostname().toLowerCase(),'127.0.0.1','[::1]']);
 for(const entries of Object.values(interfaces))for(const item of entries||[])hosts.add(item.address.includes(':')?'['+item.address.toLowerCase()+']':item.address);
 const host=req.headers.host||'';
 return [...hosts].some(h=>host.toLowerCase()===h+':'+port)&&req.headers.origin==='http://'+host&&req.headers['content-type']?.split(';')[0]==='application/json';
}
