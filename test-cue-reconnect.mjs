import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {CueCatalogue} from './cue-catalogue.mjs';

const source=fs.readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('let catalogueSource='),source.indexOf('let catalogue=new'));
const catalogue=new CueCatalogue();
const cfg={eosHost:'console-a',eosPort:3037,cueLists:[1,2]};
const ctx=vm.createContext({cfg,catalogue});
vm.runInContext(helper,ctx);
vm.runInContext('prepareCatalogue()',ctx);
catalogue.begin(1,1);catalogue.add({list:1,number:'265',part:0,name:'Test'},0);
vm.runInContext('prepareCatalogue()',ctx);
assert.equal([...catalogue.values()].length,1,'Same-console reconnect must retain its catalogue');
cfg.eosHost='console-b';vm.runInContext('prepareCatalogue()',ctx);
assert.equal([...catalogue.values()].length,0,'Changing consoles must not show the previous show catalogue');
assert(source.includes('received.clear();prepareCatalogue();state.eos.loaded'),'Connection startup must use the preservation helper');
console.log('PASS: real reconnect path retains same-console cues and clears on console change');
