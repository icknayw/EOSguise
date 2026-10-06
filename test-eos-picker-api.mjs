import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const testRoot=new URL('./tests/test-state/picker-api/',import.meta.url);fs.mkdirSync(testRoot,{recursive:true});
const dir=fs.mkdtempSync(path.join(fileURLToPath(testRoot),'mock-'));
for(const name of ['web-eos.mjs','network.mjs','eos-control.mjs','osc.mjs'])fs.copyFileSync(new URL('./'+name,import.meta.url),path.join(dir,name));
const {createCueHandler}=await import(pathToFileURL(path.join(dir,'web-eos.mjs')));
let existence='found',sent=[],fail=false;
const cfg={port:38304,revision:9,controlList:2};
const handler=createCueHandler(cfg,async cue=>{if(fail)throw Error('Mock Eos unavailable');sent.push(cue);},()=>existence);
async function post(cue,revision=9){
 const req={method:'POST',headers:{host:'127.0.0.1:38304',origin:'http://127.0.0.1:38304','content-type':'application/json'},socket:{remoteAddress:'mock'},async *[Symbol.asyncIterator](){yield JSON.stringify({cue,revision});}};
 let status,data;await handler(req,{writeHead:s=>status=s,end:s=>data=JSON.parse(s)});return {status,...data};
}
assert.equal((await post('0.3')).status,200);assert.deepEqual(sent,['0.3']);
existence='missing';assert.equal((await post('99999')).status,404);assert.deepEqual(sent,['0.3'],'Missing cue must never be sent');
existence='loading';assert.equal((await post('13')).status,503);assert.deepEqual(sent,['0.3']);
existence='found';assert.equal((await post('13',8)).status,409);assert.equal((await post('bad')).status,400);
fail=true;assert.equal((await post('13')).status,502);
console.log('PASS: API validates cue existence, rejects missing/loading/stale/invalid cues, supports decimal cues, surfaces send failures; mocked transport only');
