<?php
// Technology & Development: Oaxsun Technologies
declare(strict_types=1);
require __DIR__.'/bootstrap.php';
$origin=$_SERVER['HTTP_ORIGIN']??'';
if($origin==='https://panel.nauticahome.com.mx'){
 header('Access-Control-Allow-Origin: https://panel.nauticahome.com.mx');
 header('Access-Control-Allow-Methods: POST, OPTIONS');
 header('Access-Control-Allow-Headers: Authorization, Content-Type');
 header('Vary: Origin');
}
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS'){
 if($origin!=='https://panel.nauticahome.com.mx')respond(403,['error'=>'Origen no autorizado.']);
 http_response_code(204);exit;
}
if(($_SERVER['REQUEST_METHOD']??'')!=='POST')respond(405,['error'=>'Método no permitido.']);
try {
  admin_token();
  $data=json_decode(file_get_contents('php://input')?:'',true);
  $id=$data['id']??null;
  if(!is_string($id)||!preg_match('/^[A-Za-z0-9_-]{1,150}$/',$id))respond(400,['error'=>'Solicitud inválida.']);
  $cfg=config();$token=technical_token($cfg);$doc=fs_get($id,$token);
  $email=field($doc,'email');$sku=field($doc,'sku');$name=field($doc,'productName');$status=field($doc,'status');
  if(!filter_var($email,FILTER_VALIDATE_EMAIL)||$sku===''||$name==='')respond(422,['error'=>'Registro incompleto.']);
  wl_assert_subscribed($doc,$token);
  if(!in_array($status,['pending','sent','visited'],true))respond(409,['error'=>'Estado no válido.']);
  // No automatic retries after a Brevo success: duplicate emails are worse than a manual reconciliation.
  $url=signed_link($id,$sku,$cfg);
  $preferencesUrl=wl_preferences_link($id,$email,$cfg);
  $imageUrl=wl_product_image($sku,$token);
  // Recheck after the optional image lookup, immediately before contacting Brevo.
  wl_assert_subscribed(fs_get($id,$token),$token);
  $messageId=send_email($cfg,$email,$name,$url,$preferencesUrl,$sku,$imageUrl);
  $count=(int)($doc['fields']['sendCount']['integerValue']??0)+1;
  $now=gmdate('Y-m-d\TH:i:s\Z');
  $fields=['status'=>['stringValue'=>'sent'],'lastSentAt'=>['timestampValue'=>$now],'sendCount'=>['integerValue'=>(string)$count],'brevoMessageId'=>['stringValue'=>$messageId]];
  $mask=['status','lastSentAt','sendCount','brevoMessageId'];
  if(empty($doc['fields']['sentAt'])){$fields['sentAt']=['timestampValue'=>$now];$mask[]='sentAt';}
  try{fs_patch($id,$token,$fields,$mask,$doc['updateTime']??null);}catch(Throwable $e){error_log('Nautica Brevo accepted '.$messageId.' but Firestore update failed: '.$e->getMessage());respond(502,['error'=>'Brevo aceptó el correo, pero no se pudo actualizar Firestore. No vuelvas a enviar sin revisar el registro.']);}
  respond(200,['ok'=>true,'status'=>'sent','message'=>'Brevo aceptó el envío.']);
}catch(DomainException $e){respond(409,['error'=>$e->getMessage(),'status'=>'unsubscribed']);}
catch(Throwable $e){error_log('Nautica waitlist send: '.$e->getMessage());respond(500,['error'=>'No se pudo completar el envío. Revisa los registros del servidor.']);}
