const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'web-update/api/brevo');
const php = process.env.PHP_BIN || 'php';
const docName = id => 'projects/nautica-ca65d/databases/(default)/documents/productWaitlist/' + id;
const d = (id='one', status='pending', sku='NCAS001', email='owner@example.test') => ({name:docName(id),updateTime:'2026-10-16T10:00:00Z',fields:{email:{stringValue:email},sku:{stringValue:sku},productName:{stringValue:'Jabonera'},status:{stringValue:status}}});
const pref = (all=false, skus=[]) => ({updateTime:'2026-10-16T10:00:00Z',fields:{email:{stringValue:'owner@example.test'},all:{booleanValue:all},skus:{arrayValue:{values:skus.map(stringValue=>({stringValue}))}}}});
const b64 = s => Buffer.from(s).toString('base64');
function run({code='',endpoint='',data={},docs={one:d()},plan=[],origin='https://www.nauticahome.com.mx',method='POST',auth='Bearer admin-test',contentType='application/json',raw=null,tracking=false}={}) {
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nautica-backend-test-'));
 for(const name of ['preferences-common.php','email-template.php'])fs.copyFileSync(path.join(backend,name),path.join(temp,name));
 const bootstrapSource=fs.readFileSync(path.join(backend,'bootstrap.php'),'utf8');
 const sendEmailSource=bootstrapSource.slice(bootstrapSource.indexOf('function send_email('));
 const fixture=`<?php
 declare(strict_types=1);
 $GLOBALS['plan']=json_decode(base64_decode('${b64(JSON.stringify(plan))}'),true);
 $GLOBALS['docs']=json_decode(base64_decode('${b64(JSON.stringify(docs))}'),true);
 $GLOBALS['calls']=[];$GLOBALS['out']=[];
 register_shutdown_function(function(){echo json_encode($GLOBALS['out']+['calls'=>$GLOBALS['calls'],'remaining'=>count($GLOBALS['plan'])]);});
 function respond(int $status,array $data):never{$GLOBALS['out']=['status'=>$status,'data'=>$data];exit;}
 function config():array{return ['api_key'=>'unit-test-signing-secret'];}
 function technical_token(array $cfg):string{return 'unit-test-technical-token';}
 function admin_token():void{if(($_SERVER['HTTP_AUTHORIZATION']??'')!=='Bearer admin-test')respond(401,['error'=>'Administrador no autorizado.']);}
 function b64url(string $s):string{return rtrim(strtr(base64_encode($s),'+/','-_'),'=');}
 function unb64url(string $s):string|false{return base64_decode(strtr($s,'-_','+/'),true);}
 function field(array $doc,string $key):string{return (string)($doc['fields'][$key]['stringValue']??'');}
 function fs_get(string $id,string $token):array{if(!isset($GLOBALS['docs'][$id]))throw new RuntimeException('missing');return $GLOBALS['docs'][$id];}
 function fs_patch(string $id,string $token,array $fields,array $mask,?string $updateTime=null):void{$GLOBALS['calls'][]=['url'=>'FS_PATCH','id'=>$id,'fields'=>$fields,'mask'=>$mask,'updateTime'=>$updateTime];}
 function signed_link(string $id,string $sku,array $cfg):string{return 'https://www.nauticahome.com.mx/api/brevo/track-product.php?t=tracking-test';}
 function request(string $url,string $method='GET',array $headers=[],?string $body=null):array{
  $GLOBALS['calls'][]=['url'=>$url,'method'=>$method,'body'=>json_decode($body??'',true)];
  $step=array_shift($GLOBALS['plan']);if(!$step)throw new RuntimeException('Unexpected network call');
  if(isset($step['url'])&&!str_contains($url,$step['url']))throw new RuntimeException('Unexpected URL: '.$url);
  if(isset($step['method'])&&$step['method']!==$method)throw new RuntimeException('Unexpected method');
  if(isset($step['throw']))throw new RuntimeException($step['throw']);return [$step['code'],$step['body']??[]];
 }
 require_once __DIR__.'/preferences-common.php';require_once __DIR__.'/email-template.php';
 ${sendEmailSource}
 `;
 fs.writeFileSync(path.join(temp,'bootstrap.php'),fixture);
 let script=`<?php\n$_SERVER['REQUEST_METHOD']='${method}';$_SERVER['CONTENT_TYPE']='${contentType}';$_SERVER['HTTP_AUTHORIZATION']='${auth}';$_SERVER['HTTP_ORIGIN']='${origin}';\n`;
 // Tokens are generated in PHP using the production signing helper, never real credentials.
 script+=`require __DIR__.'/bootstrap.php';\n$input=json_decode(base64_decode('${b64(JSON.stringify(data))}'),true);if(($input['token']??'')==='VALID')$input['token']=wl_preferences_token('one','owner@example.test',config());\n`;
 if(tracking) script+="$p=b64url(json_encode(['id'=>'one','sku'=>'NCAS001','exp'=>time()+3600]));$_GET['t']=$p.'.'.b64url(hash_hmac('sha256',$p,config()['api_key'],true));\n";
 if(endpoint){
  let src=fs.readFileSync(path.join(backend,endpoint),'utf8');
  src=src.replace("require __DIR__.'/bootstrap.php';","require_once __DIR__.'/bootstrap.php';");
  src=src.replace(/file_get_contents\('php:\/\/input'(?:,false,null,0,32769)?\)/g,raw===null?'json_encode($input)':`base64_decode('${b64(raw)}')`);
  fs.writeFileSync(path.join(temp,'endpoint.php'),src);
  script+="require __DIR__.'/endpoint.php';";
 }else script+=code;
 fs.writeFileSync(path.join(temp,'case.php'),script);
 const res=spawnSync(php,['case.php'],{cwd:temp,encoding:'utf8',env:{...process.env,PHP:'8.2'},timeout:30000});
 try{assert.equal(res.status,0,res.stderr+'\n'+res.stdout);try{return JSON.parse(res.stdout);}catch(error){throw new Error(res.stdout+'\n'+res.stderr);}}finally{fs.rmSync(temp,{recursive:true,force:true});}
}

test('signed preferences token round trip, tampering, and tracking-domain separation',()=>{
 const r=run({code:`$t=wl_preferences_token('one','owner@example.test',config());$ok=wl_preferences_id($t,config())==='one';$bad=false;try{wl_preferences_id($t.'x',config());}catch(InvalidArgumentException $e){$bad=true;}$p=b64url(json_encode(['id'=>'one','sku'=>'NCAS001','exp'=>time()+3600]));$tracking=$p.'.'.b64url(hash_hmac('sha256',$p,config()['api_key'],true));$separate=false;try{wl_preferences_id($tracking,config());}catch(InvalidArgumentException $e){$separate=true;}respond(200,['ok'=>$ok,'bad'=>$bad,'separate'=>$separate]);`});
 assert.deepEqual(r.data,{ok:true,bad:true,separate:true});assert.equal(r.calls.length,0);
});
test('expired token is rejected before Firestore access',()=>{
 const r=run({code:`$p=b64url(json_encode(['purpose'=>'waitlist-preferences','id'=>'one','emailHash'=>wl_pref_id('owner@example.test'),'exp'=>time()-1]));$t=$p.'.'.b64url(hash_hmac('sha256',$p,wl_preference_key(config()),true));try{wl_preferences_id($t,config());respond(500,[]);}catch(InvalidArgumentException $e){respond(400,[]);}`});assert.equal(r.status,400);assert.equal(r.calls.length,0);
});
test('email hashing is case-insensitive and product preference is isolated',()=>{
 const r=run({code:`respond(200,['same'=>wl_pref_id(' Owner@Example.Test ')===wl_pref_id('owner@example.test'),'one'=>wl_is_unsubscribed(['all'=>false,'skus'=>['NCAS001']],' ncas001 '),'two'=>wl_is_unsubscribed(['all'=>false,'skus'=>['NCAS001']],'OTHER'),'global'=>wl_is_unsubscribed(['all'=>true,'skus'=>[]],'FUTURE')]);`});assert.deepEqual(r.data,{same:true,one:true,two:false,global:true});
});
test('missing preference permits delivery; denied preference lookup fails closed',()=>{
 for(const status of [404,403]){
  const r=run({plan:[{code:status}],code:`try{$p=wl_pref_get('owner@example.test','token');respond(200,['all'=>$p['all']]);}catch(RuntimeException $e){respond(503,[]);}`});assert.equal(r.status,status===404?200:503);
 }
});
test('GET preferences link never mutates data or sends email',()=>{
 const r=run({endpoint:'preferences.php',method:'GET'});assert.equal(r.status,405);assert.equal(r.calls.length,0);
});
test('foreign origin, non-JSON, invalid token and oversized input fail before backend calls',()=>{
 for(const opts of [{origin:'https://evil.example'},{contentType:'application/x-www-form-urlencoded'},{data:{action:'list',token:'bad'}},{raw:'x'.repeat(32769)}]){
  const r=run({endpoint:'preferences.php',...opts});assert.ok(r.status>=400&&r.status<500);assert.equal(r.calls.length,0);
 }
});
test('opening preferences lists only owned products, without commits or Brevo',()=>{
 const r=run({endpoint:'preferences.php',data:{action:'list',token:'VALID'},plan:[{url:':runQuery',code:200,body:[{document:d()}]},{url:'waitlistEmailPreferences',code:404}]});
 assert.equal(r.status,200);assert.equal(r.data.products[0].sku,'NCAS001');assert.equal(r.data.emailHint,'o***@example.test');assert.equal(r.calls.length,2);assert.ok(r.calls.every(c=>!c.url.includes(':commit')&&!c.url.includes('brevo.com')));
});
test('one or several products save preference then status; unrelated product stays active',()=>{
 const docs=[d(),d('two','sent','OTHER')];
 const r=run({endpoint:'preferences.php',data:{action:'unsubscribe',token:'VALID',all:false,skus:['NCAS001']},plan:[{code:200,body:docs.map(document=>({document}))},{code:404},{code:404},{url:':commit',code:200},{url:':commit',code:200}]});
 assert.equal(r.status,200);assert.equal(r.data.products.find(p=>p.sku==='NCAS001').unsubscribed,true);assert.equal(r.data.products.find(p=>p.sku==='OTHER').unsubscribed,false);
 assert.equal(r.calls[3].body.writes[0].update.fields.all.booleanValue,false);
 assert.equal(r.calls[4].body.writes.length,1);assert.equal(r.calls[4].body.writes[0].update.fields.status.stringValue,'unsubscribed');
});
test('global opt-out persists for future products, even when status sync fails',()=>{
 const r=run({endpoint:'preferences.php',data:{action:'unsubscribe',token:'VALID',all:true,skus:[]},plan:[{code:200,body:[{document:d()}]},{code:404},{code:404},{code:200},{code:412}]});
 assert.equal(r.status,200);assert.equal(r.data.all,true);assert.equal(r.data.statusSyncPending,true);assert.equal(r.data.products[0].unsubscribed,true);
});
test('unowned selection and empty selection do not write',()=>{
 for(const skus of [[],['SOMEONE-ELSES-SKU']]){
  const r=run({endpoint:'preferences.php',data:{action:'unsubscribe',token:'VALID',all:false,skus},plan:[{code:200,body:[{document:d()}]},{code:404}]});assert.equal(r.status,400);assert.equal(r.calls.length,2);
 }
});
test('concurrent preference confirmations merge previous opt-outs instead of erasing them',()=>{
 const r=run({plan:[{code:404},{code:409},{code:200,body:pref(false,['OTHER'])},{code:200}],code:`$p=wl_save_preferences('owner@example.test',['NCAS001'],false,'token');respond(200,$p);`});
 assert.equal(r.status,200);assert.deepEqual(r.data.skus,['OTHER','NCAS001']);assert.equal(r.calls[3].body.writes[0].currentDocument.updateTime,'2026-10-16T10:00:00Z');
});
test('individual opt-out cannot undo an existing global opt-out',()=>{
 const r=run({plan:[{code:200,body:pref(true,[])},{code:200}],code:`respond(200,wl_save_preferences('owner@example.test',['NCAS001'],false,'token'));`});assert.equal(r.data.all,true);
});
test('send and resend reject document or global opt-out before contacting Brevo',()=>{
 for(const status of ['unsubscribed','pending','sent','visited']){
  const r=run({endpoint:'send-waitlist.php',origin:'https://panel.nauticahome.com.mx',data:{id:'one'},docs:{one:d('one',status)},plan:status==='unsubscribed'?[]:[{code:200,body:pref(true)}]});assert.equal(r.status,409);assert.equal(r.data.status,'unsubscribed');assert.ok(r.calls.every(c=>!c.url.includes('api.brevo.com')));
 }
});
test('admin check still gates email POST',()=>{
 const r=run({endpoint:'send-waitlist.php',data:{id:'one'},auth:'Bearer unauthorized'});assert.equal(r.status,401);assert.equal(r.calls.length,0);
});
test('accepted email carries image, logo, signed preferences, tracked CTA and Avenir',()=>{
 const r=run({endpoint:'send-waitlist.php',origin:'https://panel.nauticahome.com.mx',data:{id:'one'},plan:[{code:404},{code:200,body:{fields:{imageUrl:{stringValue:'https://images.example.test/product.png'}}}},{code:404},{url:'api.brevo.com',code:201,body:{messageId:'message-test'}}]});
 assert.equal(r.status,200);const body=r.calls.find(c=>c.url.includes('api.brevo.com')).body;assert.match(body.htmlContent,/font-family:Avenir/);assert.match(body.htmlContent,/#NoPlaceLikeHOME/);assert.match(body.htmlContent,/assets\/email\/nautica-home-logo.png/);assert.match(body.htmlContent,/https:\/\/images.example.test\/product.png/);assert.match(body.htmlContent,/track-product.php\?t=tracking-test/);assert.match(body.htmlContent,/avisos.html#t=/);assert.doesNotMatch(body.htmlContent,/unit-test-signing-secret/);assert.ok(r.calls.find(c=>c.url==='FS_PATCH'));
});
test('an opt-out discovered after image lookup prevents the send',()=>{
 const r=run({endpoint:'send-waitlist.php',origin:'https://panel.nauticahome.com.mx',data:{id:'one'},plan:[{code:404},{code:200,body:{fields:{imageUrl:{stringValue:'https://images.example.test/photo.jpg'}}}},{code:200,body:pref(true)}]});assert.equal(r.status,409);assert.ok(r.calls.every(c=>!c.url.includes('api.brevo.com')));
});
test('image comes from override first, then ERP SKU; failure returns empty without throwing',()=>{
 const plans=[
  [{code:200,body:{fields:{imageUrl:{stringValue:'/assets/custom.png'}}}}],
  [{code:404},{code:200,body:[]},{code:200,body:{productos:[{sku:'NCAS001',imagen:'https://images.example.test/erp.png'}]}}],
  [{code:404},{code:200,body:[]},{code:503}]
 ];
 const expected=['https://www.nauticahome.com.mx/assets/custom.png','https://images.example.test/erp.png',''];
 plans.forEach((plan,i)=>{const r=run({plan,code:`respond(200,['image'=>wl_product_image('NCAS001','token')]);`});assert.equal(r.data.image,expected[i]);});
});
test('HTML escapes product data and optional image omission is clean',()=>{
 const r=run({code:`respond(200,['html'=>wl_email_html('<script>alert(1)</script>','SKU','https://example.test/product','https://example.test/preferences','')]);`});
 assert.match(r.data.html,/&lt;script&gt;/);assert.doesNotMatch(r.data.html,/<script>/);assert.doesNotMatch(r.data.html,/src=""/);
});
test('tracking keeps original HMAC and updates only sent records that are not opted out',()=>{
 const old=fs.readFileSync(path.join(root,'original-backend/track-product.php'),'utf8');
 const current=fs.readFileSync(path.join(backend,'track-product.php'),'utf8');
 assert.equal(current.replace("if(field($doc,'status')==='sent'&&!wl_is_unsubscribed(wl_pref_get(field($doc,'email'),$token),$sku)){","if(field($doc,'status')==='sent'){"),old);
 const originalBootstrap=fs.readFileSync(path.join(root,'original-backend/bootstrap.php'),'utf8');
 const updatedBootstrap=fs.readFileSync(path.join(backend,'bootstrap.php'),'utf8');
 assert.equal(updatedBootstrap.split("require_once __DIR__.'/preferences-common.php'")[0],originalBootstrap.split('function send_email(')[0]);
});


test('personal link cannot be reused after its source record changes recipient',()=>{
 const r=run({endpoint:'preferences.php',data:{action:'list',token:'VALID'},docs:{one:d('one','pending','NCAS001','different@example.test')}});
 assert.equal(r.status,400);assert.equal(r.calls.length,0);
});
test('tracking marks sent as visited but never overwrites an opt-out',()=>{
 for(const [status,all,visits] of [['sent',false,true],['sent',true,false],['unsubscribed',false,false],['pending',false,false]]){
  const r=run({endpoint:'track-product.php',method:'GET',tracking:true,docs:{one:d('one',status)},plan:status==='sent'?[{code:all?200:404,body:pref(all)}]:[]});
  const patches=r.calls.filter(c=>c.url==='FS_PATCH');assert.equal(patches.length,visits?1:0);
  if(visits)assert.equal(patches[0].fields.status.stringValue,'visited');
 }
});
test('multiple selected products are disabled while an unselected product remains active',()=>{
 const docs=[d(),d('two','sent','SECOND'),d('three','sent','THIRD')];
 const r=run({endpoint:'preferences.php',data:{action:'unsubscribe',token:'VALID',all:false,skus:['NCAS001','SECOND']},plan:[{code:200,body:docs.map(document=>({document}))},{code:404},{code:404},{code:200},{code:200}]});
 assert.equal(r.status,200);assert.deepEqual(r.data.products.map(p=>p.unsubscribed),[true,true,false]);assert.equal(r.calls[4].body.writes.length,2);
});
test('optional image service failure cannot block a permitted email',()=>{
 const r=run({endpoint:'send-waitlist.php',origin:'https://panel.nauticahome.com.mx',data:{id:'one'},plan:[{code:404},{code:404},{code:200,body:[]},{code:503},{code:404},{code:201,body:{messageId:'accepted-without-photo'}}]});
 assert.equal(r.status,200);const html=r.calls.find(c=>c.url.includes('api.brevo.com')).body.htmlContent;assert.match(html,/#NoPlaceLikeHOME/);assert.doesNotMatch(html,/src=""/);
});

test('custom-ID product override takes priority over ERP',()=>{
 const r=run({plan:[{code:404},{url:':runQuery',code:200,body:[{document:{fields:{imageUrl:{stringValue:'https://images.example.test/editorial.png'}}}}]}],code:`respond(200,['image'=>wl_product_image('NCAS001','token')]);`});
 assert.equal(r.data.image,'https://images.example.test/editorial.png');assert.equal(r.calls.length,2);
});
