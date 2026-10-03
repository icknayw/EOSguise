const $=id=>document.getElementById(id);let cfg,loading=false;
function lists(){const previous=$('controlList').value||String(cfg?.controlList);$('controlList').replaceChildren();for(const id of ['list1','list2']){const n=$(id).value;const o=new Option('List '+n,n);$('controlList').add(o);}if([...$('controlList').options].some(o=>o.value===previous))$('controlList').value=previous;}
async function transports(){loading=true;$('refresh').disabled=true;$('save').disabled=true;const selected=$('transport').value||cfg?.transportUid;try{const r=await fetch('/api/transports?director='+encodeURIComponent($('director').value),{signal:AbortSignal.timeout(6500)}),p=await r.json();if(!r.ok)throw Error(p.error);$('transport').replaceChildren(new Option('Choose transport',''));for(const t of p)$('transport').add(new Option(t.name,t.uid));if(p.some(t=>t.uid===selected))$('transport').value=selected;$('result').textContent='';}catch(e){$('transport').replaceChildren(new Option('Director unavailable',''));$('result').textContent=e.message;}finally{loading=false;$('refresh').disabled=false;$('save').disabled=false;}}
async function load(){try{cfg=await(await fetch('/api/settings')).json();for(const id of ['director','eosHost','eosPort'])$(id).value=cfg[id]||'';$('list1').value=cfg.cueLists[0];$('list2').value=cfg.cueLists[1];lists();await transports();}catch(e){$('result').textContent=e.message;}}
$('refresh').onclick=transports;$('director').onchange=()=>{$('transport').replaceChildren(new Option('Refresh transports',''));};for(const id of ['list1','list2'])$(id).onchange=lists;
$('settings').onsubmit=async e=>{e.preventDefault();if(loading)return;$('save').disabled=true;$('result').textContent='Saving…';try{const body={revision:cfg.revision,transportUid:$('transport').value,cueLists:[$('list1').value,$('list2').value],controlList:$('controlList').value};for(const id of ['director','eosHost','eosPort'])body[id]=$(id).value;const r=await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)}),p=await r.json();if(!r.ok)throw Error(p.error);cfg.revision=p.revision;$('result').textContent='Saved';}catch(e){$('result').textContent=e.message;}finally{$('save').disabled=false;}};load();
let networkBusy=false;
async function share(adapter,shared,checkbox){
 networkBusy=true;checkbox.disabled=true;const status=$('network-status');status.textContent='Saving…';
 try{const r=await fetch('/api/settings/network',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adapter,shared,revision:cfg.revision}),signal:AbortSignal.timeout(5000)}),p=await r.json();if(!r.ok)throw Error(p.error);cfg.revision=p.revision;status.textContent='Saved';}
 catch(e){checkbox.checked=!shared;status.textContent=e.message;}
 finally{networkBusy=false;checkbox.disabled=false;await refreshAddresses(false);}
}
async function refreshAddresses(repeat=true){try{
 if(networkBusy)return;
 const r=await fetch('/api/settings/network',{signal:AbortSignal.timeout(3000)});if(!r.ok)throw Error();const p=await r.json();
 const groups=new Map();for(const a of p.addresses){const key=a.local?'local':a.adapter;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
 const rows=[...groups.values()].map(group=>{
  const first=group[0],row=document.createElement('div');row.className='network-address'+(first.shared?'':' unshared');
  const heading=document.createElement('div');heading.className='network-heading';const name=document.createElement('span');name.textContent=first.name;heading.append(name);
  if(!first.local){const label=document.createElement('label');label.className='share-toggle';const check=document.createElement('input');check.type='checkbox';check.checked=first.shared;check.setAttribute('aria-label','Share on '+first.name);check.onchange=()=>share(first.adapter,check.checked,check);label.append(check,document.createTextNode('Share'));heading.append(label);}else{const badge=document.createElement('span');badge.textContent='Always available';badge.className='hint';heading.append(badge);}
  row.append(heading);
  for(const a of group){const link=document.createElement(a.url&&a.shared&&!a.error?'a':'span');link.textContent=a.url||a.address+' ('+a.note+')';if(link.tagName==='A')link.href=a.url;row.append(link);if(a.error&&a.shared){const error=document.createElement('span');error.textContent=a.error;row.append(error);}}
  return row;
 });$('network-addresses').replaceChildren(...rows);
 }catch{$('network-status').textContent='Cannot reach EOSguise here. Use localhost or another shared network.';}finally{if(repeat)setTimeout(refreshAddresses,10000);}}
refreshAddresses();
