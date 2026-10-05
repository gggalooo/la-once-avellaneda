// Instalación: pegar este archivo completo en Apps Script de la planilla privada.
/**
 * La ONCE Avellaneda — recibe pedidos, pagos y avisos de stock y los anota en esta planilla.
 *
 * Cómo instalarlo:
 * 1. En la planilla: Extensiones → Apps Script.
 * 2. Borrá todo lo que haya y pegá este código.
 * 3. Cambiá la CLAVE de abajo por una clave larga inventada por ustedes (la misma que van a
 *    cargar en Netlify como SHEET_SECRET). Guardá (ícono de disquete).
 * 4. Implementar → Nueva implementación → tipo "Aplicación web".
 *    Ejecutar como: Yo. Quién tiene acceso: Cualquier persona.
 * 5. Implementar, autorizá con tu cuenta y copiá la URL que termina en /exec.
 *
 * Si más adelante cambiás este código: Implementar → Administrar implementaciones →
 * editar (lápiz) → Versión: "Nueva versión" → Implementar. La URL sigue siendo la misma.
 */

var CLAVE = 'CAMBIAR-POR-UNA-CLAVE-LARGA';

var HOJA_PEDIDOS = 'Pedidos';
var HOJA_AVISOS = 'Avisos de stock';
var HOJA_PRODUCTOS = 'Productos';
var TALLES = ['S', 'M', 'L', 'XL', 'XXL'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var ss = tienda_();

    // Acciones públicas (las manda la página): pedidos por WhatsApp y avisos de stock.
    if (d.tipo === 'pedido') {
      // Los números de pedido online (LOaammdd-XXXXXX) solo los puede anotar el servidor de la tienda.
      if (/^LO\d{6}-[0-9A-F]{6}$/.test(String(d.codigo || ''))) return respuesta_({ ok: false, error: 'codigo reservado' });
      agregarPedido_(ss, d, 'Nuevo');
      return respuesta_({ ok: true });
    }
    if (d.tipo === 'aviso_stock') {
      ss.getSheetByName(HOJA_AVISOS).appendRow([new Date(), txt_(d.email, 120), txt_(d.producto, 200), txt_(d.id, 80)]);
      return respuesta_({ ok: true });
    }

    // Acciones protegidas (solo el servidor de la tienda, con la clave): pagos online.
    if (CLAVE === 'CAMBIAR-POR-UNA-CLAVE-LARGA' || d.clave !== CLAVE) return respuesta_({ ok: false, error: 'clave' });

    if (d.tipo === 'pedido_online') {
      if (!buscarFila_(ss.getSheetByName(HOJA_PEDIDOS), d.codigo)) agregarPedido_(ss, d, d.estado || 'Esperando pago');
      return respuesta_({ ok: true });
    }
    if (d.tipo === 'estado') {
      var hp = ss.getSheetByName(HOJA_PEDIDOS), fila = buscarFila_(hp, d.codigo);
      if (fila && hp.getRange(fila, 10).getValue() !== 'Pagado') hp.getRange(fila, 10).setValue(txt_(d.estado, 60));
      return respuesta_({ ok: true });
    }
    if (d.tipo === 'pago') return respuesta_(registrarPago_(ss, d));

    return respuesta_({ ok: false, error: 'tipo desconocido' });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Marca el pedido como pagado y descuenta el stock. Si ya estaba pagado no hace nada (no descuenta dos veces).
function registrarPago_(ss, d) {
  var hp = ss.getSheetByName(HOJA_PEDIDOS);
  var fila = buscarFila_(hp, d.codigo);
  if (fila && hp.getRange(fila, 10).getValue() === 'Pagado') return { ok: true, repetido: true };

  var sinStock = [];
  var prod = ss.getSheetByName(HOJA_PRODUCTOS);
  var datos = prod.getDataRange().getValues();
  var cab = datos[0].map(function (h) { return String(h).trim(); });
  var colId = cab.indexOf('id');
  (d.items || []).forEach(function (it) {
    var col = cab.indexOf(String(it.talle));
    if (colId < 0 || col < 0 || TALLES.indexOf(String(it.talle)) < 0) return;
    for (var r = 1; r < datos.length; r++) {
      if (String(datos[r][colId]).trim() === String(it.id)) {
        var actual = Number(datos[r][col]) || 0, cant = Math.max(0, Math.floor(Number(it.cant) || 0));
        if (actual < cant) sinStock.push(it.id + ' ' + it.talle);
        prod.getRange(r + 1, col + 1).setValue(Math.max(0, actual - cant));
        datos[r][col] = Math.max(0, actual - cant);
        break;
      }
    }
  });

  if (!fila && d.nombre) { agregarPedido_(ss, d, 'Pagado'); fila = buscarFila_(hp, d.codigo); }
  if (fila) {
    hp.getRange(fila, 10).setValue('Pagado');
    var nota = 'Pago MP ' + txt_(d.pago_id, 40) + (d.nota ? ' · ' + txt_(d.nota, 300) : '') + (sinStock.length ? ' · REVISAR STOCK: ' + sinStock.join(', ') : '');
    hp.getRange(fila, 11).setValue(nota);
  }
  return { ok: true, sinStock: sinStock.length ? sinStock : null };
}

function agregarPedido_(ss, d, estado) {
  ss.getSheetByName(HOJA_PEDIDOS).appendRow([
    new Date(),
    txt_(d.codigo, 30),
    txt_(d.nombre, 80),
    "'" + txt_(d.telefono, 30),
    txt_(d.email, 120),
    txt_(d.entrega, 200),
    txt_(d.pago, 60),
    Number(d.total) || 0,
    txt_(d.detalle, 4000),
    txt_(estado, 60)
  ]);
}

function buscarFila_(hoja, codigo) {
  if (!codigo) return 0;
  var col = hoja.getRange(1, 2, Math.max(1, hoja.getLastRow()), 1).getValues();
  for (var i = col.length - 1; i >= 1; i--) if (String(col[i][0]) === String(codigo)) return i + 1;
  return 0;
}

// Para probar que la URL funciona: abrila en el navegador y tiene que decir {"ok":true}.
function doGet(e) {
  if(e&&e.parameter&&e.parameter.action==='catalogo'){
    var payload={ok:true,productos:catalogoPublico_()};
    var cb=String(e.parameter.callback||'');
    if(cb){if(!/^onceCatalog_[a-zA-Z0-9_]{1,70}$/.test(cb))return respuesta_({ok:false,error:'callback no válido'});
      return ContentService.createTextOutput(cb+'('+JSON.stringify(payload).replace(/</g,'\\u003c')+');').setMimeType(ContentService.MimeType.JAVASCRIPT);}
    return respuesta_(payload);
  }
  return respuesta_({ok:true,tienda:'La ONCE Avellaneda'});
}

// Texto seguro: corta el largo y evita que algo empiece con "=" y se tome como fórmula.
function txt_(v, max) {
  var s = String(v == null ? '' : v).slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function respuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Editor privado: se abre dentro de Google Sheets, nunca desde el endpoint público.
var COLUMNAS_PUBLICAS = ['id','modalidad','club','titulo','categoria','epoca','precio','precio_anterior','S','M','L','XL','XXL','foto','foto2','foto3','foto4','foto5','foto6','destacado','nuevo','activo'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('La ONCE').addItem('Cargar camisetas', 'mostrarPanel').addItem('Administrar socios', 'administrarSocios').addSeparator().addItem('Configurar por primera vez', 'configurarTienda').addToUi();
}
function tienda_() {
  var id=PropertiesService.getScriptProperties().getProperty('TIENDA_ID');
  var ss=id?SpreadsheetApp.openById(id):SpreadsheetApp.getActiveSpreadsheet();
  if(!ss)throw new Error('Ejecutá configurarTienda desde la planilla.');
  return ss;
}
function identidad_() {
  var email=String(Session.getActiveUser().getEmail()||'').toLowerCase();
  if(!email)throw new Error('Abrí el editor desde la planilla e iniciá sesión con tu cuenta de Google.');
  return email;
}
function propietario_() {return tienda_().getOwner().getEmail().toLowerCase()}
function autorizar_() {
  var email=identidad_(),owner=propietario_();
  var allowed=JSON.parse(PropertiesService.getScriptProperties().getProperty('SOCIOS')||'[]');
  if(email!==owner&&allowed.indexOf(email)<0)throw new Error('Esta cuenta no tiene acceso al editor de La ONCE.');
  return {email:email,owner:email===owner};
}
function configurarTienda() {
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss||identidad_()!==ss.getOwner().getEmail().toLowerCase())throw new Error('Solo el propietario puede configurar la tienda.');
  var props=PropertiesService.getScriptProperties();props.setProperty('TIENDA_ID',ss.getId());
  if(!props.getProperty('SOCIOS'))props.setProperty('SOCIOS',JSON.stringify([identidad_()]));
  if(!props.getProperty('FOTOS_ID'))props.setProperty('FOTOS_ID',DriveApp.createFolder('La ONCE · Fotos de camisetas').getId());
  var sh=ss.getSheetByName(HOJA_PRODUCTOS);if(!sh)throw new Error('Falta la pestaña Productos.');
  var cab=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  ['foto2','foto3','foto4','foto5','foto6'].forEach(function(k){if(cab.indexOf(k)<0){cab.push(k);sh.getRange(1,cab.length).setValue(k)}});
  onOpen();SpreadsheetApp.getUi().alert('Listo. Abrí La ONCE → Cargar camisetas. La planilla debe mantenerse restringida.');
}
function mostrarPanel() {
  autorizar_();
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(PANEL_HTML).setWidth(1040).setHeight(730),'La ONCE · Cargar camisetas');
}
function administrarSocios() {
  if(!autorizar_().owner)throw new Error('Solo el propietario puede administrar socios.');
  var ui=SpreadsheetApp.getUi(),props=PropertiesService.getScriptProperties(),owner=propietario_();
  var answer=ui.prompt('Sumar socios','Escribí hasta dos correos separados por coma. Se autoriza el editor y se comparte esta planilla y su carpeta de fotos con esas cuentas. Los accesos anteriores no se eliminan automáticamente.',ui.ButtonSet.OK_CANCEL);
  if(answer.getSelectedButton()!==ui.Button.OK)return;
  var emails=[owner].concat(answer.getResponseText().toLowerCase().split(/[,;\s]+/).filter(Boolean)).filter(function(v,i,a){return a.indexOf(v)===i});
  if(emails.length>3||emails.some(function(e){return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}))throw new Error('Usá hasta tres cuentas válidas en total, incluido el propietario.');
  var existing=JSON.parse(props.getProperty('SOCIOS')||'[]');
  if(existing.some(function(e){return emails.indexOf(e)<0}))throw new Error('Para quitar un socio, primero revocá su acceso en Compartir y en la carpeta de fotos; después actualizá SOCIOS en Propiedades del script.');
  var folder=DriveApp.getFolderById(props.getProperty('FOTOS_ID'));
  emails.filter(function(e){return e!==owner}).forEach(function(e){tienda_().addEditor(e);folder.addEditor(e)});
  props.setProperty('SOCIOS',JSON.stringify(emails));ui.alert('Accesos actualizados. Cada socio abre esta planilla con su propia cuenta.');
}
function leerProductos_() {
  var sh=tienda_().getSheetByName(HOJA_PRODUCTOS),rows=sh.getDataRange().getValues(),cab=rows.shift().map(function(v){return String(v).trim()});
  return rows.map(function(row,index){var p={};COLUMNAS_PUBLICAS.forEach(function(k){var col=cab.indexOf(k);p[k]=col<0?'':row[col]});p._fila=index+2;p._revision=revision_(row);return p}).filter(function(p){return p.id});
}
function revision_(row) {return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(row)))}
function getEditorProducts() {
  var user=autorizar_();return {productos:leerProductos_(),email:user.email};
}
function catalogoPublico_() {
  return leerProductos_().filter(function(p){return !/^(no|false|0)$/i.test(String(p.activo))}).map(function(p){var out={};COLUMNAS_PUBLICAS.forEach(function(k){out[k]=p[k]});return out});
}
function validarProducto_(d) {
  var p={};
  ['club','titulo'].forEach(function(k){p[k]=String(d[k]||'').trim();if(!p[k]||p[k].length>140)throw new Error('Completá club y nombre del modelo (hasta 140 caracteres).')});
  [['modalidad',['stock','pedido']],['categoria',['Sudamérica','Europa','Selecciones']],['epoca',['Actual','Retro']]].forEach(function(x){if(x[1].indexOf(d[x[0]])<0)throw new Error('Revisá '+x[0]);p[x[0]]=d[x[0]]});
  ['precio','precio_anterior'].concat(TALLES).forEach(function(k){var n=Number(d[k]||0);if(!isFinite(n)||n<0||Math.floor(n)!==n||n>100000000||(k==='precio'&&n===0)||(TALLES.indexOf(k)>=0&&n>10000))throw new Error('Revisá el valor de '+k);p[k]=n});
  ['destacado','nuevo','activo'].forEach(function(k){p[k]=d[k]===true?'SI':'NO'});
  if(!Array.isArray(d.fotos)||d.fotos.length>6)throw new Error('Podés subir hasta seis fotos.');
  var total=0;
  p._fotos=d.fotos.map(function(f){
    if(typeof f==='string'){if(!/^https:\/\/[^\s]{1,2000}$/.test(f))throw new Error('Foto no válida.');return f}
    if(!f||typeof f.data!=='string')throw new Error('Foto no válida.');
    var m=/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(f.data);
    if(!m||m[2].length>4*1024*1024)throw new Error('Una foto es demasiado grande o tiene un formato no admitido.');
    var bytes=Utilities.base64Decode(m[2]),u=bytes.map(function(b){return (b+256)%256});total+=bytes.length;
    var jpeg=u[0]===255&&u[1]===216&&u[2]===255,png=u[0]===137&&u[1]===80&&u[2]===78&&u[3]===71,webp=u[0]===82&&u[1]===73&&u[2]===70&&u[3]===70&&u[8]===87&&u[9]===69&&u[10]===66&&u[11]===80;
    if(!(m[1]==='image/jpeg'&&jpeg||m[1]==='image/png'&&png||m[1]==='image/webp'&&webp))throw new Error('El archivo no es una foto válida.');
    return {bytes:bytes,mime:m[1]};
  });
  if(total>10*1024*1024)throw new Error('Las fotos juntas deben pesar menos de 10 MB.');return p;
}
function saveEditorProduct(d) {
  autorizar_();var p=validarProducto_(d),lock=LockService.getScriptLock(),created=[];lock.waitLock(20000);
  try{
    var sh=tienda_().getSheetByName(HOJA_PRODUCTOS),all=sh.getDataRange().getValues(),cab=all[0].map(String),idCol=cab.indexOf('id'),row=0;
    if(d.id){for(var n=1;n<all.length;n++)if(String(all[n][idCol])===String(d.id)){row=n+1;break}
      if(!row||revision_(all[row-1])!==d._revision)throw new Error('Esta camiseta cambió mientras la editabas. Volvé a abrirla antes de guardar.');
    }
    p.id=d.id||'lo-'+Utilities.getUuid().slice(0,12);
    var folderId=PropertiesService.getScriptProperties().getProperty('FOTOS_ID');if(!folderId)throw new Error('Falta ejecutar configurarTienda.');
    var folder=DriveApp.getFolderById(folderId);
    var photos=p._fotos.map(function(f,i){if(typeof f==='string')return f;
      var ext=f.mime.split('/')[1],file=folder.createFile(Utilities.newBlob(f.bytes,f.mime,p.id+'-'+Utilities.getUuid().slice(0,8)+'.'+ext));created.push(file);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
      return 'https://lh3.googleusercontent.com/d/'+file.getId();
    });
    ['foto','foto2','foto3','foto4','foto5','foto6'].forEach(function(k,i){p[k]=photos[i]||''});
    if(!row)row=sh.getLastRow()+1;
    var values=all[row-1]?all[row-1].slice():cab.map(function(){return ''});
    if(all[row-1])sh.getRange(row,1,1,cab.length).getFormulas()[0].forEach(function(f,i){if(f)values[i]=f});
    COLUMNAS_PUBLICAS.forEach(function(k){var col=cab.indexOf(k);if(col>=0)values[col]=typeof p[k]==='string'?txt_(p[k],2000):p[k]});
    var totalCol=cab.indexOf('total_stock');if(totalCol>=0)values[totalCol]=p.modalidad==='pedido'?0:'=SUM('+TALLES.map(function(k){var n=cab.indexOf(k)+1,s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s+row}).join(',')+')';
    sh.getRange(row,1,1,cab.length).setValues([values]);created=[];
    SpreadsheetApp.flush();return {id:p.id,productos:leerProductos_()};
  }catch(e){created.forEach(function(f){try{f.setTrashed(true)}catch(_){}});throw e}finally{lock.releaseLock()}
}

var PANEL_HTML = "<!doctype html>\n<html lang=\"es\"><head><base target=\"_top\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<style>\n*{box-sizing:border-box}body{margin:0;font:14px system-ui,sans-serif;background:#f4f6fa;color:#15213a}button,input,select{font:inherit}button{cursor:pointer}button:disabled{cursor:default;opacity:.5}header{background:#0b1c45;color:white;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}h1{margin:0;font-size:24px}header small{color:#b8c9e8}main{display:grid;grid-template-columns:240px 1fr;min-height:580px}aside{background:#fff;border-right:1px solid #dce1ea;padding:18px;overflow:auto;max-height:620px}aside input{width:100%;padding:10px;border:1px solid #ccd3df;border-radius:7px}.product{display:block;width:100%;text-align:left;border:0;border-radius:7px;background:none;padding:12px 7px;margin-top:5px;color:#15213a}.product:hover,.product[aria-current=true]{background:#eaf1ff}.product small{display:block;color:#52637d;margin-top:3px}form{padding:24px;max-width:800px}h2{font-size:20px;margin:0 0 18px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}label{display:grid;gap:6px;font-weight:600;font-size:12px}input,select{border:1px solid #cbd3e0;border-radius:7px;background:#fff;padding:10px;color:#15213a;min-width:0}fieldset{border:0;padding:0;margin:20px 0}legend{font-weight:700;margin-bottom:10px}.sizes{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.hint{font-size:12px;color:#58677e;line-height:1.5}.photos{display:flex;gap:9px;flex-wrap:wrap}.photo{width:92px;border:1px solid #cbd3e0;background:white;border-radius:7px;overflow:hidden}.photo img{width:100%;height:90px;object-fit:contain}.photo>div{display:flex;justify-content:space-between}.photo button{font-size:10px;padding:6px 3px;border:0;background:#edf2fa}.upload{display:grid;place-items:center;border:1px dashed #496fa8;border-radius:8px;padding:15px;color:#245797;min-height:120px;cursor:pointer}.checks{display:flex;gap:18px;margin:20px 0}.checks label{display:flex;align-items:center}.primary{background:#154bb2;color:white;border:0;border-radius:8px;padding:11px 18px;font-weight:700}.secondary{border:1px solid #d3dbea;color:#203655;background:white;border-radius:8px;padding:10px 15px}.actions{display:flex;gap:10px;align-items:center}#status{margin:14px 0;line-height:1.5;font-size:13px}#status.error{color:#a12c32}#status.ok{color:#187043}#status:empty{display:none}.top-actions{display:flex;gap:10px}#welcome{padding:50px 24px;color:#536780}#form[hidden],#welcome[hidden]{display:none}@media(max-width:700px){main{grid-template-columns:1fr}aside{max-height:180px;border-bottom:1px solid #ddd}.fields{grid-template-columns:1fr}.checks{flex-wrap:wrap}header{padding:16px}.top-actions small{display:none}}\n</style></head><body>\n<header><div><h1>La ONCE <span style=\"font-weight:400\">Avellaneda</span></h1><small id=\"account\">Editor de camisetas</small></div><button class=\"secondary\" id=\"new\" disabled>＋ Nueva camiseta</button></header>\n<main><aside><input id=\"search\" type=\"search\" placeholder=\"Buscar camiseta\" aria-label=\"Buscar camiseta\"><div id=\"list\">Cargando catálogo…</div></aside><section><div id=\"welcome\">Elegí una camiseta para editarla o creá una nueva.</div>\n<form id=\"form\" hidden><h2 id=\"title\">Nueva camiseta</h2><div class=\"fields\"><label>Club o selección<input name=\"club\" required maxlength=\"100\" placeholder=\"Ej. Boca Juniors\"></label><label>Nombre del modelo<input name=\"titulo\" required maxlength=\"140\" placeholder=\"Ej. Titular 2026/27\"></label><label>Modalidad<select name=\"modalidad\"><option value=\"stock\">En stock</option><option value=\"pedido\">Por pedido</option></select></label><label>Categoría<select name=\"categoria\"><option>Sudamérica</option><option>Europa</option><option>Selecciones</option></select></label><label>Época<select name=\"epoca\"><option>Actual</option><option>Retro</option></select></label><label>Precio en pesos<input name=\"precio\" type=\"number\" min=\"1\" step=\"1\" required></label><label>Precio anterior (0 si no hay oferta)<input name=\"precio_anterior\" type=\"number\" min=\"0\" step=\"1\" value=\"0\"></label></div>\n<fieldset><legend>Talles</legend><p class=\"hint\" id=\"sizesHint\">Cantidad disponible de cada talle.</p><div class=\"sizes\" id=\"sizes\"></div></fieldset>\n<fieldset><legend>Fotos <small id=\"count\"></small></legend><div class=\"photos\" id=\"photos\"></div><p class=\"hint\">Hasta 6 fotos JPG, PNG o WebP. La primera será la portada. Las fotos guardadas serán públicas para mostrarse en la tienda.</p></fieldset>\n<div class=\"checks\"><label><input name=\"activo\" type=\"checkbox\" checked> Visible en la tienda</label><label><input name=\"destacado\" type=\"checkbox\"> Destacada</label><label><input name=\"nuevo\" type=\"checkbox\"> Nueva</label></div>\n<div class=\"actions\"><button class=\"primary\" type=\"submit\" id=\"save\">Guardar camiseta</button><button class=\"secondary\" type=\"button\" id=\"cancel\">Cancelar</button></div><p id=\"status\" role=\"status\" aria-live=\"polite\"></p></form></section></main>\n<script>\nconst $=s=>document.querySelector(s),form=$('#form'),sizes=['S','M','L','XL','XXL'];\nlet products=[],current=null,photos=[],dirty=false,busy=false,ready=false;\nfunction rpc(name,payload){return new Promise((resolve,reject)=>{if(!window.google||!google.script||!google.script.run){reject(Error('Abrí este formulario desde La ONCE → Cargar camisetas, dentro de tu planilla de Google.'));return}google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[name](payload)})}\nfunction message(text,error=false){$('#status').textContent=text;$('#status').className=error?'error':'ok'}\nfunction list(){const q=$('#search').value.toLowerCase();$('#list').replaceChildren();products.filter(p=>(p.club+' '+p.titulo).toLowerCase().includes(q)).forEach(p=>{const b=document.createElement('button');b.className='product';b.setAttribute('aria-current',String(current&&p.id===current.id));const title=document.createElement('b'),detail=document.createElement('small');title.textContent=p.club;detail.textContent=p.titulo;b.append(title,detail);b.onclick=()=>edit(p);$('#list').append(b)})}\nfunction isYes(v){return v!==false&&!/^(no|false|0)$/i.test(String(v))}\nfunction edit(p){if(busy)return;if(dirty&&!confirm('Tenés cambios sin guardar. ¿Querés descartarlos?'))return;current=p||null;form.reset();photos=[];for(const k of ['club','titulo','modalidad','categoria','epoca','precio','precio_anterior',...sizes])if(p&&p[k]!==undefined)form.elements[k].value=p[k];for(const k of ['activo','destacado','nuevo'])form.elements[k].checked=p?isYes(p[k])&&(k==='activo'||!!p[k]):k==='activo';photos=p?['foto','foto2','foto3','foto4','foto5','foto6'].map(k=>p[k]).filter(u=>/^https:\\/\\//.test(u)):[];$('#title').textContent=p?'Editar camiseta':'Nueva camiseta';$('#welcome').hidden=true;form.hidden=false;dirty=false;message('');drawPhotos();mode();list()}\nfunction drawPhotos(){$('#photos').replaceChildren();$('#count').textContent=photos.length+'/6';photos.forEach((p,i)=>{const box=document.createElement('div');box.className='photo';const img=document.createElement('img');img.src=typeof p==='string'?p:p.data;img.alt='Foto '+(i+1);const actions=document.createElement('div'),cover=document.createElement('button'),remove=document.createElement('button');cover.type=remove.type='button';cover.textContent=i?'Portada ↑':'Portada';cover.disabled=i===0||busy;cover.onclick=()=>{photos.unshift(photos.splice(i,1)[0]);dirty=true;drawPhotos()};remove.textContent='×';remove.setAttribute('aria-label','Quitar foto '+(i+1));remove.disabled=busy;remove.onclick=()=>{photos.splice(i,1);dirty=true;drawPhotos()};actions.append(cover,remove);box.append(img,actions);$('#photos').append(box)});if(photos.length<6){const label=document.createElement('label');label.className='upload';label.textContent='＋ Subir fotos';const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='image/jpeg,image/png,image/webp';input.hidden=true;input.disabled=busy;input.onchange=async()=>{const files=[...input.files];if(files.length+photos.length>6){message('Podés tener hasta seis fotos por camiseta.',true);return}setBusy(true);try{const added=await Promise.all(files.map(readPhoto));photos.push(...added);dirty=true;message('Fotos preparadas. Guardá la camiseta para publicarlas.')}catch(e){message(e.message,true)}finally{setBusy(false);drawPhotos()}};label.append(input);$('#photos').append(label)}}\nfunction readPhoto(file){return new Promise((resolve,reject)=>{if(!/^image\\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024){reject(Error('Usá JPG, PNG o WebP de hasta 12 MB por foto.'));return}const u=URL.createObjectURL(file),img=new Image();img.onload=()=>{try{const scale=Math.min(1,1400/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve({data:c.toDataURL('image/webp',.9)})}catch(e){reject(e)}finally{URL.revokeObjectURL(u)}};img.onerror=()=>{URL.revokeObjectURL(u);reject(Error('No pudimos abrir '+file.name))};img.src=u})}\nfunction mode(){$('#sizesHint').textContent=form.elements.modalidad.value==='pedido'?'Poné 1 si ese talle se puede encargar, o 0 si no.':'Cantidad disponible de cada talle.'}\nfunction setBusy(value){busy=value;$('#new').disabled=value||!ready;form.querySelectorAll('input,select,button').forEach(el=>el.disabled=value);$('#save').textContent=value?'Guardando…':'Guardar camiseta'}\nsizes.forEach(s=>{const label=document.createElement('label');label.textContent=s;const input=document.createElement('input');input.type='number';input.name=s;input.min='0';input.max='10000';input.step='1';input.value='0';label.append(input);$('#sizes').append(label)});\nform.oninput=()=>{dirty=true};form.elements.modalidad.onchange=mode;$('#search').oninput=list;$('#new').onclick=()=>edit(null);$('#cancel').onclick=()=>{if(dirty&&!confirm('¿Descartar los cambios sin guardar?'))return;form.hidden=true;$('#welcome').hidden=false;current=null;dirty=false;list()};\nform.onsubmit=async e=>{e.preventDefault();if(busy)return;const p=Object.fromEntries(new FormData(form));for(const k of ['activo','destacado','nuevo'])p[k]=form.elements[k].checked;p.fotos=photos;p.id=current?.id||'';p._revision=current?._revision||'';setBusy(true);message('Guardando fotos y catálogo…');try{const result=await rpc('saveEditorProduct',p);products=result.productos;dirty=false;setBusy(false);edit(products.find(x=>x.id===result.id));message('Camiseta guardada. La tienda conectada la verá al recargar.')}catch(e){message(e.message||'No se pudo guardar.',true)}finally{setBusy(false)}};\nwindow.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});\nrpc('getEditorProducts').then(d=>{products=d.productos;ready=true;$('#account').textContent=d.email;$('#new').disabled=false;list()}).catch(e=>{$('#list').textContent='Acceso pendiente';$('#welcome').textContent=e.message});\n</script></body></html>\n";
