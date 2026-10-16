<?php
// Technology & Development: Oaxsun Technologies
// Nautica Brevo API - private credentials are never returned to browsers.
declare(strict_types=1);
const NAUTICA_ADMIN_UID = '5vwUKOwvdfQsmnLRhoJCEs9Rqyg1';
function respond(int $status,array $data): never {http_response_code($status);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function config(): array { $file='/home/gyu5la0fbzjq/nautica-private/brevo-config.php';if(!is_readable($file)) throw new RuntimeException('No se puede leer la configuración privada.');$c=require $file;if(!is_array($c)||empty($c['api_key'])||empty($c['firebase']['web_api_key'])||empty($c['firebase']['auth_email'])||empty($c['firebase']['auth_password']))throw new RuntimeException('Configuración privada incompleta.');return $c; }
function request(string $url,string $method='GET',array $headers=[],?string $body=null): array { $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_TIMEOUT=>25,CURLOPT_FOLLOWLOCATION=>false]);if($body!==null)curl_setopt($ch,CURLOPT_POSTFIELDS,$body);$raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);if($raw===false)throw new RuntimeException('No se pudo conectar al servicio.');return [$code,json_decode($raw,true)?:[]]; }
function b64url(string $s): string {return rtrim(strtr(base64_encode($s),'+/','-_'),'=');}
function unb64url(string $s): string|false {return base64_decode(strtr($s,'-_','+/'),true);}
function admin_token(): void {
  $origin=$_SERVER['HTTP_ORIGIN']??'';
  if($origin!=='' && !in_array($origin,['https://panel.nauticahome.com.mx'],true))respond(403,['error'=>'Origen no autorizado.']);
  $auth=$_SERVER['HTTP_AUTHORIZATION']??$_SERVER['REDIRECT_HTTP_AUTHORIZATION']??'';
  if(!preg_match('/^Bearer ([A-Za-z0-9._-]+)$/',$auth,$m))respond(401,['error'=>'Inicia sesión en Nautica Panel.']);
  $parts=explode('.',$m[1]);if(count($parts)!==3)respond(401,['error'=>'Token inválido.']);
  $header=json_decode(unb64url($parts[0])?:'',true);$payload=json_decode(unb64url($parts[1])?:'',true);
  if(!is_array($header)||!is_array($payload)||($header['alg']??'')!=='RS256'||!is_string($header['kid']??null))respond(401,['error'=>'Token inválido.']);
  $now=time();$project='nautica-ca65d';
  if(($payload['aud']??'')!==$project||($payload['iss']??'')!=='https://securetoken.google.com/'.$project||($payload['sub']??'')!==NAUTICA_ADMIN_UID||($payload['user_id']??'')!==NAUTICA_ADMIN_UID||($payload['exp']??0)<=$now||($payload['iat']??0)>$now+60||($payload['auth_time']??0)>$now+60)respond(403,['error'=>'Administrador no autorizado.']);
  [$code,$certs]=request('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if($code!==200||!isset($certs[$header['kid']]))throw new RuntimeException('No se pudieron validar los certificados de Firebase.');
  $signature=unb64url($parts[2]);if($signature===false||openssl_verify($parts[0].'.'.$parts[1],$signature,$certs[$header['kid']],OPENSSL_ALGO_SHA256)!==1)respond(401,['error'=>'Firma Firebase inválida.']);
}
function technical_token(array $cfg): string {
  $f=$cfg['firebase'];$url='https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='.rawurlencode($f['web_api_key']);
  [$code,$data]=request($url,'POST',['Content-Type: application/json'],json_encode(['email'=>$f['auth_email'],'password'=>$f['auth_password'],'returnSecureToken'=>true]));
  if($code!==200||empty($data['idToken'])||strtolower((string)($data['email']??''))!=='backend@nauticahome.com.mx')throw new RuntimeException('No se pudo autenticar el usuario técnico.');
  return $data['idToken'];
}
function fs_url(string $id): string {return 'https://firestore.googleapis.com/v1/projects/nautica-ca65d/databases/(default)/documents/productWaitlist/'.rawurlencode($id);}
function fs_get(string $id,string $token): array {
  [$code,$data]=request(fs_url($id),'GET',['Authorization: Bearer '.$token]);
  if($code!==200)throw new RuntimeException('No se encontró la solicitud o Firestore rechazó el acceso.');return $data;
}
function field(array $doc,string $key): string {return (string)($doc['fields'][$key]['stringValue']??'');}
function fs_patch(string $id,string $token,array $fields,array $mask,?string $updateTime=null): void {
  $url=fs_url($id).'?'.implode('&',array_map(fn($f)=>'updateMask.fieldPaths='.rawurlencode($f),$mask));
  if($updateTime!==null)$url.='&currentDocument.updateTime='.rawurlencode($updateTime);
  [$code,$body]=request($url,'PATCH',['Authorization: Bearer '.$token,'Content-Type: application/json'],json_encode(['fields'=>$fields]));
  if($code<200||$code>=300)throw new RuntimeException('Firestore rechazó la actualización de estado.');
}
function signed_link(string $id,string $sku,array $cfg): string {
  $expiry=(string)(time()+60*60*24*90);$payload=b64url(json_encode(['id'=>$id,'sku'=>$sku,'exp'=>$expiry]));
  $sig=b64url(hash_hmac('sha256',$payload,$cfg['api_key'],true));
  return 'https://nauticahome.com.mx/api/brevo/track-product.php?t='.rawurlencode($payload.'.'.$sig);
}
function send_email(array $cfg,string $to,string $name,string $url): string {
  $safeName=htmlspecialchars($name,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');$safeUrl=htmlspecialchars($url,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
  $html='<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#142b4a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="100%" style="max-width:560px;background:#fff" cellpadding="0" cellspacing="0"><tr><td style="padding:36px 32px"><p style="letter-spacing:3px;font-size:16px;font-weight:bold">NAUTICA HOME</p><h1 style="font-size:26px;font-weight:normal;line-height:1.3">Tu producto te espera</h1><p style="line-height:1.8;font-size:15px">El producto <strong>'.$safeName.'</strong> ya puede consultarse en nuestra tienda.</p><p style="padding:22px 0"><a href="'.$safeUrl.'" style="background:#0d2c52;color:#fff;text-decoration:none;padding:16px 28px;display:inline-block;letter-spacing:1px;font-size:13px">VER PRODUCTO</a></p><p style="font-size:12px;color:#69798b;line-height:1.6">Recibes este mensaje porque te registraste en la lista de espera de Nautica Home México.</p></td></tr></table></td></tr></table></body></html>';
  $payload=['sender'=>['email'=>$cfg['sender_email']??'no-reply@nauticahome.com.mx','name'=>$cfg['sender_name']??'Nautica Home México'],'to'=>[['email'=>$to]],'subject'=>'Nautica Home | Tu producto está disponible','htmlContent'=>$html,'textContent'=>'Tu producto '.$name.' está disponible. Ver producto: '.$url];
  [$code,$result]=request('https://api.brevo.com/v3/smtp/email','POST',['api-key: '.$cfg['api_key'],'Content-Type: application/json','Accept: application/json'],json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
  if($code!==201||empty($result['messageId']))throw new RuntimeException('Brevo no confirmó el envío (HTTP '.$code.').');
  return (string)$result['messageId'];
}
