<?php
declare(strict_types=1);
require __DIR__.'/bootstrap.php';
header('Referrer-Policy: no-referrer');
$origin=$_SERVER['HTTP_ORIGIN']??'';
if($origin!==''&&!in_array($origin,['https://www.nauticahome.com.mx','https://nauticahome.com.mx'],true))respond(403,['error'=>'Origen no autorizado.']);
if(($_SERVER['REQUEST_METHOD']??'')!=='POST')respond(405,['error'=>'Método no permitido.']);
if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))respond(415,['error'=>'Formato no válido.']);
try {
    $raw=file_get_contents('php://input',false,null,0,32769);
    if($raw===false||strlen($raw)>32768)respond(413,['error'=>'Solicitud demasiado grande.']);
    $data=json_decode($raw,true);
    if(!is_array($data)||!is_string($data['token']??null)||!in_array($data['action']??'', ['list','unsubscribe'],true))respond(400,['error'=>'Solicitud no válida.']);
    $cfg=config();$claims=wl_preferences_claims($data['token'],$cfg);$id=$claims['id'];
    $token=technical_token($cfg);$source=fs_get($id,$token);$email=field($source,'email');
    if(!filter_var($email,FILTER_VALIDATE_EMAIL)||!hash_equals($claims['emailHash'],wl_pref_id($email)))respond(400,['error'=>'El enlace no corresponde a una suscripción válida.']);
    $docs=wl_documents_for_email($email,$token);$pref=wl_pref_get($email,$token);$synced=true;
    if($data['action']==='unsubscribe') {
        if(!is_bool($data['all']??null)||!is_array($data['skus']??null)||count($data['skus'])>5000)respond(400,['error'=>'Selecciona los avisos que quieres dar de baja.']);
        $all=$data['all'];$skus=$data['skus'];
        if(!$all&&!$skus)respond(400,['error'=>'Selecciona al menos un producto.']);
        $allowed=array_column(wl_preference_products($docs,$pref),'sku');
        foreach($skus as $sku)if(!is_string($sku)||!in_array($sku,$allowed,true))respond(400,['error'=>'Uno de los productos no pertenece a tus avisos.']);
        $pref=wl_save_preferences($email,$skus,$all,$token);
        $synced=wl_mark_unsubscribed($docs,$pref,$token);
        if(!$synced)error_log('Nautica opt-out saved; document status sync pending.');
    }
    $parts=explode('@',$email,2);
    respond(200,['ok'=>true,'emailHint'=>substr($parts[0],0,1).'***@'.$parts[1],'all'=>$pref['all'],'products'=>wl_preference_products($docs,$pref),'statusSyncPending'=>!$synced]);
}catch(InvalidArgumentException $e){respond(400,['error'=>$e->getMessage()]);}
catch(Throwable $e){error_log('Nautica preferences: '.$e->getMessage());respond(503,['error'=>'No se pudieron procesar tus preferencias. Intenta más tarde.']);}
