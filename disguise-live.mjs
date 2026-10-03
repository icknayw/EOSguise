import WebSocket from './vendor/ws/wrapper.mjs';
export const properties={
 transport:'object.description', track:'object.track.description',
 time:'object.track.beatToTime(object.player.tCurrent)',
 section:'int(object.track.beatToSection(object.player.tCurrent)) + 1',
 sectionStart:'object.track.beatToTime(object.track.sectionToBeat(object.track.beatToSection(object.player.tCurrent)))',
 previousStart:'object.track.beatToTime(object.track.sectionToBeat(max(0,int(object.track.beatToSection(object.player.tCurrent))-1)))',
 sectionName:'object.track.cueAtBeat(object.track.sectionToBeat(object.track.beatToSection(object.player.tCurrent))).getNote()',
 cue:'[str(x.text) for x in object.track.cueAtBeat(object.track.sectionToBeat(object.track.beatToSection(object.player.tCurrent))).getTags()]',
 engaged:'object.engaged', playmode:'str(object.player.playMode)', brightness:'object.brightness', output:'LocalState.directorState().output'
};
export async function discover(director,request=fetch){
 const r=await request(director+'/api/session/transport/activetransport',{signal:AbortSignal.timeout(5000)}),p=await r.json();
 if(!r.ok||p.status?.code!==0||!Array.isArray(p.result))throw Error('Cannot read Director transports');
 return p.result.map(t=>({uid:String(t.uid),name:String(t.name)})).filter(t=>/^\d+$/.test(t.uid));
}
export function createLive(cfg,onState,{Socket=WebSocket,request=fetch,retryMs=3000,heartbeatMs=2000}={}){
 let ws,timer,heartbeat,epoch=0,closed=false,snapshot={connected:false},ids=new Map(),seen=new Set(),pongAt=0;
 const publish=()=>{snapshot.sectionTime=Number.isFinite(snapshot.time)&&Number.isFinite(snapshot.sectionStart)?snapshot.time-snapshot.sectionStart:null; onState({...snapshot,connected:snapshot.connected&&seen.has('time')&&seen.has('engaged')&&seen.has('output')&&seen.has('playmode'),feedback:'Live Update'});};
 const fail=message=>{snapshot.connected=false;snapshot.error=message;publish();};
 async function connect(){
  const gen=++epoch;ids=new Map();seen=new Set();snapshot={connected:false};publish();
  try{
   const transports=await discover(cfg.director,request);if(closed||gen!==epoch)return;
   const selected=cfg.transportUid?transports.find(t=>t.uid===cfg.transportUid):transports.find(t=>t.name===(cfg.transportName||'show'));
   if(!selected)throw Error('Selected transport is unavailable. Choose one in Settings.');
   snapshot.transportUid=selected.uid;snapshot.transport=selected.name;
   const url=new URL('/api/session/liveupdate',cfg.director);url.protocol=url.protocol==='https:'?'wss:':'ws:';
   const socket=ws=new Socket(url,{handshakeTimeout:5000});
   socket.on('open',()=>{
    if(gen!==epoch)return socket.close();pongAt=Date.now();
    socket.send(JSON.stringify({subscribe:{object:'getByUID('+selected.uid+')',properties:Object.values(properties),configuration:{updateFrequencyMs:250}}}));
    heartbeat=setInterval(()=>{if(gen!==epoch)return;if(Date.now()-pongAt>6500){fail('Director feedback timed out');socket.terminate();return;}socket.ping();},heartbeatMs);
   });
   socket.on('pong',()=>{if(gen!==epoch)return;pongAt=Date.now();snapshot.updated=pongAt;publish();});
   socket.on('message',raw=>{if(gen!==epoch)return;try{
    const data=JSON.parse(String(raw));
    if(data.error||data.errors){fail('Live Update subscription error');socket.terminate();return;}
    for(const s of data.subscriptions||[]){const field=Object.keys(properties).find(k=>properties[k]===s.propertyPath);if(field)ids.set(s.id,field);}
    for(const v of data.valuesChanged||[]){const field=ids.get(v.id);if(field){snapshot[field]=field==='cue'&&Array.isArray(v.value)?v.value.join(', '):v.value;seen.add(field);}}
    snapshot.connected=true;snapshot.updated=Date.now();snapshot.error='';publish();
   }catch{fail('Invalid Director feedback');socket.terminate();}});
   socket.on('error',e=>{if(gen===epoch)fail(e.message);});
   socket.on('close',()=>{if(gen!==epoch)return;clearInterval(heartbeat);fail('Director disconnected');if(!closed)timer=setTimeout(connect,retryMs);});
  }catch(e){if(gen!==epoch||closed)return;fail(e.message);timer=setTimeout(connect,retryMs);}
 }
 connect();return {stop(){closed=true;epoch++;clearTimeout(timer);clearInterval(heartbeat);ws?.terminate();}};
}
