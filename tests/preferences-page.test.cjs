const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../web-update/js/waitlist-preferences.js'),'utf8');
class El{
 constructor(){this.children=[];this.listeners={};this.checked=false;this.disabled=false;this.hidden=false;this.textContent='';this.value='';}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 addEventListener(name,fn){this.listeners[name]=fn;}
 dispatch(name){return this.listeners[name]?.({preventDefault(){}});}
 querySelectorAll(selector){const all=[];const walk=n=>{for(const child of n.children){if(child.type==='checkbox')all.push(child);walk(child);}};walk(this);return selector==='input:checked'?all.filter(e=>e.checked):all;}
}
const tick=()=>new Promise(r=>setImmediate(r));
async function setup(options={}){
 const ids=['preferencesForm','unsubscribeAll','productChoices','confirmUnsubscribe','loadMessage','submitMessage','retryLoad','accountHint','preferencesView','confirmationView','confirmationMessage'];
 const el=Object.fromEntries(ids.map(id=>[id,new El()]));el.preferencesForm.hidden=true;el.confirmationView.hidden=true;
 const calls=[];
 vm.runInNewContext(code,{URLSearchParams,window:{location:{hash:options.noToken?'':'#t=signed-personal-link'}},document:{getElementById:id=>el[id],createElement:()=>new El()},fetch:async(url,opts)=>{
  const data=JSON.parse(opts.body);calls.push({url,data});
  if(options.failList&&data.action==='list')throw new TypeError('offline');
  if(options.pending&&data.action==='unsubscribe')await options.pending;
  if(options.failSave&&data.action==='unsubscribe')return {ok:false,json:async()=>({error:'No se pudo guardar.'})};
  return {ok:true,json:async()=>({ok:true,emailHint:'o***@example.test',all:data.action==='unsubscribe'?data.all:!!options.all,products:[{sku:'ONE',name:'Silla de comedor',unsubscribed:!!options.all},{sku:'TWO',name:'Jabonera',unsubscribed:!!options.all}]})};
 }});
 await tick();return {el,calls,inputs:()=>el.productChoices.querySelectorAll('input')};
}
test('opening personal link only lists; it does not unsubscribe or send',async()=>{const h=await setup();assert.equal(h.calls.length,1);assert.equal(h.calls[0].data.action,'list');assert.equal(h.el.preferencesForm.hidden,false);assert.equal(h.el.confirmUnsubscribe.disabled,true);assert.equal(h.inputs().length,2);});
test('one selected product is submitted only after confirmation',async()=>{const h=await setup();const first=h.inputs()[0];first.checked=true;first.dispatch('change');assert.equal(h.calls.length,1);assert.equal(h.el.confirmUnsubscribe.disabled,false);await h.el.preferencesForm.dispatch('submit');assert.deepEqual(h.calls[1].data,{token:'signed-personal-link',action:'unsubscribe',all:false,skus:['ONE']});assert.equal(h.el.confirmationView.hidden,false);});
test('global opt-out includes future notices, not Newsletter',async()=>{const h=await setup();h.el.unsubscribeAll.checked=true;h.el.unsubscribeAll.dispatch('change');await h.el.preferencesForm.dispatch('submit');assert.equal(h.calls[1].data.all,true);assert.deepEqual(h.calls[1].data.skus,['ONE','TWO']);assert.match(h.el.confirmationMessage.textContent,/todos tus avisos/);assert.ok(h.calls.every(c=>c.url==='./api/brevo/preferences.php'));});
test('unchecking a product changes global choice to a product selection',async()=>{const h=await setup();h.el.unsubscribeAll.checked=true;h.el.unsubscribeAll.dispatch('change');h.inputs()[1].checked=false;h.inputs()[1].dispatch('change');await h.el.preferencesForm.dispatch('submit');assert.equal(h.calls[1].data.all,false);assert.deepEqual(h.calls[1].data.skus,['ONE']);});
test('empty selection never saves',async()=>{const h=await setup();await h.el.preferencesForm.dispatch('submit');assert.equal(h.calls.length,1);assert.match(h.el.submitMessage.textContent,/Selecciona/);});
test('missing token never requests data',async()=>{const h=await setup({noToken:true});assert.equal(h.calls.length,0);assert.match(h.el.loadMessage.textContent,/enlace personal/);});
test('invalid or unavailable lookup does not expose choices',async()=>{const h=await setup({failList:true});assert.equal(h.el.preferencesForm.hidden,true);assert.equal(h.el.retryLoad.hidden,false);});
test('save failure never displays successful confirmation',async()=>{const h=await setup({failSave:true});h.inputs()[0].checked=true;h.inputs()[0].dispatch('change');await h.el.preferencesForm.dispatch('submit');assert.equal(h.el.confirmationView.hidden,true);assert.match(h.el.submitMessage.textContent,/No se confirmó/);});
test('global unsubscribe already saved cannot be toggled back on',async()=>{const h=await setup({all:true});assert.equal(h.el.preferencesForm.hidden,true);assert.equal(h.el.unsubscribeAll.disabled,true);assert.ok(h.inputs().every(input=>input.disabled));assert.equal(h.calls.length,1);});
test('duplicate confirmation while saving cannot create multiple writes',async()=>{let resolve;const pending=new Promise(r=>resolve=r);const h=await setup({pending});h.inputs()[0].checked=true;h.inputs()[0].dispatch('change');const a=h.el.preferencesForm.dispatch('submit');await h.el.preferencesForm.dispatch('submit');assert.equal(h.calls.length,2);resolve();await a;});
