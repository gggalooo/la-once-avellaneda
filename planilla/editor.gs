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
