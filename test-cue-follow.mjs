import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
class Row {
 constructor(){this.children=[];this.textContent='';this.current=false;this.classList={toggle:(_,value)=>this.current=value};}
 append(child){this.children.push(child);}
 get firstElementChild(){return this.children[0];}
 get lastElementChild(){return this.children.at(-1);}
 getBoundingClientRect(){const top=this.parent.children.indexOf(this)*40-this.parent.wrap.scrollTop;return {top,bottom:top+40,height:40};}
 closest(){return this.parent.wrap;}
}
function table(){return {children:[],rebuilds:0,wrap:{scrollTop:0,clientHeight:200,getBoundingClientRect:()=>({top:0})},closest(){return this.wrap;},replaceChildren(...rows){this.rebuilds++;this.children=rows;rows.forEach(row=>row.parent=this);},querySelector(){return this.children.find(row=>row.current);}};}
const elements={'#autofollow':{checked:true},'#query':{value:''},'#results1':table(),'#results2':table(),'#search-status1':{},'#search-status2':{}};
const context=vm.createContext({document:{querySelector:s=>elements[s],createElement:()=>new Row()},Date});
const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
vm.runInContext(source.slice(0,source.indexOf('function render()')),context);
vm.runInContext(`state={settings:{cueLists:[1,2]},eos:{connected:true,lastReceived:Date.now(),lists:{1:{current:{number:'20'}},2:{current:{number:'20'}}}}};cues=Array.from({length:40},(_,i)=>({list:1,number:String(i+1),name:'Cue '+(i+1)}));results();`,context);
const body=elements['#results1'],row=body.querySelector(),position=body.wrap.scrollTop;
vm.runInContext('results();results();results();',context);
assert.equal(body.rebuilds,1,'Unchanged feedback must preserve rows');
assert.equal(body.querySelector(),row);assert.equal(body.wrap.scrollTop,position);
vm.runInContext("state.eos.lists[1].current.number='21';results();",context);
assert.equal(body.rebuilds,1);assert.equal(body.querySelector().firstElementChild.textContent,'21');assert.equal(body.wrap.scrollTop,position+40);
vm.runInContext("state.eos.connected=false;results();state.eos.connected=true;results();",context);
assert.equal(body.querySelector().firstElementChild.textContent,'21');
body.wrap.scrollTop=250;
vm.runInContext("state.eos.connected=false;results();state.eos.connected=true;results();",context);
assert.equal(body.wrap.scrollTop,position+40,'Auto-follow must recover when the current cue has slipped out of view');
body.wrap.scrollTop=position+30;
vm.runInContext("state.eos.lists[1].current=null;results();state.eos.lists[1].current={number:'21'};results();",context);
assert.equal(body.wrap.scrollTop,position+30,'An unchanged cue already in view must not jump on feedback recovery');
vm.runInContext("state.eos.lists[1].current.number='21.00';results();",context);
assert.equal(body.querySelector().firstElementChild.textContent,'21','Equivalent numeric cue formatting must retain the current row');
body.wrap.clientHeight=100;
vm.runInContext('results();',context);
assert.equal(body.wrap.scrollTop,position+90,'Resizing must keep an unchanged cue in view');
body.wrap.clientHeight=200;
vm.runInContext("state.eos.lists[1].current={number:'40.5',name:'New live cue'};results();",context);
assert.equal(body.querySelector().firstElementChild.textContent,'40.5','A live cue absent from the refreshing catalogue must still be shown');
elements['#autofollow'].checked=false;body.wrap.scrollTop=400;
vm.runInContext("cues.unshift({list:1,number:'0',name:'New cue'});results();",context);
assert.equal(body.wrap.scrollTop,440,'Catalogue edits must preserve the visible cue anchor');
console.log('PASS: stable rows, ongoing follow visibility, feedback recovery, decimals, resize, newly recorded cues and manual scroll anchor');
