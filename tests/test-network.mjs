import assert from 'node:assert/strict';import {addresses,allowedRequest} from '../network.mjs';
const n={Ethernet:[{address:'10.1.2.3',family:'IPv4',internal:false},{address:'2001:db8::1',family:'IPv6',internal:false},{address:'fe80::1',family:'IPv6',internal:false}],Loopback:[{address:'127.0.0.1',family:'IPv4',internal:true}]};
const req=host=>({headers:{host,origin:'http://'+host,'content-type':'application/json'}});
assert.equal(allowedRequest(req('10.1.2.3:38304'),38304,n),true);assert.equal(allowedRequest(req('[2001:db8::1]:38304'),38304,n),true);assert.equal(allowedRequest(req('example.com:38304'),38304,n),false);assert.equal(allowedRequest({headers:{...req('10.1.2.3:38304').headers,origin:'http://example.com'}},38304,n),false);
n.WiFi=[{address:'192.168.50.2',family:'IPv4',internal:false}];assert.equal(allowedRequest(req('192.168.50.2:38304'),38304,n),true);assert.ok(addresses(38304,n).some(a=>a.url==='http://192.168.50.2:38304/'));assert.equal(addresses(38304,n).find(a=>a.address==='fe80::1').url,null);
console.log('PASS: IPv4/IPv6 address links, interface additions, host/origin checks, link-local display.');
