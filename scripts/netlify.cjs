// Arma la carpeta "dist" para Netlify: solo los archivos que necesita la página publicada.
// Si Netlify define la variable URL (dirección del sitio), corrige los links de Google y de redes.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const dist=path.join(root,'dist');
const OLD='https://gggalooo.github.io/la-once-avellaneda/';
const site=(process.env.SITE_URL||process.env.URL||'').replace(/\/+$/,'');

execFileSync(process.execPath,[path.join(__dirname,'build.cjs')],{stdio:'inherit'});
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});
const copy=(src)=>{const from=path.join(root,src);if(!fs.existsSync(from))return;fs.cpSync(from,path.join(dist,src),{recursive:true})};
['index.html','favicon.svg','apple-touch-icon.png'].forEach(copy);
// Solo las imágenes que se usan (catálogo y vista previa al compartir); las viejas quedan afuera.
const used=new Set();
const scan=t=>(t.match(/assets\/[A-Za-z0-9._-]+\.(?:webp|png|jpe?g)/g)||[]).forEach(a=>used.add(a));
scan(fs.readFileSync(path.join(root,'src','catalogo.json'),'utf8'));
scan(fs.readFileSync(path.join(root,'src','index.template.html'),'utf8'));
used.forEach(copy);
fs.readdirSync(root).filter(f=>/^google[0-9a-f]+\.html$/.test(f)).forEach(copy);

let html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
if(site){
  // La imagen para compartir sigue apuntando a la carpeta assets del sitio nuevo.
  html=html.split(OLD).join(site+'/');
  fs.writeFileSync(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>'+site+'/</loc>\n  </url>\n</urlset>\n');
  fs.writeFileSync(path.join(dist,'robots.txt'),'User-agent: *\nAllow: /\n\nSitemap: '+site+'/sitemap.xml\n');
}else{
  // Sin dirección conocida: se quita la canónica para no apuntar a otro sitio.
  html=html.replace(/<link rel="canonical"[^>]*>\n?/,'').replace(/<meta property="og:url"[^>]*>\n?/,'');
  fs.writeFileSync(path.join(dist,'robots.txt'),'User-agent: *\nAllow: /\n');
}
// El link de la planilla privada de socios no se publica en la tienda.
html=html.replace(/,"panelSocios":"[^"]*"/,'');
fs.writeFileSync(path.join(dist,'index.html'),html);
console.log('Listo: carpeta dist para Netlify'+(site?' ('+site+')':'')+'.');
