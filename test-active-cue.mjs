import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
const start=source.indexOf('const l=state.eos.lists[m[1]],cue=');const end=source.indexOf('\n else if',start);
const branch=source.slice(start,end).replace(/}\s*$/, '');
const state={eos:{lists:{1:{current:null,next:null},2:{current:null,next:null}}}};
function row(list,index,label,number,name,remaining){const ctx=vm.createContext({state,m:[null,String(list),String(index)],v:[label,number,name,'','',false,8000,remaining]});vm.runInContext(branch,ctx);}
row(1,1,'[ 275 Walk DS ]','275','Walk DS',0);
row(1,2,'278 Eng Check it out','278','Eng Check it out',-1);
row(2,1,'[ 267 Fade Projection ]','267','Fade Projection',0);
for(const remaining of [13971,13839,1000,65]){
 row(1,1,`{ 278 Eng Check it out : ${remaining/1000} }`,'278','Eng Check it out',remaining);
 assert.equal(state.eos.lists[1].current?.number,'278','Fading cue must remain active throughout the countdown');
 assert.equal(state.eos.lists[1].current.remaining,remaining);
 assert.equal(state.eos.lists[2].current.number,'267','List 2 must remain independent');
}
row(1,2,'279 Red Girls - AFO','279','Red Girls - AFO',-1);
assert.equal(state.eos.lists[1].next.number,'279');
row(1,1,'[ 278 Eng Check it out ]','278','Eng Check it out',0);
assert.equal(state.eos.lists[1].current.number,'278');assert.equal(state.eos.lists[1].next.number,'279');
row(1,1,' { 0.3 Point cue : 1 }','0.3','Point cue',1000);
assert.equal(state.eos.lists[1].current.number,'0.3');
row(1,1,'1 Pending only','1','Pending only',-1);
assert.equal(state.eos.lists[1].current,null,'A genuinely pending-only bank must still show no active cue');
assert.equal(state.eos.lists[1].next.number,'1');
console.log('PASS: actual server parser recognises active fading and completed cues, decimals, independent lists and pending-only state');
