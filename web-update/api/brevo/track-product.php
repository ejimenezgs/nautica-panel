<?php
// Technology & Development: Oaxsun Technologies
declare(strict_types=1);
require __DIR__.'/bootstrap.php';
function go(string $sku=''): never {header('Cache-Control: no-store');header('Referrer-Policy: no-referrer');header('Location: https://nauticahome.com.mx/'.($sku!==''?'producto.html?sku='.rawurlencode($sku):'productos.html'),true,302);exit;}
if(($_SERVER['REQUEST_METHOD']??'')!=='GET')respond(405,['error'=>'Método no permitido.']);
try{
 $cfg=config();$t=$_GET['t']??'';if(!is_string($t)||strlen($t)>1400)go();$parts=explode('.',$t);if(count($parts)!==2)go();
 [$payload,$signature]=$parts;$expected=b64url(hash_hmac('sha256',$payload,$cfg['api_key'],true));if(!hash_equals($expected,$signature))go();
 $data=json_decode(unb64url($payload)?:'',true);if(!is_array($data))go();$id=$data['id']??'';$sku=$data['sku']??'';
 if(!is_string($id)||!preg_match('/^[A-Za-z0-9_-]{1,150}$/',$id)||!is_string($sku)||strlen($sku)>120||!is_numeric($data['exp']??null)||(int)$data['exp']<time())go();
 $token=technical_token($cfg);$doc=fs_get($id,$token);if(field($doc,'sku')!==$sku)go();
 if(field($doc,'status')==='sent'&&!wl_is_unsubscribed(wl_pref_get(field($doc,'email'),$token),$sku)){
   try{fs_patch($id,$token,['status'=>['stringValue'=>'visited'],'visitedAt'=>['timestampValue'=>gmdate('Y-m-d\TH:i:s\Z')]],['status','visitedAt'],$doc['updateTime']??null);}catch(Throwable $e){error_log('Nautica tracking update: '.$e->getMessage());}
 }
 go($sku);
}catch(Throwable $e){error_log('Nautica tracking: '.$e->getMessage());go();}
