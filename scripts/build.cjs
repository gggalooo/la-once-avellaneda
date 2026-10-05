const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n');
const mime={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
function embed(value){
 if(Array.isArray(value))return value.map(embed);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,embed(v)]));
 if(typeof value==='string'&&value.startsWith('assets/')){
  const resolved=path.resolve(root,value),base=path.join(root,'assets')+path.sep;
  if(!resolved.startsWith(base))throw Error('Ruta de imagen fuera de assets: '+value);
  const type=mime[path.extname(resolved).toLowerCase()];if(!type)throw Error('Formato no admitido: '+value);
  return 'data:'+type+';base64,'+fs.readFileSync(resolved).toString('base64');
 }
 return value;
}
const data=JSON.parse(read('src/catalogo.json'));
const ids=new Set();for(const p of data.productos){if(ids.has(p.id))throw Error('ID repetido: '+p.id);ids.add(p.id);if(!Number.isFinite(p.precio)||p.precio<0)throw Error('Precio inválido: '+p.id)}
const js=read('src/app.js').replace('/* @include galeria.js */',()=>read('src/galeria.js')).replace('/* @include pagos.js */',()=>read('src/pagos.js')).replace('/* @include ruleta.js */',()=>read('src/ruleta.js'));
if(js.includes('/* @include'))throw Error('Quedó un archivo sin incluir.');
const html=read('src/index.template.html').replace('{{STYLES}}',()=>read('src/styles.css')).replace('{{CATALOG}}',()=>JSON.stringify(embed(data)).replace(/</g,'\\u003c')).replace('{{APP}}',()=>js);
const output=path.join(root,'index.html');
// Catálogo para el servidor (Netlify Functions): sin fotos, solo lo que hace falta para precios y stock.
const fnCat={config:{descuentoTransferencia:data.config.descuentoTransferencia,precioPersonalizacion:data.config.precioPersonalizacion,planilla:data.config.planilla,planillaApp:data.config.planillaApp},productos:data.productos.map(p=>({id:p.id,club:p.club,titulo:p.titulo,precio:p.precio,modalidad:p.modalidad||'stock',stock:p.stock||{},tallesPedido:p.tallesPedido||[],activo:p.activo!==false}))};
const fnCatText='// Archivo generado por "npm run build" a partir de src/catalogo.json. No editar a mano.\nexport default '+JSON.stringify(fnCat,null,1)+';\n';
const fnCatPath=path.join(root,'netlify','functions','_lib','catalogo.mjs');
if(process.argv.includes('--check')){if(!fs.existsSync(output)||read('index.html')!==html)throw Error('index.html no está actualizado. Ejecutá npm run build.');if(!fs.existsSync(fnCatPath)||fs.readFileSync(fnCatPath,'utf8')!==fnCatText)throw Error('netlify/functions/_lib/catalogo.mjs no está actualizado. Ejecutá npm run build.');console.log('OK: sintaxis, catálogo, imágenes y HTML actualizado.');}
else{fs.writeFileSync(output,html);fs.mkdirSync(path.dirname(fnCatPath),{recursive:true});fs.writeFileSync(fnCatPath,fnCatText);console.log('Listo: index.html. Abrilo con doble clic.');}
