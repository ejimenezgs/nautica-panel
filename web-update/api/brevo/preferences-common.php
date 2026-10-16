<?php
declare(strict_types=1);

const WL_DOCUMENTS = 'https://firestore.googleapis.com/v1/projects/nautica-ca65d/databases/(default)/documents';
const WL_SITE = 'https://www.nauticahome.com.mx';

function wl_email(string $email): string { return strtolower(trim($email)); }
function wl_sku(string $sku): string { return strtoupper(trim($sku)); }
function wl_pref_id(string $email): string { return hash('sha256', wl_email($email)); }
function wl_preference_key(array $cfg): string { return hash_hmac('sha256', 'nautica-waitlist-preferences-v1', $cfg['api_key'], true); }
function wl_preferences_token(string $id, string $email, array $cfg): string {
    $payload = b64url(json_encode(['purpose'=>'waitlist-preferences', 'id'=>$id, 'emailHash'=>wl_pref_id($email), 'exp'=>time()+365*86400]));
    return $payload.'.'.b64url(hash_hmac('sha256', $payload, wl_preference_key($cfg), true));
}
function wl_preferences_claims(string $token, array $cfg): array {
    if (strlen($token)>1400) throw new InvalidArgumentException('El enlace no es válido.');
    $parts=explode('.', $token);
    if (count($parts)!==2 || !hash_equals(b64url(hash_hmac('sha256', $parts[0], wl_preference_key($cfg), true)), $parts[1])) throw new InvalidArgumentException('El enlace no es válido.');
    $data=json_decode(unb64url($parts[0])?:'', true);
    if (!is_array($data) || ($data['purpose']??'')!=='waitlist-preferences' || !is_string($data['emailHash']??null) || !preg_match('/^[a-f0-9]{64}$/',$data['emailHash']) || !is_int($data['exp']??null) || $data['exp']<time() || !is_string($data['id']??null) || !preg_match('/^[A-Za-z0-9_-]{1,150}$/', $data['id'])) throw new InvalidArgumentException('El enlace no es válido o ha vencido.');
    return $data;
}
function wl_preferences_id(string $token, array $cfg): string { return wl_preferences_claims($token,$cfg)['id']; }
function wl_preferences_link(string $id, string $email, array $cfg): string { return WL_SITE.'/avisos.html#t='.rawurlencode(wl_preferences_token($id, $email, $cfg)); }
function wl_decode_pref(array $doc): array {
    $f=$doc['fields']??[];
    return ['all'=>($f['all']['booleanValue']??false)===true, 'skus'=>array_values(array_filter(array_map(fn($v)=>wl_sku((string)($v['stringValue']??'')), $f['skus']['arrayValue']['values']??[])))];
}
function wl_pref_get(string $email, string $token): array {
    [$code,$doc]=request(WL_DOCUMENTS.'/waitlistEmailPreferences/'.wl_pref_id($email), 'GET', ['Authorization: Bearer '.$token]);
    if ($code===404) return ['all'=>false, 'skus'=>[], 'updateTime'=>null];
    if ($code!==200 || !isset($doc['updateTime'])) throw new RuntimeException('No se pudieron verificar las preferencias de correo.');
    return wl_decode_pref($doc)+['updateTime'=>$doc['updateTime']];
}
function wl_is_unsubscribed(array $pref, string $sku): bool { return $pref['all'] || in_array(wl_sku($sku), $pref['skus'], true); }
function wl_assert_subscribed(array $doc, string $token): void {
    if (field($doc,'status')==='unsubscribed' || wl_is_unsubscribed(wl_pref_get(field($doc,'email'),$token),field($doc,'sku'))) throw new DomainException('Baja de usuario: no se puede enviar ni reenviar este aviso.');
}
function wl_documents_for_email(string $email, string $token): array {
    $all=[];$cursor=null;
    do {
        $q=['from'=>[['collectionId'=>'productWaitlist']], 'where'=>['fieldFilter'=>['field'=>['fieldPath'=>'email'], 'op'=>'EQUAL', 'value'=>['stringValue'=>$email]]], 'orderBy'=>[['field'=>['fieldPath'=>'__name__'], 'direction'=>'ASCENDING']], 'limit'=>200];
        if ($cursor!==null) $q['startAt']=['values'=>[['referenceValue'=>$cursor]], 'before'=>false];
        [$code,$rows]=request(WL_DOCUMENTS.':runQuery','POST',['Authorization: Bearer '.$token,'Content-Type: application/json'],json_encode(['structuredQuery'=>$q]));
        if ($code!==200) throw new RuntimeException('No se pudieron cargar tus avisos.');
        $page=[];
        foreach ($rows as $row) if (isset($row['document'])) {
            $doc=$row['document'];
            if (field($doc,'email')!==$email || !str_starts_with($doc['name']??'', 'projects/nautica-ca65d/databases/(default)/documents/productWaitlist/')) throw new RuntimeException('Respuesta de avisos no válida.');
            $page[]=$doc;
        }
        $all=array_merge($all,$page);
        if (count($all)>5000) throw new RuntimeException('Contacta a Nautica Home para administrar esta lista.');
        $next=$page ? end($page)['name'] : null;
        if (count($page)===200 && $next===$cursor) throw new RuntimeException('No se pudo completar la consulta de avisos.');
        $cursor=$next;
    } while(count($page)===200);
    return $all;
}
function wl_preference_products(array $docs, array $pref): array {
    $products=[];
    foreach($docs as $doc) {
        $sku=wl_sku(field($doc,'sku'));if($sku==='')continue;
        $off=field($doc,'status')==='unsubscribed'||wl_is_unsubscribed($pref,$sku);
        if(isset($products[$sku])) $off=$off||$products[$sku]['unsubscribed'];
        $products[$sku]=['sku'=>$sku,'name'=>field($doc,'productName')?:$sku,'unsubscribed'=>$off];
    }
    return array_values($products);
}
function wl_save_preferences(string $email, array $skus, bool $all, string $token): array {
    // Compare-and-swap prevents concurrent confirmations from losing a previous opt-out.
    for($attempt=0;$attempt<3;$attempt++) {
        $pref=wl_pref_get($email,$token);
        $merged=array_values(array_unique(array_merge($pref['skus'],array_map('wl_sku',$skus))));
        if(count($merged)>5000) throw new InvalidArgumentException('Demasiados productos seleccionados.');
        $pref['all']=$pref['all']||$all;$pref['skus']=$merged;
        $fields=['email'=>['stringValue'=>wl_email($email)],'all'=>['booleanValue'=>$pref['all']],'skus'=>['arrayValue'=>['values'=>array_map(fn($s)=>['stringValue'=>$s],$merged)]],'updatedAt'=>['timestampValue'=>gmdate('Y-m-d\TH:i:s\Z')]];
        $write=['update'=>['name'=>'projects/nautica-ca65d/databases/(default)/documents/waitlistEmailPreferences/'.wl_pref_id($email),'fields'=>$fields], 'currentDocument'=>$pref['updateTime']?['updateTime'=>$pref['updateTime']]:['exists'=>false]];
        [$code]=request(WL_DOCUMENTS.':commit','POST',['Authorization: Bearer '.$token,'Content-Type: application/json'],json_encode(['writes'=>[$write]]));
        if($code===200) return $pref;
        if(!in_array($code,[409,412],true)) throw new RuntimeException('No se pudo guardar la baja. Intenta más tarde.');
    }
    throw new RuntimeException('Otra actualización está en curso. Vuelve a confirmar.');
}
function wl_mark_unsubscribed(array $docs, array $pref, string $token): bool {
    $writes=[];
    foreach($docs as $doc) {
        if(!wl_is_unsubscribed($pref,field($doc,'sku')) || field($doc,'status')==='unsubscribed')continue;
        $writes[]=['update'=>['name'=>$doc['name'],'fields'=>['status'=>['stringValue'=>'unsubscribed'],'unsubscribedAt'=>['timestampValue'=>gmdate('Y-m-d\TH:i:s\Z')]]], 'updateMask'=>['fieldPaths'=>['status','unsubscribedAt']], 'currentDocument'=>['updateTime'=>$doc['updateTime']]];
    }
    // Preferences are already persisted: a failed status sync cannot re-enable delivery.
    foreach(array_chunk($writes,400) as $batch) {
        [$code]=request(WL_DOCUMENTS.':commit','POST',['Authorization: Bearer '.$token,'Content-Type: application/json'],json_encode(['writes'=>$batch]));
        if($code!==200)return false;
    }
    return true;
}
function wl_public_image(string $url): string {
    $url=trim($url);if($url==='')return '';
    if(str_starts_with($url,'/') && !str_starts_with($url,'//'))$url=WL_SITE.$url;
    elseif(!preg_match('~^[a-z][a-z0-9+.-]*:~i',$url) && !str_starts_with($url,'//'))$url=WL_SITE.'/'.ltrim($url,'/');
    $parts=parse_url($url);
    return is_array($parts)&&($parts['scheme']??'')==='https'&&!empty($parts['host'])&&!isset($parts['user'])&&!isset($parts['pass']) ? $url : '';
}
function wl_first(array $row, array $keys): mixed { foreach($keys as $key)if(isset($row[$key])&&$row[$key]!=='')return $row[$key];return ''; }
function wl_image_value(mixed $v): string { return is_string($v)?wl_public_image($v):(is_array($v)?wl_image_value(wl_first($v,['url','src','href','imageUrl','imagenUrl','image','imagen','foto','photo','urlImagen','image_url'])):''); }
function wl_product_rows(array $payload): array {
    if(array_is_list($payload))return $payload;
    foreach(['products','productos','items','catalogo','data','results'] as $key)if(isset($payload[$key])&&is_array($payload[$key])) { $rows=wl_product_rows($payload[$key]);if($rows)return $rows; }
    return array_values(array_filter($payload,'is_array'));
}
function wl_product_image(string $sku, string $token): string {
    try {
        // Firestore uses encodeURIComponent(SKU) as the document ID on the web.
        [$code,$override]=request(WL_DOCUMENTS.'/catalogProductOverrides/'.rawurlencode(rawurlencode($sku)), 'GET',['Authorization: Bearer '.$token]);
        if($code===200 && ($image=wl_public_image(field($override,'imageUrl')))!=='')return $image;
        // Older overrides may use a custom document ID and identify the SKU in code.
        $query=['structuredQuery'=>['from'=>[['collectionId'=>'catalogProductOverrides']], 'where'=>['fieldFilter'=>['field'=>['fieldPath'=>'code'],'op'=>'EQUAL','value'=>['stringValue'=>$sku]]], 'limit'=>1]];
        [$code,$rows]=request(WL_DOCUMENTS.':runQuery','POST',['Authorization: Bearer '.$token,'Content-Type: application/json'],json_encode($query));
        if($code===200)foreach($rows as $row)if(isset($row['document'])&&($image=wl_public_image(field($row['document'],'imageUrl')))!=='')return $image;
        [$code,$catalog]=request('https://segel-erp.vercel.app/api/catalogo');
        if($code!==200)return '';
        foreach(wl_product_rows($catalog) as $row) {
            if(!is_array($row)||wl_sku((string)wl_first($row,['codigo','código','code','sku','SKU','clave','idProducto','productId','codigoProducto','codigo_producto','productCode','itemCode','item_code']))!==wl_sku($sku))continue;
            $image=wl_image_value(wl_first($row,['imageUrl','imagenUrl','imagenURL','image','imagen','foto','photo','urlImagen','image_url']));
            if($image!=='')return $image;
            foreach(['images','imagenes','imageUrls','photos','fotos','gallery','galeria','media'] as $key)foreach((array)($row[$key]??[]) as $candidate)if(($image=wl_image_value($candidate))!=='')return $image;
        }
    }catch(Throwable $e){error_log('Nautica email image unavailable.');}
    return ''; // An image lookup is optional and cannot block the notification.
}
