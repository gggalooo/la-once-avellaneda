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
const js=read('src/app.js').replace('/* @include ruleta.js */',()=>read('src/ruleta.js'));
if(js.includes('/* @include'))throw Error('Quedó un archivo sin incluir.');
const html=read('src/index.template.html').replace('{{STYLES}}',()=>read('src/styles.css')).replace('{{CATALOG}}',()=>JSON.stringify(embed(data)).replace(/</g,'\\u003c')).replace('{{APP}}',()=>js);
const output=path.join(root,'index.html');
if(process.argv.includes('--check')){if(!fs.existsSync(output)||read('index.html')!==html)throw Error('index.html no está actualizado. Ejecutá npm run build.');console.log('OK: sintaxis, catálogo, imágenes y HTML actualizado.');}
else{fs.writeFileSync(output,html);console.log('Listo: index.html. Abrilo con doble clic.');}
