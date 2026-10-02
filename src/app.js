
(function(){
"use strict";
var SIZES=["S","M","L","XL","XXL"];
var CATS=["Sudamérica","Europa","Selecciones"];
var EPOCAS=["Actual","Retro"];
var PATTERNS={liso:"Liso",bastones:"Bastones",banda:"Banda horizontal",diagonal:"Banda diagonal",aros:"Rayas horizontales",mitades:"Mitad y mitad"};
var HEAD_FONTS='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,600;1,700;1,800;1,900&family=Montserrat:wght@700;800&display=swap" rel="stylesheet">';
var NAV=[{k:"inicio",t:"Inicio"},{k:"stock",t:"En stock"},{k:"pedido",t:"Por pedido"},{k:"todo",t:"Todas"},{k:"ruleta",t:"La ruleta"}];

var saved=JSON.parse(document.getElementById("store-data").textContent);
var data=clone(saved);
var view=location.hash==="#socios"?"admin":"home";
var sec="todo";
function emptyFilters(){return {q:"",categoria:"",epoca:"",talle:"",nuevo:false,oferta:false,orden:"rel"}}
var filt=emptyFilters(), filtersOpen=innerWidth>720;
var cartNotice="";
var dirty=false, adminMsg=null, busy=false, slide=0, timer=null;
var cart=loadCart();
var app=document.getElementById("app");

function clone(o){return JSON.parse(JSON.stringify(o))}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function money(n){return "$"+Math.round(Number(n)||0).toLocaleString("es-AR")}
function total(p){return SIZES.reduce(function(a,s){return a+(Number(p.stock[s])||0)},0)}
function transfer(n){var d=Number(data.config.descuentoTransferencia)||0;return n*(1-d/100)}
function uid(){return "p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function byId(id){return data.productos.find(function(x){return x.id===id})}
function onSale(p){return Number(p.precioAnterior)>Number(p.precio)}
function pct(p){return Math.round((1-p.precio/p.precioAnterior)*100)}
function loadCart(){try{var c=JSON.parse(localStorage.getItem("laonce-pedido")||"[]");return Array.isArray(c)?c:[]}catch(e){return []}}
function saveCart(){try{localStorage.setItem("laonce-pedido",JSON.stringify(cart))}catch(e){}}

var svgN=0;
function jersey(pt){
  pt=pt||{};
  var id="j"+(++svgN), c1=esc(pt.c1||"#ffffff"), c2=esc(pt.c2||"#222222"), fill="";
  switch(pt.tipo){
    case "bastones": fill='<rect width="200" height="220" fill="'+c1+'"/>'+[0,1,2,3,4,5,6].map(function(i){return '<rect x="'+(22+i*26)+'" y="0" width="13" height="220" fill="'+c2+'"/>'}).join(""); break;
    case "banda": fill='<rect width="200" height="220" fill="'+c1+'"/><rect x="0" y="92" width="200" height="44" fill="'+c2+'"/>'; break;
    case "diagonal": fill='<rect width="200" height="220" fill="'+c1+'"/><polygon points="160,20 122,20 25,215 63,215" fill="'+c2+'"/>'; break;
    case "aros": fill='<rect width="200" height="220" fill="'+c1+'"/>'+[0,1,2,3,4,5].map(function(i){return '<rect x="0" y="'+(30+i*32)+'" width="200" height="16" fill="'+c2+'"/>'}).join(""); break;
    case "mitades": fill='<rect width="100" height="220" fill="'+c1+'"/><rect x="100" width="100" height="220" fill="'+c2+'"/>'; break;
    default: fill='<rect width="200" height="220" fill="'+c1+'"/><rect x="15" y="40" width="30" height="8" fill="'+c2+'" transform="rotate(35 30 44)"/><rect x="155" y="40" width="30" height="8" fill="'+c2+'" transform="rotate(-35 170 44)"/>';
  }
  var shape="M62 18 L86 10 Q100 26 114 10 L138 18 L186 48 L168 90 L150 80 L150 206 Q100 214 50 206 L50 80 L32 90 L14 48 Z";
  return '<svg viewBox="0 0 200 220" aria-hidden="true"><defs><clipPath id="'+id+'"><path d="'+shape+'"/></clipPath></defs><g clip-path="url(#'+id+')">'+fill+'</g><path d="'+shape+'" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="2.5"/><path d="M86 10 Q100 26 114 10" fill="none" stroke="'+c2+'" stroke-width="6"/></svg>';
}
function art(p){if(!p.foto&&isPre(p))return '<div class="missing-photo"><div><b>Foto pendiente</b><br>'+esc(p.club)+'<br>Referencia del proveedor</div></div>';return p.foto?'<img src="'+esc(p.foto)+'" alt="'+esc(p.club+" "+p.titulo)+'" loading="lazy" decoding="async">':jersey(p.patron)}
function waNumber(){return String(data.config.whatsapp||"").replace(/\D/g,"")}

/* ---------- Partes comunes ---------- */
function header(){
  var c=data.config, n=cart.reduce(function(a,l){return a+l.cant},0);
  var top=Number(c.envioGratisDesde)>0?"Envío gratis desde "+money(c.envioGratisDesde)+" · "+(Number(c.descuentoTransferencia)||0)+"% off "+offW():(c.envios||"");
  var nav=NAV.map(function(x){var cur=(view==="home"&&x.k==="inicio")||(view==="catalog"&&sec===x.k)||(view==="game"&&x.k==="ruleta");return '<button data-nav="'+esc(x.k)+'" aria-current="'+cur+'">'+x.t+'</button>'}).join("");
  return '<div class="topbar">'+esc(top)+'</div>'+prizeBar()+'<header class="site"><div class="wrap head-row"><button class="logo" data-nav="inicio" aria-label="Ir al inicio">'+(c.logo?'<img class="logo-mark logo-img" src="'+esc(c.logo)+'" alt="" width="46" height="46">':'<span class="logo-mark">11</span>')+'<span class="logo-word">'+logoWord(c.nombre)+'</span></button><input class="search" type="search" placeholder="Buscar camiseta" aria-label="Buscar" value="'+esc(filt.q)+'"><div class="acc-head">'+accountLink()+'</div><button class="bag" id="openBag" aria-label="Carrito'+(n?', '+n+(n===1?' camiseta':' camisetas'):', vacío')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.5-1.2L21 8H6.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19.5" r="1.6" fill="currentColor"/><circle cx="17" cy="19.5" r="1.6" fill="currentColor"/></svg>'+(n?'<i>'+n+'</i>':'')+'</button></div><nav class="cats" aria-label="Categorías"><div class="wrap">'+nav+'</div></nav></header>';
}
function logoWord(n){
 if(n==="La ONCE Kits") return '<span>La <b>ONCE</b></span><small>Kits</small>';
 return esc(n);
}
function footer(){
  var c=data.config, ig=String(c.instagram||"").replace(/^@/,"");
  return (ig?'<section class="insta"><div class="wrap"><h2>Seguinos en Instagram</h2><p>Novedades, ingresos y sorteos.</p><a class="btn btn-ink" target="_blank" rel="noopener" href="https://instagram.com/'+esc(ig)+'">@'+esc(ig)+'</a></div></section>':'<div style="height:40px"></div>')+
  '<footer><div class="wrap"><div><h4>'+esc(c.nombre)+'</h4><p>'+esc(c.envios||"")+(c.zona?"<br>"+esc(c.zona):"")+'</p></div><div><h4>Categorías</h4><ul>'+CATS.map(function(k){return '<li><button data-nav="'+esc(k)+'">'+esc(k)+'</button></li>'}).join("")+'</ul></div><div><h4>Ayuda</h4><ul><li><button id="howto">Cómo comprar</button></li>'+(waNumber()?'<li><a href="https://wa.me/'+waNumber()+'" target="_blank" rel="noopener">WhatsApp</a></li>':"")+'</ul></div></div></footer>'+legalFooter();
}
function card(p){
  var t=available(p), b="";
  if(isPre(p)) b+='<span class="badge">Por pedido</span>';
  else if(t===0) b+='<span class="badge out">Sin stock</span>';
  else { if(onSale(p)) b+='<span class="badge sale">'+pct(p)+'% OFF</span>'; if(p.nuevo) b+='<span class="badge new">Nuevo</span>'; if(t<=2) b+='<span class="badge">Últimas '+t+'</span>'; }
  if(Number(data.config.envioGratisDesde)>0 && p.precio>=Number(data.config.envioGratisDesde)) b+='<span class="badge ship">Envío gratis</span>';
  var pills=SIZES.map(function(s){return '<span class="'+(capacity(p,s)>0?"":"no")+'">'+s+'</span>'}).join("");
  var cuotas=Number(data.config.cuotas)||0;
  return '<article class="item"><button class="art" data-open="'+esc(p.id)+'" aria-label="Ver '+esc(p.club+" "+p.titulo)+'">'+art(p)+'<span class="badges">'+b+'</span></button><div class="info">'+modeBadge(p)+'<h3 class="name">'+esc(p.club)+'<small>'+esc(p.titulo)+'</small></h3><div class="prices">'+(onSale(p)?'<s>'+money(p.precioAnterior)+'</s>':"")+'<strong>'+money(p.precio)+'</strong></div><span class="transfer">'+money(transfer(p.precio))+' '+offW()+'</span>'+(cuotas>1?'<span class="hint">'+cuotas+' cuotas de '+money(p.precio/cuotas)+'</span>':"")+'<div class="sz">'+pills+'</div><button class="btn '+(t?"btn-ink":"btn-ghost")+' buy" data-open="'+esc(p.id)+'">'+(isPre(p)?"Elegir talle":t?"Comprar":"Avisame")+'</button></div></article>';
}
function sortList(l){
  var o=filt.orden;
  return l.slice().sort(function(a,b){
    var sa=available(a)>0?0:1, sb=available(b)>0?0:1; if(sa!==sb) return sa-sb;
    if(o==="precio-asc") return a.precio-b.precio;
    if(o==="precio-desc") return b.precio-a.precio;
    if(!!b.nuevo!==!!a.nuevo) return b.nuevo?1:-1;
    if(!!b.destacado!==!!a.destacado) return b.destacado?1:-1;
    return 0;
  });
}
function inSection(p,k){
  if(isPre(p)&&p.activo===false)return false;
  if(k==="pedido")return isPre(p);
  if(k==="stock")return !isPre(p);
  if(k!=="todo"&&isPre(p))return false;
  if(k==="todo") return true;
  if(k==="nuevo") return !!p.nuevo;
  if(k==="destacado") return !!p.destacado;
  if(k==="oferta") return onSale(p);
  if(EPOCAS.indexOf(k)>=0) return p.epoca===k;
  return p.categoria===k;
}
function matchesQuery(p){var q=filt.q.trim().toLowerCase();return !q||(p.club+" "+p.titulo+" "+p.categoria+" "+p.epoca).toLowerCase().indexOf(q)>=0}

/* ---------- Inicio ---------- */
var STADIUM='<svg class="stadium-bg" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050B1C"/><stop offset=".55" stop-color="#0F2150"/><stop offset="1" stop-color="#1A3570"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFFBE6" stop-opacity=".95"/><stop offset=".25" stop-color="#FFF3C4" stop-opacity=".45"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF7D6" stop-opacity=".12"/><stop offset="1" stop-color="#FFF7D6" stop-opacity="0"/></linearGradient><linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F6B3A"/><stop offset="1" stop-color="#15401F"/></linearGradient><pattern id="mow" width="160" height="200" patternUnits="userSpaceOnUse"><rect width="80" height="200" fill="#ffffff" opacity=".045"/></pattern><linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F2150" stop-opacity="0"/><stop offset="1" stop-color="#0F2150" stop-opacity=".55"/></linearGradient></defs><rect width="1600" height="600" fill="url(#sky)"/><polygon points="170,70 -200,600 560,600" fill="url(#beam)"/><polygon points="1430,70 1040,600 1800,600" fill="url(#beam)"/><path d="M0 238 Q800 205 1600 238 L1600 405 L0 405 Z" fill="#0B1634"/><circle cx="-1" cy="251" r="2.7" fill="#FFFFFF" opacity="0.39"/><circle cx="32" cy="250" r="3.0" fill="#FFFFFF" opacity="0.54"/><circle cx="53" cy="248" r="3.6" fill="#E8EDF5" opacity="0.61"/><circle cx="101" cy="248" r="3.1" fill="#8CC8F2" opacity="0.66"/><circle cx="117" cy="248" r="2.8" fill="#1B3A8C" opacity="0.38"/><circle cx="133" cy="251" r="3.3" fill="#D6202B" opacity="0.56"/><circle cx="156" cy="248" r="2.9" fill="#8CC8F2" opacity="0.46"/><circle cx="170" cy="252" r="3.8" fill="#D6202B" opacity="0.62"/><circle cx="184" cy="248" r="3.1" fill="#4FA3E3" opacity="0.54"/><circle cx="207" cy="250" r="3.9" fill="#8CC8F2" opacity="0.49"/><circle cx="222" cy="250" r="3.3" fill="#8CC8F2" opacity="0.39"/><circle cx="237" cy="247" r="3.8" fill="#D6202B" opacity="0.64"/><circle cx="271" cy="251" r="2.6" fill="#4FA3E3" opacity="0.51"/><circle cx="290" cy="248" r="3.1" fill="#1B3A8C" opacity="0.46"/><circle cx="320" cy="250" r="4.0" fill="#8CC8F2" opacity="0.54"/><circle cx="340" cy="253" r="3.7" fill="#4FA3E3" opacity="0.78"/><circle cx="355" cy="248" r="3.0" fill="#4FA3E3" opacity="0.72"/><circle cx="372" cy="248" r="3.5" fill="#FFFFFF" opacity="0.60"/><circle cx="394" cy="250" r="3.6" fill="#1B3A8C" opacity="0.68"/><circle cx="428" cy="250" r="3.2" fill="#4FA3E3" opacity="0.40"/><circle cx="443" cy="247" r="2.9" fill="#F2C230" opacity="0.40"/><circle cx="460" cy="250" r="3.5" fill="#D6202B" opacity="0.63"/><circle cx="473" cy="249" r="3.6" fill="#D6202B" opacity="0.62"/><circle cx="493" cy="250" r="4.2" fill="#4FA3E3" opacity="0.57"/><circle cx="508" cy="249" r="3.0" fill="#8CC8F2" opacity="0.66"/><circle cx="527" cy="253" r="3.2" fill="#1B3A8C" opacity="0.59"/><circle cx="541" cy="253" r="4.0" fill="#1B3A8C" opacity="0.73"/><circle cx="577" cy="250" r="3.4" fill="#1B3A8C" opacity="0.45"/><circle cx="614" cy="252" r="3.8" fill="#F2C230" opacity="0.44"/><circle cx="629" cy="253" r="3.9" fill="#4FA3E3" opacity="0.47"/><circle cx="696" cy="248" r="2.9" fill="#F2C230" opacity="0.57"/><circle cx="717" cy="247" r="4.1" fill="#D6202B" opacity="0.71"/><circle cx="729" cy="252" r="3.9" fill="#8CC8F2" opacity="0.44"/><circle cx="750" cy="251" r="2.7" fill="#1B3A8C" opacity="0.53"/><circle cx="783" cy="248" r="2.8" fill="#4FA3E3" opacity="0.71"/><circle cx="819" cy="249" r="3.5" fill="#F2C230" opacity="0.36"/><circle cx="835" cy="248" r="3.8" fill="#F2C230" opacity="0.55"/><circle cx="865" cy="249" r="3.0" fill="#FFFFFF" opacity="0.50"/><circle cx="898" cy="252" r="3.7" fill="#8CC8F2" opacity="0.76"/><circle cx="935" cy="250" r="2.6" fill="#4FA3E3" opacity="0.70"/><circle cx="953" cy="248" r="2.8" fill="#FFFFFF" opacity="0.68"/><circle cx="969" cy="250" r="3.5" fill="#8CC8F2" opacity="0.70"/><circle cx="988" cy="248" r="2.7" fill="#E8EDF5" opacity="0.58"/><circle cx="1003" cy="252" r="3.3" fill="#FFFFFF" opacity="0.79"/><circle cx="1021" cy="249" r="3.4" fill="#8CC8F2" opacity="0.57"/><circle cx="1040" cy="252" r="4.1" fill="#D6202B" opacity="0.77"/><circle cx="1056" cy="250" r="3.3" fill="#4FA3E3" opacity="0.55"/><circle cx="1068" cy="247" r="3.7" fill="#8CC8F2" opacity="0.41"/><circle cx="1106" cy="249" r="2.8" fill="#4FA3E3" opacity="0.45"/><circle cx="1125" cy="250" r="4.2" fill="#8CC8F2" opacity="0.45"/><circle cx="1155" cy="249" r="2.7" fill="#D6202B" opacity="0.36"/><circle cx="1173" cy="247" r="3.1" fill="#FFFFFF" opacity="0.48"/><circle cx="1193" cy="253" r="3.0" fill="#E8EDF5" opacity="0.39"/><circle cx="1222" cy="252" r="4.0" fill="#1B3A8C" opacity="0.72"/><circle cx="1240" cy="253" r="3.5" fill="#1B3A8C" opacity="0.50"/><circle cx="1257" cy="248" r="4.0" fill="#D6202B" opacity="0.77"/><circle cx="1276" cy="248" r="4.0" fill="#E8EDF5" opacity="0.47"/><circle cx="1290" cy="253" r="3.3" fill="#D6202B" opacity="0.63"/><circle cx="1306" cy="253" r="4.2" fill="#D6202B" opacity="0.37"/><circle cx="1324" cy="249" r="3.8" fill="#D6202B" opacity="0.55"/><circle cx="1344" cy="252" r="4.2" fill="#E8EDF5" opacity="0.36"/><circle cx="1361" cy="248" r="3.4" fill="#4FA3E3" opacity="0.40"/><circle cx="1379" cy="250" r="3.9" fill="#4FA3E3" opacity="0.79"/><circle cx="1393" cy="248" r="2.9" fill="#1B3A8C" opacity="0.68"/><circle cx="1442" cy="252" r="3.3" fill="#E8EDF5" opacity="0.39"/><circle cx="1480" cy="248" r="3.1" fill="#4FA3E3" opacity="0.43"/><circle cx="1495" cy="249" r="3.1" fill="#FFFFFF" opacity="0.50"/><circle cx="1528" cy="249" r="2.7" fill="#D6202B" opacity="0.58"/><circle cx="1545" cy="247" r="3.0" fill="#E8EDF5" opacity="0.41"/><circle cx="1565" cy="249" r="3.6" fill="#E8EDF5" opacity="0.61"/><circle cx="1581" cy="251" r="3.7" fill="#FFFFFF" opacity="0.53"/><circle cx="6" cy="268" r="2.7" fill="#8CC8F2" opacity="0.67"/><circle cx="25" cy="268" r="3.4" fill="#FFFFFF" opacity="0.69"/><circle cx="42" cy="264" r="3.7" fill="#8CC8F2" opacity="0.75"/><circle cx="60" cy="265" r="2.6" fill="#F2C230" opacity="0.64"/><circle cx="79" cy="267" r="2.7" fill="#E8EDF5" opacity="0.63"/><circle cx="94" cy="264" r="3.9" fill="#1B3A8C" opacity="0.77"/><circle cx="112" cy="267" r="3.8" fill="#4FA3E3" opacity="0.46"/><circle cx="124" cy="268" r="2.9" fill="#1B3A8C" opacity="0.64"/><circle cx="177" cy="268" r="2.9" fill="#FFFFFF" opacity="0.42"/><circle cx="194" cy="266" r="3.5" fill="#E8EDF5" opacity="0.57"/><circle cx="227" cy="267" r="3.7" fill="#D6202B" opacity="0.56"/><circle cx="246" cy="269" r="2.9" fill="#E8EDF5" opacity="0.77"/><circle cx="260" cy="269" r="4.1" fill="#4FA3E3" opacity="0.80"/><circle cx="300" cy="265" r="3.8" fill="#D6202B" opacity="0.78"/><circle cx="349" cy="269" r="3.4" fill="#E8EDF5" opacity="0.42"/><circle cx="368" cy="266" r="3.8" fill="#4FA3E3" opacity="0.50"/><circle cx="396" cy="269" r="2.8" fill="#F2C230" opacity="0.67"/><circle cx="418" cy="266" r="3.2" fill="#8CC8F2" opacity="0.62"/><circle cx="432" cy="266" r="2.7" fill="#E8EDF5" opacity="0.37"/><circle cx="451" cy="265" r="4.2" fill="#4FA3E3" opacity="0.58"/><circle cx="465" cy="270" r="4.0" fill="#8CC8F2" opacity="0.69"/><circle cx="501" cy="264" r="4.1" fill="#4FA3E3" opacity="0.55"/><circle cx="520" cy="266" r="2.7" fill="#FFFFFF" opacity="0.41"/><circle cx="535" cy="266" r="3.8" fill="#1B3A8C" opacity="0.47"/><circle cx="553" cy="267" r="3.2" fill="#F2C230" opacity="0.64"/><circle cx="566" cy="269" r="3.5" fill="#4FA3E3" opacity="0.76"/><circle cx="589" cy="265" r="2.9" fill="#E8EDF5" opacity="0.43"/><circle cx="603" cy="266" r="3.9" fill="#F2C230" opacity="0.75"/><circle cx="621" cy="266" r="3.4" fill="#4FA3E3" opacity="0.47"/><circle cx="639" cy="267" r="3.2" fill="#1B3A8C" opacity="0.58"/><circle cx="669" cy="265" r="3.2" fill="#4FA3E3" opacity="0.54"/><circle cx="687" cy="270" r="2.8" fill="#4FA3E3" opacity="0.67"/><circle cx="707" cy="268" r="2.6" fill="#4FA3E3" opacity="0.77"/><circle cx="725" cy="267" r="3.3" fill="#8CC8F2" opacity="0.40"/><circle cx="737" cy="268" r="4.1" fill="#1B3A8C" opacity="0.67"/><circle cx="771" cy="264" r="2.8" fill="#FFFFFF" opacity="0.76"/><circle cx="791" cy="265" r="3.0" fill="#1B3A8C" opacity="0.55"/><circle cx="809" cy="266" r="4.1" fill="#F2C230" opacity="0.52"/><circle cx="822" cy="264" r="3.1" fill="#4FA3E3" opacity="0.48"/><circle cx="856" cy="267" r="2.6" fill="#4FA3E3" opacity="0.67"/><circle cx="874" cy="267" r="3.7" fill="#4FA3E3" opacity="0.39"/><circle cx="890" cy="266" r="3.4" fill="#1B3A8C" opacity="0.50"/><circle cx="909" cy="265" r="3.9" fill="#1B3A8C" opacity="0.73"/><circle cx="923" cy="265" r="3.8" fill="#F2C230" opacity="0.45"/><circle cx="941" cy="266" r="4.1" fill="#4FA3E3" opacity="0.62"/><circle cx="962" cy="269" r="2.7" fill="#FFFFFF" opacity="0.42"/><circle cx="976" cy="270" r="2.8" fill="#E8EDF5" opacity="0.67"/><circle cx="992" cy="268" r="3.1" fill="#E8EDF5" opacity="0.80"/><circle cx="1014" cy="265" r="4.1" fill="#1B3A8C" opacity="0.56"/><circle cx="1027" cy="269" r="4.2" fill="#4FA3E3" opacity="0.43"/><circle cx="1042" cy="266" r="4.1" fill="#E8EDF5" opacity="0.60"/><circle cx="1064" cy="269" r="3.1" fill="#8CC8F2" opacity="0.54"/><circle cx="1076" cy="266" r="4.1" fill="#F2C230" opacity="0.50"/><circle cx="1097" cy="268" r="3.0" fill="#1B3A8C" opacity="0.70"/><circle cx="1110" cy="264" r="4.1" fill="#D6202B" opacity="0.44"/><circle cx="1127" cy="266" r="3.1" fill="#FFFFFF" opacity="0.37"/><circle cx="1148" cy="270" r="3.1" fill="#1B3A8C" opacity="0.69"/><circle cx="1166" cy="270" r="2.6" fill="#F2C230" opacity="0.40"/><circle cx="1182" cy="269" r="3.9" fill="#4FA3E3" opacity="0.72"/><circle cx="1196" cy="264" r="4.1" fill="#D6202B" opacity="0.72"/><circle cx="1217" cy="266" r="3.1" fill="#D6202B" opacity="0.70"/><circle cx="1233" cy="266" r="2.9" fill="#4FA3E3" opacity="0.38"/><circle cx="1246" cy="266" r="4.2" fill="#E8EDF5" opacity="0.79"/><circle cx="1265" cy="265" r="3.4" fill="#1B3A8C" opacity="0.79"/><circle cx="1281" cy="267" r="4.0" fill="#F2C230" opacity="0.69"/><circle cx="1302" cy="265" r="3.9" fill="#D6202B" opacity="0.48"/><circle cx="1316" cy="266" r="3.3" fill="#F2C230" opacity="0.46"/><circle cx="1351" cy="266" r="4.2" fill="#FFFFFF" opacity="0.59"/><circle cx="1369" cy="267" r="2.7" fill="#E8EDF5" opacity="0.56"/><circle cx="1404" cy="266" r="2.8" fill="#F2C230" opacity="0.62"/><circle cx="1421" cy="264" r="3.4" fill="#F2C230" opacity="0.55"/><circle cx="1435" cy="270" r="2.8" fill="#FFFFFF" opacity="0.67"/><circle cx="1452" cy="266" r="2.7" fill="#D6202B" opacity="0.37"/><circle cx="1489" cy="266" r="3.2" fill="#FFFFFF" opacity="0.49"/><circle cx="1502" cy="267" r="2.7" fill="#E8EDF5" opacity="0.71"/><circle cx="1522" cy="267" r="3.6" fill="#4FA3E3" opacity="0.66"/><circle cx="1537" cy="266" r="4.1" fill="#D6202B" opacity="0.69"/><circle cx="1557" cy="264" r="3.8" fill="#8CC8F2" opacity="0.51"/><circle cx="1570" cy="265" r="2.6" fill="#F2C230" opacity="0.54"/><circle cx="1591" cy="269" r="3.3" fill="#F2C230" opacity="0.41"/><circle cx="1603" cy="269" r="3.2" fill="#FFFFFF" opacity="0.63"/><circle cx="-1" cy="282" r="3.1" fill="#FFFFFF" opacity="0.43"/><circle cx="14" cy="286" r="3.9" fill="#8CC8F2" opacity="0.44"/><circle cx="54" cy="281" r="4.1" fill="#4FA3E3" opacity="0.39"/><circle cx="69" cy="286" r="3.6" fill="#8CC8F2" opacity="0.45"/><circle cx="104" cy="282" r="3.2" fill="#FFFFFF" opacity="0.42"/><circle cx="118" cy="287" r="3.9" fill="#F2C230" opacity="0.37"/><circle cx="136" cy="281" r="3.9" fill="#E8EDF5" opacity="0.53"/><circle cx="172" cy="283" r="3.0" fill="#4FA3E3" opacity="0.65"/><circle cx="187" cy="281" r="3.6" fill="#4FA3E3" opacity="0.56"/><circle cx="204" cy="286" r="3.9" fill="#8CC8F2" opacity="0.56"/><circle cx="219" cy="284" r="2.7" fill="#4FA3E3" opacity="0.58"/><circle cx="239" cy="282" r="4.1" fill="#D6202B" opacity="0.70"/><circle cx="255" cy="284" r="3.2" fill="#8CC8F2" opacity="0.41"/><circle cx="290" cy="282" r="4.2" fill="#4FA3E3" opacity="0.48"/><circle cx="308" cy="285" r="3.8" fill="#F2C230" opacity="0.38"/><circle cx="322" cy="282" r="4.0" fill="#D6202B" opacity="0.76"/><circle cx="340" cy="287" r="3.4" fill="#FFFFFF" opacity="0.47"/><circle cx="357" cy="281" r="2.9" fill="#F2C230" opacity="0.64"/><circle cx="373" cy="283" r="3.9" fill="#D6202B" opacity="0.40"/><circle cx="391" cy="283" r="4.0" fill="#FFFFFF" opacity="0.58"/><circle cx="424" cy="286" r="3.8" fill="#D6202B" opacity="0.47"/><circle cx="445" cy="283" r="3.8" fill="#4FA3E3" opacity="0.45"/><circle cx="475" cy="283" r="4.1" fill="#8CC8F2" opacity="0.61"/><circle cx="494" cy="281" r="2.7" fill="#F2C230" opacity="0.48"/><circle cx="511" cy="283" r="2.7" fill="#4FA3E3" opacity="0.45"/><circle cx="528" cy="281" r="3.2" fill="#E8EDF5" opacity="0.59"/><circle cx="544" cy="283" r="2.8" fill="#D6202B" opacity="0.63"/><circle cx="561" cy="287" r="3.0" fill="#F2C230" opacity="0.55"/><circle cx="575" cy="285" r="3.0" fill="#8CC8F2" opacity="0.47"/><circle cx="592" cy="284" r="3.2" fill="#1B3A8C" opacity="0.61"/><circle cx="613" cy="284" r="2.9" fill="#E8EDF5" opacity="0.37"/><circle cx="629" cy="282" r="2.7" fill="#8CC8F2" opacity="0.40"/><circle cx="647" cy="282" r="3.3" fill="#FFFFFF" opacity="0.62"/><circle cx="663" cy="286" r="2.9" fill="#D6202B" opacity="0.38"/><circle cx="698" cy="284" r="3.2" fill="#4FA3E3" opacity="0.69"/><circle cx="714" cy="284" r="3.0" fill="#E8EDF5" opacity="0.47"/><circle cx="732" cy="286" r="4.1" fill="#8CC8F2" opacity="0.47"/><circle cx="745" cy="285" r="3.7" fill="#FFFFFF" opacity="0.79"/><circle cx="784" cy="284" r="2.9" fill="#F2C230" opacity="0.73"/><circle cx="797" cy="286" r="2.9" fill="#4FA3E3" opacity="0.50"/><circle cx="834" cy="285" r="4.2" fill="#4FA3E3" opacity="0.56"/><circle cx="850" cy="281" r="4.1" fill="#F2C230" opacity="0.61"/><circle cx="866" cy="285" r="2.7" fill="#F2C230" opacity="0.42"/><circle cx="881" cy="287" r="3.2" fill="#F2C230" opacity="0.67"/><circle cx="898" cy="285" r="2.7" fill="#E8EDF5" opacity="0.68"/><circle cx="915" cy="283" r="3.9" fill="#8CC8F2" opacity="0.59"/><circle cx="954" cy="283" r="3.0" fill="#F2C230" opacity="0.40"/><circle cx="988" cy="286" r="3.6" fill="#D6202B" opacity="0.56"/><circle cx="1001" cy="285" r="3.1" fill="#D6202B" opacity="0.54"/><circle cx="1017" cy="283" r="3.7" fill="#D6202B" opacity="0.76"/><circle cx="1039" cy="284" r="3.1" fill="#1B3A8C" opacity="0.36"/><circle cx="1053" cy="286" r="3.2" fill="#1B3A8C" opacity="0.37"/><circle cx="1071" cy="286" r="3.5" fill="#D6202B" opacity="0.43"/><circle cx="1085" cy="286" r="4.2" fill="#E8EDF5" opacity="0.51"/><circle cx="1103" cy="286" r="4.1" fill="#FFFFFF" opacity="0.51"/><circle cx="1124" cy="287" r="3.1" fill="#F2C230" opacity="0.77"/><circle cx="1137" cy="287" r="3.8" fill="#4FA3E3" opacity="0.70"/><circle cx="1157" cy="285" r="3.2" fill="#4FA3E3" opacity="0.77"/><circle cx="1175" cy="284" r="3.6" fill="#D6202B" opacity="0.44"/><circle cx="1207" cy="286" r="3.0" fill="#4FA3E3" opacity="0.41"/><circle cx="1225" cy="285" r="2.7" fill="#FFFFFF" opacity="0.50"/><circle cx="1259" cy="282" r="3.3" fill="#8CC8F2" opacity="0.47"/><circle cx="1273" cy="285" r="3.7" fill="#FFFFFF" opacity="0.44"/><circle cx="1291" cy="286" r="2.8" fill="#F2C230" opacity="0.79"/><circle cx="1310" cy="283" r="3.0" fill="#F2C230" opacity="0.47"/><circle cx="1341" cy="282" r="2.8" fill="#F2C230" opacity="0.71"/><circle cx="1361" cy="282" r="3.6" fill="#E8EDF5" opacity="0.48"/><circle cx="1379" cy="281" r="4.0" fill="#4FA3E3" opacity="0.66"/><circle cx="1394" cy="284" r="2.8" fill="#FFFFFF" opacity="0.68"/><circle cx="1408" cy="286" r="3.7" fill="#FFFFFF" opacity="0.69"/><circle cx="1428" cy="285" r="4.0" fill="#8CC8F2" opacity="0.64"/><circle cx="1446" cy="282" r="2.8" fill="#4FA3E3" opacity="0.49"/><circle cx="1463" cy="284" r="3.9" fill="#1B3A8C" opacity="0.67"/><circle cx="1496" cy="286" r="3.4" fill="#1B3A8C" opacity="0.77"/><circle cx="1511" cy="286" r="3.2" fill="#4FA3E3" opacity="0.76"/><circle cx="1528" cy="282" r="3.7" fill="#F2C230" opacity="0.58"/><circle cx="1545" cy="284" r="3.7" fill="#FFFFFF" opacity="0.36"/><circle cx="1566" cy="283" r="3.8" fill="#4FA3E3" opacity="0.44"/><circle cx="1582" cy="286" r="2.8" fill="#FFFFFF" opacity="0.51"/><circle cx="1595" cy="283" r="2.6" fill="#4FA3E3" opacity="0.76"/><circle cx="9" cy="301" r="2.8" fill="#D6202B" opacity="0.68"/><circle cx="28" cy="299" r="3.9" fill="#4FA3E3" opacity="0.56"/><circle cx="56" cy="299" r="3.6" fill="#1B3A8C" opacity="0.45"/><circle cx="79" cy="302" r="3.9" fill="#8CC8F2" opacity="0.54"/><circle cx="96" cy="302" r="3.8" fill="#4FA3E3" opacity="0.51"/><circle cx="112" cy="300" r="3.0" fill="#4FA3E3" opacity="0.66"/><circle cx="127" cy="303" r="3.2" fill="#1B3A8C" opacity="0.49"/><circle cx="144" cy="302" r="3.7" fill="#D6202B" opacity="0.42"/><circle cx="160" cy="299" r="3.5" fill="#D6202B" opacity="0.70"/><circle cx="196" cy="298" r="4.1" fill="#1B3A8C" opacity="0.48"/><circle cx="213" cy="303" r="2.9" fill="#4FA3E3" opacity="0.51"/><circle cx="248" cy="303" r="3.6" fill="#8CC8F2" opacity="0.39"/><circle cx="265" cy="302" r="3.1" fill="#4FA3E3" opacity="0.66"/><circle cx="280" cy="301" r="4.0" fill="#FFFFFF" opacity="0.40"/><circle cx="314" cy="301" r="4.0" fill="#1B3A8C" opacity="0.57"/><circle cx="331" cy="303" r="2.6" fill="#8CC8F2" opacity="0.49"/><circle cx="349" cy="300" r="3.3" fill="#4FA3E3" opacity="0.54"/><circle cx="368" cy="302" r="3.6" fill="#E8EDF5" opacity="0.36"/><circle cx="379" cy="304" r="3.9" fill="#E8EDF5" opacity="0.58"/><circle cx="413" cy="302" r="3.1" fill="#8CC8F2" opacity="0.65"/><circle cx="432" cy="301" r="4.1" fill="#D6202B" opacity="0.55"/><circle cx="450" cy="303" r="3.1" fill="#8CC8F2" opacity="0.57"/><circle cx="486" cy="299" r="3.4" fill="#E8EDF5" opacity="0.50"/><circle cx="500" cy="302" r="3.6" fill="#8CC8F2" opacity="0.80"/><circle cx="517" cy="300" r="3.5" fill="#4FA3E3" opacity="0.49"/><circle cx="532" cy="304" r="3.6" fill="#1B3A8C" opacity="0.38"/><circle cx="552" cy="300" r="2.8" fill="#1B3A8C" opacity="0.66"/><circle cx="570" cy="299" r="3.7" fill="#4FA3E3" opacity="0.63"/><circle cx="584" cy="303" r="3.3" fill="#E8EDF5" opacity="0.76"/><circle cx="604" cy="303" r="3.9" fill="#FFFFFF" opacity="0.67"/><circle cx="622" cy="298" r="2.6" fill="#FFFFFF" opacity="0.64"/><circle cx="640" cy="301" r="2.7" fill="#E8EDF5" opacity="0.70"/><circle cx="654" cy="300" r="2.7" fill="#1B3A8C" opacity="0.52"/><circle cx="691" cy="300" r="2.8" fill="#1B3A8C" opacity="0.56"/><circle cx="707" cy="301" r="2.6" fill="#1B3A8C" opacity="0.40"/><circle cx="725" cy="303" r="2.8" fill="#E8EDF5" opacity="0.47"/><circle cx="739" cy="302" r="4.1" fill="#D6202B" opacity="0.70"/><circle cx="774" cy="302" r="3.7" fill="#4FA3E3" opacity="0.65"/><circle cx="804" cy="298" r="4.0" fill="#1B3A8C" opacity="0.72"/><circle cx="821" cy="302" r="2.9" fill="#8CC8F2" opacity="0.73"/><circle cx="842" cy="304" r="3.8" fill="#4FA3E3" opacity="0.65"/><circle cx="856" cy="300" r="3.6" fill="#1B3A8C" opacity="0.71"/><circle cx="875" cy="301" r="3.0" fill="#8CC8F2" opacity="0.61"/><circle cx="891" cy="304" r="3.7" fill="#8CC8F2" opacity="0.62"/><circle cx="911" cy="298" r="2.8" fill="#8CC8F2" opacity="0.49"/><circle cx="942" cy="302" r="4.0" fill="#8CC8F2" opacity="0.55"/><circle cx="961" cy="300" r="2.9" fill="#8CC8F2" opacity="0.69"/><circle cx="979" cy="299" r="4.0" fill="#FFFFFF" opacity="0.42"/><circle cx="997" cy="301" r="3.8" fill="#4FA3E3" opacity="0.51"/><circle cx="1009" cy="303" r="2.9" fill="#8CC8F2" opacity="0.67"/><circle cx="1031" cy="298" r="3.2" fill="#1B3A8C" opacity="0.44"/><circle cx="1044" cy="303" r="3.3" fill="#E8EDF5" opacity="0.59"/><circle cx="1061" cy="300" r="3.4" fill="#D6202B" opacity="0.75"/><circle cx="1079" cy="302" r="2.9" fill="#F2C230" opacity="0.39"/><circle cx="1098" cy="301" r="3.2" fill="#8CC8F2" opacity="0.58"/><circle cx="1111" cy="304" r="3.2" fill="#E8EDF5" opacity="0.52"/><circle cx="1130" cy="300" r="2.6" fill="#D6202B" opacity="0.58"/><circle cx="1144" cy="304" r="4.0" fill="#4FA3E3" opacity="0.61"/><circle cx="1180" cy="301" r="3.5" fill="#FFFFFF" opacity="0.78"/><circle cx="1197" cy="299" r="2.9" fill="#E8EDF5" opacity="0.36"/><circle cx="1212" cy="302" r="3.4" fill="#8CC8F2" opacity="0.76"/><circle cx="1229" cy="300" r="2.8" fill="#E8EDF5" opacity="0.47"/><circle cx="1249" cy="304" r="3.7" fill="#4FA3E3" opacity="0.43"/><circle cx="1268" cy="299" r="3.8" fill="#F2C230" opacity="0.37"/><circle cx="1282" cy="303" r="4.0" fill="#8CC8F2" opacity="0.76"/><circle cx="1299" cy="302" r="3.8" fill="#4FA3E3" opacity="0.38"/><circle cx="1315" cy="304" r="3.7" fill="#D6202B" opacity="0.62"/><circle cx="1334" cy="301" r="3.2" fill="#4FA3E3" opacity="0.41"/><circle cx="1351" cy="299" r="2.8" fill="#1B3A8C" opacity="0.75"/><circle cx="1387" cy="303" r="2.7" fill="#FFFFFF" opacity="0.74"/><circle cx="1404" cy="301" r="2.8" fill="#4FA3E3" opacity="0.73"/><circle cx="1420" cy="300" r="3.9" fill="#4FA3E3" opacity="0.40"/><circle cx="1435" cy="302" r="2.9" fill="#4FA3E3" opacity="0.60"/><circle cx="1469" cy="299" r="3.0" fill="#8CC8F2" opacity="0.48"/><circle cx="1489" cy="299" r="3.3" fill="#4FA3E3" opacity="0.40"/><circle cx="1507" cy="303" r="3.7" fill="#F2C230" opacity="0.60"/><circle cx="1523" cy="303" r="4.2" fill="#4FA3E3" opacity="0.80"/><circle cx="1553" cy="303" r="2.7" fill="#1B3A8C" opacity="0.79"/><circle cx="1570" cy="301" r="3.4" fill="#FFFFFF" opacity="0.41"/><circle cx="1606" cy="301" r="4.1" fill="#F2C230" opacity="0.47"/><circle cx="17" cy="316" r="3.6" fill="#8CC8F2" opacity="0.39"/><circle cx="35" cy="317" r="2.9" fill="#FFFFFF" opacity="0.65"/><circle cx="52" cy="317" r="2.6" fill="#1B3A8C" opacity="0.68"/><circle cx="67" cy="315" r="3.9" fill="#D6202B" opacity="0.48"/><circle cx="100" cy="320" r="2.8" fill="#1B3A8C" opacity="0.47"/><circle cx="135" cy="317" r="3.6" fill="#E8EDF5" opacity="0.51"/><circle cx="167" cy="316" r="3.9" fill="#D6202B" opacity="0.70"/><circle cx="189" cy="320" r="3.1" fill="#E8EDF5" opacity="0.78"/><circle cx="204" cy="318" r="3.5" fill="#E8EDF5" opacity="0.46"/><circle cx="219" cy="316" r="3.1" fill="#FFFFFF" opacity="0.72"/><circle cx="235" cy="319" r="2.9" fill="#E8EDF5" opacity="0.73"/><circle cx="256" cy="316" r="3.3" fill="#D6202B" opacity="0.74"/><circle cx="273" cy="316" r="3.4" fill="#FFFFFF" opacity="0.69"/><circle cx="287" cy="320" r="3.5" fill="#F2C230" opacity="0.74"/><circle cx="304" cy="319" r="2.9" fill="#8CC8F2" opacity="0.36"/><circle cx="324" cy="319" r="3.6" fill="#E8EDF5" opacity="0.53"/><circle cx="343" cy="317" r="3.0" fill="#D6202B" opacity="0.67"/><circle cx="359" cy="321" r="3.1" fill="#4FA3E3" opacity="0.73"/><circle cx="371" cy="321" r="4.1" fill="#F2C230" opacity="0.74"/><circle cx="392" cy="316" r="2.9" fill="#D6202B" opacity="0.54"/><circle cx="408" cy="316" r="4.2" fill="#8CC8F2" opacity="0.80"/><circle cx="425" cy="321" r="4.2" fill="#E8EDF5" opacity="0.37"/><circle cx="443" cy="319" r="3.0" fill="#FFFFFF" opacity="0.71"/><circle cx="456" cy="316" r="2.6" fill="#F2C230" opacity="0.78"/><circle cx="475" cy="319" r="2.8" fill="#FFFFFF" opacity="0.78"/><circle cx="508" cy="321" r="3.3" fill="#FFFFFF" opacity="0.41"/><circle cx="526" cy="317" r="3.0" fill="#E8EDF5" opacity="0.68"/><circle cx="543" cy="319" r="3.0" fill="#4FA3E3" opacity="0.44"/><circle cx="562" cy="318" r="3.6" fill="#4FA3E3" opacity="0.72"/><circle cx="575" cy="316" r="3.5" fill="#FFFFFF" opacity="0.53"/><circle cx="598" cy="321" r="3.1" fill="#D6202B" opacity="0.57"/><circle cx="628" cy="316" r="2.7" fill="#8CC8F2" opacity="0.51"/><circle cx="647" cy="320" r="3.2" fill="#8CC8F2" opacity="0.40"/><circle cx="681" cy="317" r="3.2" fill="#1B3A8C" opacity="0.44"/><circle cx="698" cy="320" r="2.8" fill="#8CC8F2" opacity="0.68"/><circle cx="716" cy="320" r="3.7" fill="#1B3A8C" opacity="0.41"/><circle cx="733" cy="320" r="3.5" fill="#4FA3E3" opacity="0.53"/><circle cx="751" cy="320" r="3.0" fill="#FFFFFF" opacity="0.62"/><circle cx="764" cy="318" r="3.8" fill="#D6202B" opacity="0.51"/><circle cx="782" cy="319" r="2.6" fill="#1B3A8C" opacity="0.73"/><circle cx="799" cy="316" r="3.1" fill="#F2C230" opacity="0.55"/><circle cx="815" cy="320" r="3.1" fill="#8CC8F2" opacity="0.62"/><circle cx="831" cy="321" r="4.0" fill="#E8EDF5" opacity="0.36"/><circle cx="866" cy="317" r="3.6" fill="#4FA3E3" opacity="0.58"/><circle cx="884" cy="317" r="3.2" fill="#FFFFFF" opacity="0.65"/><circle cx="901" cy="315" r="3.0" fill="#4FA3E3" opacity="0.52"/><circle cx="917" cy="318" r="4.0" fill="#4FA3E3" opacity="0.57"/><circle cx="935" cy="321" r="3.1" fill="#FFFFFF" opacity="0.69"/><circle cx="950" cy="317" r="2.7" fill="#D6202B" opacity="0.58"/><circle cx="1020" cy="317" r="3.4" fill="#FFFFFF" opacity="0.75"/><circle cx="1036" cy="318" r="2.8" fill="#FFFFFF" opacity="0.80"/><circle cx="1055" cy="317" r="3.9" fill="#D6202B" opacity="0.67"/><circle cx="1087" cy="315" r="2.6" fill="#F2C230" opacity="0.57"/><circle cx="1105" cy="319" r="3.5" fill="#F2C230" opacity="0.61"/><circle cx="1121" cy="316" r="3.8" fill="#E8EDF5" opacity="0.36"/><circle cx="1156" cy="318" r="3.9" fill="#1B3A8C" opacity="0.36"/><circle cx="1175" cy="319" r="3.2" fill="#F2C230" opacity="0.36"/><circle cx="1210" cy="316" r="3.6" fill="#E8EDF5" opacity="0.37"/><circle cx="1226" cy="321" r="3.3" fill="#FFFFFF" opacity="0.46"/><circle cx="1239" cy="319" r="2.9" fill="#E8EDF5" opacity="0.75"/><circle cx="1260" cy="319" r="4.1" fill="#4FA3E3" opacity="0.79"/><circle cx="1272" cy="319" r="3.5" fill="#4FA3E3" opacity="0.49"/><circle cx="1294" cy="320" r="3.0" fill="#F2C230" opacity="0.43"/><circle cx="1308" cy="320" r="3.2" fill="#D6202B" opacity="0.40"/><circle cx="1326" cy="317" r="2.7" fill="#E8EDF5" opacity="0.54"/><circle cx="1345" cy="317" r="3.3" fill="#D6202B" opacity="0.46"/><circle cx="1357" cy="317" r="2.8" fill="#1B3A8C" opacity="0.41"/><circle cx="1375" cy="320" r="3.5" fill="#4FA3E3" opacity="0.73"/><circle cx="1396" cy="317" r="3.8" fill="#4FA3E3" opacity="0.63"/><circle cx="1411" cy="318" r="2.9" fill="#8CC8F2" opacity="0.55"/><circle cx="1426" cy="317" r="4.0" fill="#FFFFFF" opacity="0.80"/><circle cx="1445" cy="318" r="2.8" fill="#8CC8F2" opacity="0.41"/><circle cx="1462" cy="317" r="3.8" fill="#4FA3E3" opacity="0.36"/><circle cx="1480" cy="315" r="3.7" fill="#1B3A8C" opacity="0.43"/><circle cx="1498" cy="319" r="2.8" fill="#FFFFFF" opacity="0.76"/><circle cx="1515" cy="316" r="3.7" fill="#E8EDF5" opacity="0.45"/><circle cx="1528" cy="317" r="3.2" fill="#4FA3E3" opacity="0.70"/><circle cx="1562" cy="315" r="3.7" fill="#1B3A8C" opacity="0.66"/><circle cx="1583" cy="319" r="3.3" fill="#8CC8F2" opacity="0.53"/><circle cx="1600" cy="317" r="3.0" fill="#FFFFFF" opacity="0.68"/><circle cx="9" cy="332" r="2.9" fill="#F2C230" opacity="0.69"/><circle cx="23" cy="335" r="3.6" fill="#F2C230" opacity="0.60"/><circle cx="40" cy="335" r="4.1" fill="#1B3A8C" opacity="0.66"/><circle cx="58" cy="337" r="3.8" fill="#D6202B" opacity="0.76"/><circle cx="78" cy="336" r="4.2" fill="#1B3A8C" opacity="0.40"/><circle cx="95" cy="337" r="3.8" fill="#E8EDF5" opacity="0.54"/><circle cx="128" cy="335" r="3.2" fill="#4FA3E3" opacity="0.55"/><circle cx="143" cy="336" r="3.9" fill="#1B3A8C" opacity="0.55"/><circle cx="158" cy="335" r="3.4" fill="#8CC8F2" opacity="0.41"/><circle cx="180" cy="336" r="3.9" fill="#D6202B" opacity="0.43"/><circle cx="193" cy="333" r="3.0" fill="#E8EDF5" opacity="0.43"/><circle cx="211" cy="336" r="2.8" fill="#1B3A8C" opacity="0.67"/><circle cx="230" cy="333" r="3.4" fill="#4FA3E3" opacity="0.41"/><circle cx="247" cy="333" r="3.7" fill="#FFFFFF" opacity="0.60"/><circle cx="262" cy="335" r="3.8" fill="#F2C230" opacity="0.65"/><circle cx="299" cy="333" r="3.7" fill="#E8EDF5" opacity="0.51"/><circle cx="312" cy="334" r="2.9" fill="#1B3A8C" opacity="0.49"/><circle cx="334" cy="335" r="3.5" fill="#D6202B" opacity="0.43"/><circle cx="345" cy="338" r="3.8" fill="#E8EDF5" opacity="0.69"/><circle cx="364" cy="334" r="3.6" fill="#4FA3E3" opacity="0.57"/><circle cx="384" cy="334" r="2.7" fill="#D6202B" opacity="0.63"/><circle cx="402" cy="334" r="3.0" fill="#F2C230" opacity="0.69"/><circle cx="413" cy="333" r="3.2" fill="#1B3A8C" opacity="0.59"/><circle cx="435" cy="333" r="3.8" fill="#D6202B" opacity="0.68"/><circle cx="449" cy="337" r="3.1" fill="#D6202B" opacity="0.41"/><circle cx="483" cy="333" r="3.9" fill="#8CC8F2" opacity="0.80"/><circle cx="500" cy="333" r="3.3" fill="#1B3A8C" opacity="0.42"/><circle cx="517" cy="332" r="3.7" fill="#F2C230" opacity="0.41"/><circle cx="536" cy="338" r="4.0" fill="#4FA3E3" opacity="0.44"/><circle cx="553" cy="337" r="4.0" fill="#8CC8F2" opacity="0.58"/><circle cx="567" cy="332" r="3.7" fill="#D6202B" opacity="0.38"/><circle cx="601" cy="334" r="2.6" fill="#8CC8F2" opacity="0.60"/><circle cx="619" cy="333" r="3.1" fill="#4FA3E3" opacity="0.54"/><circle cx="637" cy="333" r="3.2" fill="#FFFFFF" opacity="0.63"/><circle cx="656" cy="336" r="3.6" fill="#D6202B" opacity="0.60"/><circle cx="671" cy="336" r="2.8" fill="#8CC8F2" opacity="0.50"/><circle cx="690" cy="333" r="3.7" fill="#4FA3E3" opacity="0.66"/><circle cx="703" cy="335" r="4.1" fill="#D6202B" opacity="0.59"/><circle cx="722" cy="333" r="2.9" fill="#F2C230" opacity="0.60"/><circle cx="755" cy="335" r="3.0" fill="#4FA3E3" opacity="0.45"/><circle cx="773" cy="336" r="3.8" fill="#FFFFFF" opacity="0.61"/><circle cx="792" cy="337" r="2.8" fill="#FFFFFF" opacity="0.60"/><circle cx="808" cy="333" r="4.2" fill="#1B3A8C" opacity="0.58"/><circle cx="824" cy="335" r="4.1" fill="#F2C230" opacity="0.60"/><circle cx="843" cy="337" r="2.7" fill="#F2C230" opacity="0.37"/><circle cx="855" cy="338" r="3.3" fill="#E8EDF5" opacity="0.67"/><circle cx="928" cy="336" r="3.1" fill="#8CC8F2" opacity="0.68"/><circle cx="940" cy="333" r="3.4" fill="#FFFFFF" opacity="0.78"/><circle cx="961" cy="336" r="2.8" fill="#FFFFFF" opacity="0.50"/><circle cx="978" cy="337" r="3.0" fill="#D6202B" opacity="0.44"/><circle cx="1011" cy="332" r="2.8" fill="#8CC8F2" opacity="0.47"/><circle cx="1047" cy="337" r="3.5" fill="#D6202B" opacity="0.59"/><circle cx="1063" cy="338" r="2.6" fill="#D6202B" opacity="0.80"/><circle cx="1079" cy="332" r="3.9" fill="#E8EDF5" opacity="0.43"/><circle cx="1098" cy="334" r="3.4" fill="#F2C230" opacity="0.66"/><circle cx="1113" cy="338" r="3.4" fill="#D6202B" opacity="0.50"/><circle cx="1148" cy="333" r="3.2" fill="#4FA3E3" opacity="0.50"/><circle cx="1180" cy="335" r="3.0" fill="#F2C230" opacity="0.56"/><circle cx="1201" cy="333" r="3.7" fill="#D6202B" opacity="0.52"/><circle cx="1231" cy="336" r="2.8" fill="#1B3A8C" opacity="0.37"/><circle cx="1249" cy="337" r="3.8" fill="#1B3A8C" opacity="0.61"/><circle cx="1264" cy="337" r="3.0" fill="#8CC8F2" opacity="0.77"/><circle cx="1284" cy="337" r="3.8" fill="#FFFFFF" opacity="0.73"/><circle cx="1318" cy="336" r="3.7" fill="#8CC8F2" opacity="0.57"/><circle cx="1333" cy="333" r="3.2" fill="#F2C230" opacity="0.44"/><circle cx="1353" cy="334" r="3.2" fill="#8CC8F2" opacity="0.49"/><circle cx="1366" cy="334" r="3.1" fill="#1B3A8C" opacity="0.61"/><circle cx="1399" cy="338" r="3.5" fill="#D6202B" opacity="0.61"/><circle cx="1422" cy="337" r="3.3" fill="#8CC8F2" opacity="0.76"/><circle cx="1438" cy="333" r="4.0" fill="#FFFFFF" opacity="0.36"/><circle cx="1451" cy="336" r="2.9" fill="#4FA3E3" opacity="0.55"/><circle cx="1472" cy="335" r="2.8" fill="#F2C230" opacity="0.68"/><circle cx="1490" cy="332" r="3.9" fill="#FFFFFF" opacity="0.50"/><circle cx="1502" cy="335" r="4.0" fill="#1B3A8C" opacity="0.50"/><circle cx="1518" cy="337" r="2.6" fill="#4FA3E3" opacity="0.53"/><circle cx="1539" cy="332" r="3.3" fill="#E8EDF5" opacity="0.39"/><circle cx="1556" cy="338" r="3.2" fill="#4FA3E3" opacity="0.74"/><circle cx="1569" cy="336" r="3.1" fill="#4FA3E3" opacity="0.63"/><circle cx="1590" cy="333" r="2.8" fill="#F2C230" opacity="0.59"/><circle cx="1608" cy="334" r="3.2" fill="#1B3A8C" opacity="0.61"/><circle cx="0" cy="353" r="3.1" fill="#1B3A8C" opacity="0.63"/><circle cx="19" cy="349" r="3.6" fill="#1B3A8C" opacity="0.70"/><circle cx="37" cy="351" r="3.4" fill="#D6202B" opacity="0.41"/><circle cx="48" cy="353" r="3.8" fill="#D6202B" opacity="0.42"/><circle cx="69" cy="355" r="4.1" fill="#FFFFFF" opacity="0.41"/><circle cx="82" cy="352" r="2.9" fill="#FFFFFF" opacity="0.51"/><circle cx="100" cy="353" r="4.1" fill="#F2C230" opacity="0.59"/><circle cx="118" cy="352" r="4.0" fill="#F2C230" opacity="0.64"/><circle cx="135" cy="352" r="3.1" fill="#E8EDF5" opacity="0.40"/><circle cx="154" cy="353" r="3.2" fill="#8CC8F2" opacity="0.51"/><circle cx="168" cy="354" r="3.2" fill="#1B3A8C" opacity="0.63"/><circle cx="185" cy="351" r="3.3" fill="#F2C230" opacity="0.51"/><circle cx="203" cy="351" r="4.0" fill="#4FA3E3" opacity="0.45"/><circle cx="221" cy="354" r="4.0" fill="#D6202B" opacity="0.78"/><circle cx="236" cy="350" r="2.6" fill="#8CC8F2" opacity="0.75"/><circle cx="253" cy="353" r="3.3" fill="#FFFFFF" opacity="0.37"/><circle cx="290" cy="354" r="3.3" fill="#4FA3E3" opacity="0.74"/><circle cx="309" cy="349" r="2.8" fill="#E8EDF5" opacity="0.41"/><circle cx="322" cy="351" r="3.8" fill="#4FA3E3" opacity="0.66"/><circle cx="338" cy="355" r="3.7" fill="#D6202B" opacity="0.79"/><circle cx="354" cy="354" r="3.7" fill="#E8EDF5" opacity="0.41"/><circle cx="375" cy="353" r="3.8" fill="#E8EDF5" opacity="0.80"/><circle cx="406" cy="350" r="3.3" fill="#F2C230" opacity="0.45"/><circle cx="425" cy="352" r="4.2" fill="#FFFFFF" opacity="0.51"/><circle cx="458" cy="355" r="4.0" fill="#1B3A8C" opacity="0.38"/><circle cx="477" cy="351" r="4.1" fill="#F2C230" opacity="0.58"/><circle cx="492" cy="351" r="2.6" fill="#1B3A8C" opacity="0.37"/><circle cx="510" cy="351" r="3.3" fill="#8CC8F2" opacity="0.69"/><circle cx="526" cy="352" r="3.2" fill="#F2C230" opacity="0.52"/><circle cx="543" cy="350" r="4.2" fill="#E8EDF5" opacity="0.46"/><circle cx="579" cy="355" r="3.9" fill="#1B3A8C" opacity="0.40"/><circle cx="597" cy="354" r="2.7" fill="#1B3A8C" opacity="0.60"/><circle cx="613" cy="353" r="3.3" fill="#FFFFFF" opacity="0.35"/><circle cx="646" cy="355" r="3.0" fill="#1B3A8C" opacity="0.71"/><circle cx="665" cy="349" r="4.2" fill="#D6202B" opacity="0.63"/><circle cx="681" cy="353" r="3.5" fill="#F2C230" opacity="0.77"/><circle cx="699" cy="354" r="4.0" fill="#D6202B" opacity="0.58"/><circle cx="714" cy="350" r="4.1" fill="#FFFFFF" opacity="0.51"/><circle cx="729" cy="351" r="3.7" fill="#F2C230" opacity="0.72"/><circle cx="748" cy="354" r="4.0" fill="#8CC8F2" opacity="0.76"/><circle cx="764" cy="354" r="3.3" fill="#4FA3E3" opacity="0.42"/><circle cx="781" cy="351" r="3.9" fill="#FFFFFF" opacity="0.49"/><circle cx="800" cy="351" r="3.3" fill="#E8EDF5" opacity="0.55"/><circle cx="816" cy="354" r="2.8" fill="#1B3A8C" opacity="0.41"/><circle cx="833" cy="353" r="3.4" fill="#8CC8F2" opacity="0.52"/><circle cx="847" cy="352" r="2.7" fill="#F2C230" opacity="0.49"/><circle cx="883" cy="352" r="3.4" fill="#4FA3E3" opacity="0.74"/><circle cx="899" cy="354" r="3.6" fill="#D6202B" opacity="0.76"/><circle cx="919" cy="349" r="3.8" fill="#4FA3E3" opacity="0.54"/><circle cx="936" cy="350" r="4.0" fill="#F2C230" opacity="0.77"/><circle cx="970" cy="353" r="3.1" fill="#E8EDF5" opacity="0.39"/><circle cx="986" cy="351" r="4.1" fill="#1B3A8C" opacity="0.69"/><circle cx="1000" cy="352" r="3.3" fill="#8CC8F2" opacity="0.55"/><circle cx="1023" cy="349" r="3.2" fill="#F2C230" opacity="0.58"/><circle cx="1039" cy="353" r="3.2" fill="#E8EDF5" opacity="0.77"/><circle cx="1053" cy="351" r="3.3" fill="#E8EDF5" opacity="0.45"/><circle cx="1068" cy="350" r="2.7" fill="#8CC8F2" opacity="0.45"/><circle cx="1103" cy="354" r="3.5" fill="#1B3A8C" opacity="0.54"/><circle cx="1154" cy="352" r="2.6" fill="#FFFFFF" opacity="0.47"/><circle cx="1172" cy="351" r="4.0" fill="#FFFFFF" opacity="0.53"/><circle cx="1192" cy="351" r="3.0" fill="#4FA3E3" opacity="0.71"/><circle cx="1209" cy="350" r="2.7" fill="#FFFFFF" opacity="0.64"/><circle cx="1227" cy="353" r="2.8" fill="#8CC8F2" opacity="0.50"/><circle cx="1241" cy="353" r="3.8" fill="#E8EDF5" opacity="0.59"/><circle cx="1257" cy="351" r="3.0" fill="#8CC8F2" opacity="0.55"/><circle cx="1273" cy="355" r="3.6" fill="#4FA3E3" opacity="0.77"/><circle cx="1306" cy="353" r="2.7" fill="#8CC8F2" opacity="0.75"/><circle cx="1328" cy="349" r="3.8" fill="#1B3A8C" opacity="0.71"/><circle cx="1343" cy="353" r="3.1" fill="#F2C230" opacity="0.59"/><circle cx="1358" cy="353" r="3.4" fill="#4FA3E3" opacity="0.39"/><circle cx="1393" cy="351" r="4.0" fill="#1B3A8C" opacity="0.54"/><circle cx="1426" cy="352" r="3.8" fill="#8CC8F2" opacity="0.61"/><circle cx="1444" cy="350" r="4.1" fill="#D6202B" opacity="0.60"/><circle cx="1480" cy="355" r="3.1" fill="#F2C230" opacity="0.64"/><circle cx="1494" cy="350" r="3.3" fill="#1B3A8C" opacity="0.43"/><circle cx="1512" cy="349" r="3.2" fill="#1B3A8C" opacity="0.77"/><circle cx="1547" cy="351" r="3.8" fill="#4FA3E3" opacity="0.75"/><circle cx="1566" cy="351" r="3.1" fill="#FFFFFF" opacity="0.59"/><circle cx="1579" cy="351" r="4.0" fill="#8CC8F2" opacity="0.76"/><circle cx="1598" cy="352" r="2.8" fill="#E8EDF5" opacity="0.50"/><circle cx="11" cy="366" r="3.1" fill="#4FA3E3" opacity="0.57"/><circle cx="24" cy="367" r="3.9" fill="#8CC8F2" opacity="0.38"/><circle cx="42" cy="369" r="3.9" fill="#FFFFFF" opacity="0.53"/><circle cx="56" cy="369" r="3.3" fill="#1B3A8C" opacity="0.41"/><circle cx="76" cy="368" r="3.7" fill="#F2C230" opacity="0.51"/><circle cx="94" cy="366" r="3.6" fill="#8CC8F2" opacity="0.57"/><circle cx="108" cy="371" r="2.8" fill="#4FA3E3" opacity="0.47"/><circle cx="127" cy="367" r="3.5" fill="#E8EDF5" opacity="0.58"/><circle cx="143" cy="368" r="2.9" fill="#F2C230" opacity="0.76"/><circle cx="162" cy="367" r="2.8" fill="#E8EDF5" opacity="0.77"/><circle cx="178" cy="369" r="3.7" fill="#F2C230" opacity="0.39"/><circle cx="215" cy="370" r="2.8" fill="#FFFFFF" opacity="0.75"/><circle cx="227" cy="367" r="3.6" fill="#8CC8F2" opacity="0.58"/><circle cx="260" cy="367" r="2.9" fill="#8CC8F2" opacity="0.66"/><circle cx="282" cy="371" r="3.3" fill="#F2C230" opacity="0.35"/><circle cx="300" cy="368" r="2.7" fill="#F2C230" opacity="0.42"/><circle cx="314" cy="371" r="3.8" fill="#F2C230" opacity="0.44"/><circle cx="329" cy="372" r="4.2" fill="#8CC8F2" opacity="0.75"/><circle cx="345" cy="368" r="2.7" fill="#FFFFFF" opacity="0.64"/><circle cx="363" cy="371" r="3.9" fill="#E8EDF5" opacity="0.64"/><circle cx="385" cy="371" r="3.4" fill="#8CC8F2" opacity="0.69"/><circle cx="452" cy="369" r="3.9" fill="#8CC8F2" opacity="0.77"/><circle cx="467" cy="370" r="3.6" fill="#1B3A8C" opacity="0.40"/><circle cx="487" cy="368" r="3.9" fill="#F2C230" opacity="0.46"/><circle cx="502" cy="371" r="3.5" fill="#1B3A8C" opacity="0.75"/><circle cx="515" cy="368" r="3.6" fill="#8CC8F2" opacity="0.77"/><circle cx="537" cy="367" r="3.6" fill="#8CC8F2" opacity="0.71"/><circle cx="569" cy="368" r="3.6" fill="#E8EDF5" opacity="0.75"/><circle cx="586" cy="368" r="2.8" fill="#FFFFFF" opacity="0.45"/><circle cx="621" cy="367" r="3.0" fill="#1B3A8C" opacity="0.75"/><circle cx="636" cy="367" r="2.9" fill="#1B3A8C" opacity="0.37"/><circle cx="656" cy="368" r="4.1" fill="#D6202B" opacity="0.43"/><circle cx="670" cy="371" r="4.1" fill="#D6202B" opacity="0.57"/><circle cx="691" cy="372" r="2.9" fill="#8CC8F2" opacity="0.79"/><circle cx="704" cy="371" r="2.8" fill="#F2C230" opacity="0.55"/><circle cx="724" cy="368" r="2.8" fill="#FFFFFF" opacity="0.68"/><circle cx="741" cy="367" r="3.8" fill="#D6202B" opacity="0.65"/><circle cx="753" cy="369" r="4.1" fill="#D6202B" opacity="0.49"/><circle cx="774" cy="372" r="3.9" fill="#E8EDF5" opacity="0.76"/><circle cx="790" cy="372" r="2.7" fill="#8CC8F2" opacity="0.75"/><circle cx="805" cy="368" r="3.4" fill="#F2C230" opacity="0.68"/><circle cx="825" cy="368" r="2.8" fill="#D6202B" opacity="0.42"/><circle cx="842" cy="366" r="3.2" fill="#1B3A8C" opacity="0.62"/><circle cx="861" cy="367" r="3.8" fill="#E8EDF5" opacity="0.54"/><circle cx="878" cy="371" r="3.7" fill="#4FA3E3" opacity="0.57"/><circle cx="895" cy="371" r="3.1" fill="#8CC8F2" opacity="0.61"/><circle cx="911" cy="368" r="2.8" fill="#FFFFFF" opacity="0.71"/><circle cx="923" cy="369" r="3.7" fill="#E8EDF5" opacity="0.61"/><circle cx="946" cy="368" r="3.7" fill="#D6202B" opacity="0.49"/><circle cx="963" cy="368" r="3.3" fill="#E8EDF5" opacity="0.66"/><circle cx="976" cy="371" r="3.4" fill="#E8EDF5" opacity="0.44"/><circle cx="996" cy="371" r="3.6" fill="#8CC8F2" opacity="0.75"/><circle cx="1008" cy="369" r="3.7" fill="#8CC8F2" opacity="0.65"/><circle cx="1030" cy="368" r="4.1" fill="#FFFFFF" opacity="0.71"/><circle cx="1047" cy="369" r="2.6" fill="#FFFFFF" opacity="0.72"/><circle cx="1062" cy="372" r="3.0" fill="#F2C230" opacity="0.75"/><circle cx="1081" cy="370" r="3.9" fill="#8CC8F2" opacity="0.71"/><circle cx="1094" cy="370" r="4.1" fill="#1B3A8C" opacity="0.68"/><circle cx="1111" cy="371" r="3.9" fill="#8CC8F2" opacity="0.50"/><circle cx="1129" cy="368" r="2.9" fill="#8CC8F2" opacity="0.41"/><circle cx="1148" cy="372" r="3.1" fill="#F2C230" opacity="0.50"/><circle cx="1161" cy="369" r="4.0" fill="#1B3A8C" opacity="0.46"/><circle cx="1181" cy="370" r="3.9" fill="#1B3A8C" opacity="0.70"/><circle cx="1200" cy="370" r="3.8" fill="#FFFFFF" opacity="0.41"/><circle cx="1214" cy="372" r="4.1" fill="#4FA3E3" opacity="0.75"/><circle cx="1230" cy="370" r="3.6" fill="#D6202B" opacity="0.67"/><circle cx="1251" cy="369" r="3.6" fill="#F2C230" opacity="0.49"/><circle cx="1265" cy="371" r="2.7" fill="#E8EDF5" opacity="0.66"/><circle cx="1299" cy="370" r="2.8" fill="#D6202B" opacity="0.58"/><circle cx="1320" cy="370" r="2.7" fill="#FFFFFF" opacity="0.72"/><circle cx="1332" cy="370" r="3.1" fill="#D6202B" opacity="0.59"/><circle cx="1349" cy="371" r="3.1" fill="#8CC8F2" opacity="0.61"/><circle cx="1369" cy="367" r="3.9" fill="#D6202B" opacity="0.54"/><circle cx="1382" cy="370" r="3.5" fill="#4FA3E3" opacity="0.53"/><circle cx="1405" cy="370" r="4.0" fill="#E8EDF5" opacity="0.71"/><circle cx="1422" cy="372" r="2.7" fill="#4FA3E3" opacity="0.61"/><circle cx="1455" cy="367" r="3.6" fill="#E8EDF5" opacity="0.53"/><circle cx="1469" cy="370" r="3.4" fill="#4FA3E3" opacity="0.70"/><circle cx="1489" cy="371" r="2.9" fill="#8CC8F2" opacity="0.67"/><circle cx="1507" cy="372" r="4.1" fill="#1B3A8C" opacity="0.63"/><circle cx="1518" cy="369" r="3.9" fill="#1B3A8C" opacity="0.67"/><circle cx="1539" cy="368" r="2.9" fill="#1B3A8C" opacity="0.49"/><circle cx="1554" cy="370" r="3.7" fill="#4FA3E3" opacity="0.75"/><circle cx="1574" cy="367" r="2.8" fill="#F2C230" opacity="0.51"/><circle cx="1591" cy="366" r="3.1" fill="#D6202B" opacity="0.56"/><circle cx="1608" cy="367" r="3.5" fill="#FFFFFF" opacity="0.53"/><circle cx="-1" cy="389" r="2.9" fill="#D6202B" opacity="0.78"/><circle cx="20" cy="387" r="3.2" fill="#8CC8F2" opacity="0.75"/><circle cx="34" cy="384" r="3.8" fill="#FFFFFF" opacity="0.52"/><circle cx="70" cy="383" r="4.0" fill="#FFFFFF" opacity="0.76"/><circle cx="87" cy="386" r="3.3" fill="#8CC8F2" opacity="0.64"/><circle cx="100" cy="388" r="3.2" fill="#E8EDF5" opacity="0.39"/><circle cx="136" cy="389" r="3.7" fill="#4FA3E3" opacity="0.69"/><circle cx="153" cy="388" r="2.9" fill="#1B3A8C" opacity="0.65"/><circle cx="171" cy="387" r="3.7" fill="#4FA3E3" opacity="0.62"/><circle cx="185" cy="385" r="3.7" fill="#8CC8F2" opacity="0.79"/><circle cx="202" cy="388" r="3.9" fill="#1B3A8C" opacity="0.68"/><circle cx="222" cy="388" r="2.9" fill="#E8EDF5" opacity="0.37"/><circle cx="235" cy="389" r="3.0" fill="#1B3A8C" opacity="0.37"/><circle cx="255" cy="385" r="2.7" fill="#4FA3E3" opacity="0.36"/><circle cx="274" cy="389" r="3.7" fill="#F2C230" opacity="0.41"/><circle cx="289" cy="385" r="3.4" fill="#4FA3E3" opacity="0.76"/><circle cx="340" cy="387" r="3.9" fill="#E8EDF5" opacity="0.67"/><circle cx="358" cy="386" r="3.7" fill="#FFFFFF" opacity="0.69"/><circle cx="393" cy="384" r="3.6" fill="#F2C230" opacity="0.65"/><circle cx="411" cy="384" r="3.4" fill="#1B3A8C" opacity="0.39"/><circle cx="444" cy="385" r="3.1" fill="#8CC8F2" opacity="0.48"/><circle cx="459" cy="385" r="2.9" fill="#E8EDF5" opacity="0.38"/><circle cx="474" cy="387" r="3.4" fill="#4FA3E3" opacity="0.79"/><circle cx="496" cy="384" r="3.8" fill="#8CC8F2" opacity="0.71"/><circle cx="528" cy="387" r="4.0" fill="#4FA3E3" opacity="0.71"/><circle cx="541" cy="385" r="3.0" fill="#F2C230" opacity="0.46"/><circle cx="560" cy="385" r="2.8" fill="#4FA3E3" opacity="0.42"/><circle cx="581" cy="386" r="3.6" fill="#8CC8F2" opacity="0.80"/><circle cx="597" cy="384" r="3.3" fill="#E8EDF5" opacity="0.50"/><circle cx="612" cy="388" r="2.6" fill="#8CC8F2" opacity="0.70"/><circle cx="631" cy="386" r="2.8" fill="#8CC8F2" opacity="0.73"/><circle cx="646" cy="383" r="2.8" fill="#4FA3E3" opacity="0.42"/><circle cx="663" cy="386" r="4.1" fill="#4FA3E3" opacity="0.77"/><circle cx="680" cy="387" r="3.6" fill="#F2C230" opacity="0.48"/><circle cx="699" cy="385" r="3.7" fill="#F2C230" opacity="0.62"/><circle cx="715" cy="389" r="3.1" fill="#4FA3E3" opacity="0.46"/><circle cx="730" cy="387" r="2.9" fill="#D6202B" opacity="0.63"/><circle cx="749" cy="384" r="2.7" fill="#E8EDF5" opacity="0.66"/><circle cx="764" cy="383" r="2.6" fill="#D6202B" opacity="0.38"/><circle cx="782" cy="387" r="3.4" fill="#D6202B" opacity="0.76"/><circle cx="815" cy="387" r="2.9" fill="#1B3A8C" opacity="0.75"/><circle cx="835" cy="385" r="2.9" fill="#4FA3E3" opacity="0.72"/><circle cx="869" cy="385" r="2.6" fill="#F2C230" opacity="0.38"/><circle cx="882" cy="387" r="3.1" fill="#D6202B" opacity="0.43"/><circle cx="899" cy="389" r="3.2" fill="#1B3A8C" opacity="0.39"/><circle cx="919" cy="385" r="3.0" fill="#F2C230" opacity="0.77"/><circle cx="934" cy="384" r="3.2" fill="#1B3A8C" opacity="0.46"/><circle cx="951" cy="384" r="3.0" fill="#8CC8F2" opacity="0.42"/><circle cx="983" cy="388" r="3.8" fill="#8CC8F2" opacity="0.51"/><circle cx="1004" cy="388" r="2.7" fill="#1B3A8C" opacity="0.52"/><circle cx="1019" cy="386" r="3.4" fill="#E8EDF5" opacity="0.56"/><circle cx="1038" cy="384" r="3.4" fill="#F2C230" opacity="0.76"/><circle cx="1054" cy="384" r="3.0" fill="#4FA3E3" opacity="0.56"/><circle cx="1074" cy="383" r="3.0" fill="#1B3A8C" opacity="0.45"/><circle cx="1108" cy="383" r="3.3" fill="#E8EDF5" opacity="0.46"/><circle cx="1137" cy="385" r="4.1" fill="#4FA3E3" opacity="0.70"/><circle cx="1154" cy="387" r="2.8" fill="#D6202B" opacity="0.65"/><circle cx="1172" cy="389" r="3.4" fill="#F2C230" opacity="0.58"/><circle cx="1191" cy="388" r="3.6" fill="#1B3A8C" opacity="0.68"/><circle cx="1207" cy="386" r="3.6" fill="#1B3A8C" opacity="0.51"/><circle cx="1240" cy="388" r="3.7" fill="#1B3A8C" opacity="0.43"/><circle cx="1256" cy="388" r="2.7" fill="#F2C230" opacity="0.73"/><circle cx="1294" cy="385" r="2.9" fill="#E8EDF5" opacity="0.53"/><circle cx="1310" cy="389" r="3.0" fill="#4FA3E3" opacity="0.52"/><circle cx="1328" cy="387" r="2.9" fill="#F2C230" opacity="0.44"/><circle cx="1343" cy="388" r="3.0" fill="#8CC8F2" opacity="0.49"/><circle cx="1359" cy="387" r="2.6" fill="#D6202B" opacity="0.70"/><circle cx="1392" cy="387" r="3.4" fill="#FFFFFF" opacity="0.67"/><circle cx="1409" cy="384" r="4.1" fill="#F2C230" opacity="0.76"/><circle cx="1431" cy="385" r="3.8" fill="#F2C230" opacity="0.46"/><circle cx="1443" cy="386" r="3.3" fill="#FFFFFF" opacity="0.65"/><circle cx="1495" cy="388" r="2.8" fill="#E8EDF5" opacity="0.76"/><circle cx="1510" cy="384" r="2.8" fill="#E8EDF5" opacity="0.59"/><circle cx="1532" cy="387" r="3.4" fill="#E8EDF5" opacity="0.55"/><circle cx="1547" cy="387" r="3.2" fill="#FFFFFF" opacity="0.78"/><circle cx="1562" cy="388" r="3.5" fill="#F2C230" opacity="0.74"/><circle cx="1584" cy="385" r="4.1" fill="#D6202B" opacity="0.65"/><circle cx="1595" cy="387" r="3.4" fill="#1B3A8C" opacity="0.50"/><circle cx="1472" cy="315" r="2.0" fill="#fff" opacity=".95"/><circle cx="1217" cy="389" r="2.8" fill="#fff" opacity=".95"/><circle cx="745" cy="297" r="3.0" fill="#fff" opacity=".95"/><circle cx="1565" cy="263" r="3.0" fill="#fff" opacity=".95"/><circle cx="868" cy="308" r="1.7" fill="#fff" opacity=".95"/><circle cx="1196" cy="304" r="2.6" fill="#fff" opacity=".95"/><circle cx="608" cy="322" r="2.0" fill="#fff" opacity=".95"/><circle cx="1596" cy="343" r="2.8" fill="#fff" opacity=".95"/><circle cx="181" cy="324" r="2.8" fill="#fff" opacity=".95"/><circle cx="986" cy="344" r="2.2" fill="#fff" opacity=".95"/><circle cx="727" cy="298" r="2.3" fill="#fff" opacity=".95"/><circle cx="552" cy="360" r="2.0" fill="#fff" opacity=".95"/><circle cx="1298" cy="351" r="2.5" fill="#fff" opacity=".95"/><circle cx="1250" cy="307" r="1.7" fill="#fff" opacity=".95"/><circle cx="1007" cy="292" r="2.3" fill="#fff" opacity=".95"/><circle cx="326" cy="286" r="2.4" fill="#fff" opacity=".95"/><circle cx="1230" cy="304" r="2.8" fill="#fff" opacity=".95"/><circle cx="1038" cy="274" r="1.6" fill="#fff" opacity=".95"/><circle cx="728" cy="347" r="2.7" fill="#fff" opacity=".95"/><circle cx="73" cy="380" r="2.4" fill="#fff" opacity=".95"/><circle cx="660" cy="331" r="1.5" fill="#fff" opacity=".95"/><circle cx="1277" cy="371" r="1.6" fill="#fff" opacity=".95"/><circle cx="398" cy="275" r="1.8" fill="#fff" opacity=".95"/><circle cx="1441" cy="364" r="1.9" fill="#fff" opacity=".95"/><circle cx="38" cy="262" r="1.6" fill="#fff" opacity=".95"/><circle cx="317" cy="318" r="1.6" fill="#fff" opacity=".95"/><circle cx="558" cy="292" r="2.6" fill="#fff" opacity=".95"/><circle cx="1400" cy="298" r="2.9" fill="#fff" opacity=".95"/><path d="M0 238 Q800 205 1600 238 L1600 405 L0 405 Z" fill="url(#haze)"/><path d="M0 232 Q800 198 1600 232" stroke="#223A72" stroke-width="10" fill="none"/><rect x="0" y="398" width="1600" height="16" fill="#0A1230"/><rect x="0" y="401" width="1600" height="8" fill="#4FA3E3" opacity=".55"/><polygon points="0,414 1600,414 1600,600 0,600" fill="url(#pitch)"/><polygon points="0,414 1600,414 1600,600 0,600" fill="url(#mow)"/><ellipse cx="800" cy="520" rx="330" ry="62" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><line x1="0" y1="520" x2="1600" y2="520" stroke="#fff" stroke-opacity=".0" stroke-width="3"/><line x1="800" y1="414" x2="800" y2="600" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><g><rect x="150" y="30" width="44" height="26" rx="3" fill="#FFF7D6"/><circle cx="172" cy="43" r="120" fill="url(#glow)"/><rect x="1406" y="30" width="44" height="26" rx="3" fill="#FFF7D6"/><circle cx="1428" cy="43" r="120" fill="url(#glow)"/></g></svg>';
var SLIDES=[
  {cls:"s1 stadium",t:"Llegaron las",yr:"26/27",p:"",cta:"Ver las nuevas",nav:"Actual",players:true,kits:["p2","p3","p1"]},
  {cls:"s2",t:"Retro que",yr:"marcó época",p:"Las camisetas de los partidos que todavía te acordás de memoria.",cta:"Ver retro",nav:"Retro",retro:true,kits:["p8","p11","p12"]},
  {cls:"s3",t:"Pagá como",yr:"quieras",p:"",cta:"Ver descuentos",nav:"oferta",pay:true,kits:["p10","p7","p14"]}
];
function renderHome(){
  var c=data.config;
  SLIDES[2].p="Transferí desde tu cuenta bancaria y llevate "+(Number(c.descuentoTransferencia)||0)+"% off.";
  var sl=SLIDES.map(function(s,i){
    var k=s.kits.map(function(id){var p=byId(id);return jersey(p?p.patron:{tipo:"liso",c1:"#fff",c2:"#999"})}).join("");
    var hj=Array.isArray(data.heroJugadores)?data.heroJugadores.filter(function(j){return j&&j.foto}):[];
    var usePlayers=s.players&&hj.length;
    var hp=data.heroPago;
    if(s.pay&&hp&&hp.mp){
      var off=Number(data.config.descuentoTransferencia)||0;
      return '<div class="slide s3 pay" aria-roledescription="slide" aria-label="'+(i+1)+' de '+SLIDES.length+'">'+(hp.fondo?'<div class="retro-bg" style="background-image:url('+hp.fondo+')"></div>':"")+'<div><h2>'+esc(s.t)+'<span class="yr">'+esc(s.yr)+'</span></h2><p>'+esc(s.p)+'</p><button class="btn btn-light" data-nav="'+esc(s.nav)+'">'+esc(s.cta)+'</button></div>'+
        '<div class="pay-stage">'+(off?'<div class="pay-off"><b>'+off+'%</b><span>OFF</span><small>'+offW()+'</small></div>':"")+
        '<div class="pcard pc-mp"><img src="'+esc(hp.mp)+'" alt="Mercado Pago"><span>Mercado Pago</span></div>'+
        '<div class="pcard pc-modo"><img src="'+esc(hp.modo)+'" alt="MODO"></div>'+
        '<div class="pcard pc-uala"><img src="'+esc(hp.uala)+'" alt="Ualá"></div></div></div>';
    }
    var hr=data.heroRetro, useRetro=s.retro&&hr&&hr.foto;
    if(useRetro){
      return '<div class="slide s2 retro" aria-roledescription="slide" aria-label="'+(i+1)+' de '+SLIDES.length+'">'+(hr.fondo?'<div class="retro-bg" style="background-image:url('+hr.fondo+')"></div>':"")+'<div><h2>'+esc(s.t)+'<span class="yr">'+esc(s.yr)+'</span></h2><p>'+esc(s.p)+'</p><button class="btn btn-light" data-nav="'+esc(s.nav)+'">'+esc(s.cta)+'</button></div><div class="retro-shirt'+(hr.foto2?' duo':'')+(hr.foto3?' trio':'')+'">'+'<img class="k1" src="'+esc(hr.foto)+'" alt="'+esc(hr.alt||"")+'">'+(hr.foto3?'<img class="k3" src="'+esc(hr.foto3)+'" alt="'+esc(hr.alt3||"")+'">':"")+(hr.foto2?'<img class="k2" src="'+esc(hr.foto2)+'" alt="'+esc(hr.alt2||"")+'">':"")+'</div></div>';
    }
    var right=usePlayers?'<div class="players"><div class="players-glow"></div>'+playersHTML(hj)+'</div>':'<div class="kits">'+k+'</div>';
    var tags=s.tags?'<div class="tags">'+s.tags.map(function(t){return '<span>'+esc(t)+'</span>'}).join("")+'</div>':"";
    return '<div class="slide '+(usePlayers?s.cls:s.cls.replace(" stadium",""))+'" aria-roledescription="slide" aria-label="'+(i+1)+' de '+SLIDES.length+'">'+(usePlayers?(data.heroFondo?'<div class="stadium-photo" style="background-image:url('+data.heroFondo+')"></div><div class="fx fx-beams"></div><div class="fx fx-sparks"></div><div class="fx fx-fog"></div>':STADIUM):"")+'<div>'+tags+'<h2>'+esc(s.t)+(s.yr?'<span class="yr">'+esc(s.yr)+'</span>':"")+'</h2>'+(s.p?'<p>'+esc(s.p)+'</p>':'<div style="height:22px"></div>')+'<button class="btn btn-light" data-nav="'+esc(s.nav)+'">'+esc(s.cta)+'</button></div>'+right+'<span class="big11" aria-hidden="true">11</span></div>';
  }).join("");
  var dots=SLIDES.map(function(_,i){return '<button data-slide="'+i+'" aria-label="Ir a la imagen '+(i+1)+'" aria-current="'+(i===slide)+'"></button>'}).join("");
  var perks=[
    ['<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="17.5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/>',"Envíos",c.envios||"A todo el país"],
    ['<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="1.8"/>',"Vos elegís","Stock local o camisetas por encargo"],
    ['<rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18" stroke="currentColor" stroke-width="1.8"/>',"Medios de pago","Transferencia, Mercado Pago o efectivo"]
  ].map(function(x){return '<div class="perk"><svg viewBox="0 0 24 24">'+x[0]+'</svg><div><h3>'+esc(x[1])+'</h3><p>'+esc(x[2])+'</p></div></div>'}).join("");
  var tiles=tileList().map(function(t){
    if(t.foto) return '<button class="tile photo" style="background:'+esc(t.color)+'" data-nav="'+esc(t.nav)+'"><img src="'+esc(t.foto)+'" alt="" style="object-position:'+esc(t.pos||"center")+'"><span>'+esc(t.titulo)+'</span></button>';
    return '<button class="tile" style="background:'+esc(t.color)+'" data-nav="'+esc(t.nav)+'"><span>'+esc(t.titulo)+'</span>'+jersey(t.patron)+'</button>';
  }).join("");
  var rowN=0;
  function row(title,k,max,sub){
    var all=data.productos.filter(function(p){return inSection(p,k)}), l=sortList(all).slice(0,max||8);
    if(!l.length) return "";
    rowN++;
    return '<section class="row row-'+esc(k)+'"><div class="row-head"><div><h2>'+esc(title)+'</h2>'+(sub?'<p>'+esc(sub)+'</p>':"")+'</div><button class="see-all" data-nav="'+esc(k)+'">Ver todas <span aria-hidden="true">('+all.length+')</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="grid">'+l.map(card).join("")+'</div></section>';
  }
  app.innerHTML=header()+
    '<section class="hero" aria-roledescription="carrusel" aria-label="Destacados"><div class="slides" style="transform:translateX(-'+(slide*100)+'%)">'+sl+'</div><div class="dots">'+dots+'</div><button class="arrow prev" data-dir="-1" aria-label="Anterior"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="arrow next" data-dir="1" aria-label="Siguiente"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></section>'+
    '<div class="perks">'+perks+'</div>'+
    '<main class="wrap">'+modeIntro()+'<div class="tiles">'+tiles+'</div>'+row("Elegidas de nuestro stock","destacado",4,"Para vivir el fútbol, adentro y afuera de la cancha.")+row("Para los que saben esperar","pedido",4,"Por encargo · Aproximadamente un mes desde la confirmación")+clubInvite()+'</main>'+
    footer()+'<dialog id="dlg"></dialog><dialog id="bagDlg" class="drawer"></dialog><div class="toast" id="toast"></div>';
  setSlide(slide);startTimer();
  var hero=app.querySelector(".hero"), x0=null;
  hero.addEventListener("touchstart",function(e){x0=e.touches[0].clientX},{passive:true});
  hero.addEventListener("touchend",function(e){if(x0==null)return;var dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>45){setSlide((slide+(dx<0?1:-1)+SLIDES.length)%SLIDES.length);startTimer()}});
}
function tileList(){
  var def=[{titulo:"Retro Sudamérica",nav:"Retro",color:"#6B2D1F",patron:{tipo:"banda",c1:"#10245E",c2:"#F2C230"}},{titulo:"Clubes de Europa",nav:"Europa",color:"#0F2A5C",patron:{tipo:"bastones",c1:"#004D98",c2:"#A50044"}},{titulo:"Selecciones",nav:"Selecciones",color:"#1E6B45",patron:{tipo:"bastones",c1:"#FFFFFF",c2:"#7CC0F0"}}];
  if(!Array.isArray(data.tiles)) data.tiles=clone(def);
  return data.tiles.map(function(t,i){var d=def[i]||def[0];if(!t.patron)t.patron=d.patron;return t});
}
function playersHTML(list){
 var positions=[["38%","-1%",1],["42%","20%",3],["43%","46%",4],["32%","70%",5]];
 return list.slice(0,4).map(function(j,i){var p=positions[i];return '<img src="'+esc(j.foto)+'" alt="'+esc(j.alt||"")+'" style="--w:'+p[0]+';--x:'+p[1]+';--z:'+p[2]+';--d:'+(i*.08)+'s">'}).join("");
}
function startTimer(){
 clearInterval(timer); timer=null;
 if(view!=="home"||document.hidden||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 timer=setInterval(function(){setSlide((slide+1)%SLIDES.length)},10000);
}
function setSlide(i){
  slide=i; var s=app.querySelector(".slides"); if(!s) return;
  app.querySelector(".hero").dataset.activeSlide=String(i);
  s.style.transform="translateX(-"+(i*100)+"%)";
  app.querySelectorAll(".slide").forEach(function(el,n){el.inert=n!==i;el.setAttribute("aria-hidden",String(n!==i))});
  app.querySelectorAll("[data-slide]").forEach(function(d){d.setAttribute("aria-current",String(+d.dataset.slide===i))});
}

/* ---------- Catálogo ---------- */
function catalogMatches(p){
 return inSection(p,sec)&&matchesQuery(p)&&(!filt.categoria||p.categoria===filt.categoria)&&(!filt.epoca||p.epoca===filt.epoca)&&(!filt.talle||capacity(p,filt.talle)>0)&&(!filt.nuevo||p.nuevo)&&(!filt.oferta||onSale(p));
}
function refreshCatalog(){
 var active=document.activeElement, key=active&&active.dataset.filter, id=active&&active.id;
 renderCatalog();var el=key?app.querySelector('[data-filter="'+key+'"]'):id?document.getElementById(id):null;if(el)el.focus({preventScroll:true});
}
function renderCatalog(){
 clearInterval(timer);
 var l=sortList(data.productos.filter(catalogMatches));
 function select(key,title,values){return '<label class="filter-field"><span>'+title+'</span><select data-filter="'+key+'">'+[''].concat(values).map(function(v){return '<option value="'+esc(v)+'" '+(filt[key]===v?'selected':'')+'>'+(v||'Todos')+'</option>'}).join('')+'</select></label>'}
 var labels={q:'Búsqueda',categoria:'Categoría',epoca:'Época',talle:'Talle',nuevo:'Novedades',oferta:'Descuentos',orden:'Orden'};
 var tags=Object.keys(labels).filter(function(k){return k==='orden'?filt[k]!=='rel':!!filt[k]}).map(function(k){var value=filt[k]===true?'':': '+(k==='orden'?(filt[k]==='precio-asc'?'Menor precio':'Mayor precio'):filt[k]);return '<button class="filter-tag" data-remove-filter="'+k+'" aria-label="Quitar filtro '+esc(labels[k]+value)+'">'+esc(labels[k]+value)+' <span aria-hidden="true">×</span></button>'}).join('');
 app.innerHTML=header()+'<main class="wrap">'+catalogIntro()+'<div class="cat-head"><h2>'+(sec==='pedido'?'Catálogo por pedido':sec==='stock'?'Camisetas en stock':sec==='destacado'?'Nuestra selección':'Todas las camisetas')+'</h2><div class="cat-tools"><span class="catalog-count" aria-live="polite">'+l.length+(l.length===1?' modelo':' modelos')+'</span><select class="sort" id="sort" aria-label="Ordenar"><option value="rel" '+(filt.orden==='rel'?'selected':'')+'>Destacadas</option><option value="precio-asc" '+(filt.orden==='precio-asc'?'selected':'')+'>Menor precio</option><option value="precio-desc" '+(filt.orden==='precio-desc'?'selected':'')+'>Mayor precio</option></select></div></div>'+
 '<details class="filter-panel" '+(filtersOpen?'open':'')+'><summary>Filtrar camisetas</summary><div class="filter-controls">'+select('categoria','Categoría',CATS)+select('epoca','Época',EPOCAS)+select('talle','Talle',SIZES)+'</div></details>'+
 '<div class="active-filters">'+tags+'<button class="linkish" id="clear">Limpiar filtros</button></div>'+
 (l.length?'<div class="grid">'+l.map(card).join('')+'</div>':'<div class="empty">No hay modelos con esos filtros.<br>Probá quitar alguno o ver todas las camisetas.</div>')+(sec==='pedido'?requestShirt():'')+'</main>'+footer()+'<dialog id="dlg"></dialog><dialog id="bagDlg" class="drawer"></dialog><div class="toast" id="toast" role="status"></div>';
 app.querySelector('.filter-panel').addEventListener('toggle',function(e){filtersOpen=e.target.open});
}

function openDetail(id){
  var p=byId(id); if(!p) return;
  var dlg=document.getElementById("dlg"), sel=null, qty=1, persOpen=false, pers={nombre:"",numero:""};
  function persOn(){return persOpen&&isPre(p)&&!!(pers.nombre||pers.numero)}
  function addLabel(maxQ){return 'Agregar al pedido'+(sel&&maxQ?' · '+money((p.precio+(persOn()?persPrice():0))*qty):"")}
  function extras(){if(!isPre(p))return "";if(!persOpen)return '<button type="button" class="add-extras" id="persToggle" aria-expanded="false"><span class="ae-plus" aria-hidden="true">+</span><span><b>Agregar adicionales</b><small>Nombre y número en la espalda</small></span></button>';
    return '<div class="extras" role="group" aria-label="Adicionales"><div class="extras-head"><b>Nombre y número</b><span>+ '+money(persPrice())+'</span></div><div class="extras-fields"><label class="cf"><span>Nombre</span><input id="persNombre" maxlength="12" autocomplete="off" autocapitalize="characters" placeholder="Ej: MESSI" value="'+esc(pers.nombre)+'"></label><label class="cf ef-num"><span>Número</span><input id="persNumero" inputmode="numeric" maxlength="2" autocomplete="off" placeholder="10" value="'+esc(pers.numero)+'"></label></div><p class="hint">Podés poner solo el nombre, solo el número o los dos. Las camisetas personalizadas no tienen cambio ni devolución, salvo falla.</p><button type="button" class="linkish" id="persRemove">Quitar adicionales</button></div>'}
  SIZES.some(function(s){if(capacity(p,s)>0&&SIZES.filter(function(x){return capacity(p,x)>0}).length===1){sel=s;return true}});
  function draw(){
    var t=available(p), n=waNumber();
    var btns=SIZES.map(function(s){var k=capacity(p,s)||0;return '<button data-s="'+s+'" aria-pressed="'+(sel===s)+'" '+(k?"":"disabled")+'>'+s+'</button>'}).join("");
    var left=sel?capacity(p,sel)||0:0;
    var inCart=sel?cart.filter(function(l){return l.id===p.id&&l.talle===sel}).reduce(function(a,l){return a+l.cant},0):0;
    var maxQ=Math.max(0,left-inCart); if(qty>maxQ) qty=Math.max(1,maxQ);
    var stepper=sel?'<div class="qty-pick"><span class="hint">Cantidad</span><div class="stepper"><button data-qd="-1" aria-label="Una menos" '+(qty<=1||!maxQ?"disabled":"")+'>−</button><output aria-live="polite">'+(maxQ?qty:0)+'</output><button data-qd="1" aria-label="Una más" '+(qty>=maxQ?"disabled":"")+'>+</button></div>'+(inCart?'<span class="hint">Ya tenés '+inCart+' en tu pedido</span>':"")+'</div>':"";
    var note=isPre(p)?(sel?"Talle a confirmar con el proveedor. Máximo 5 unidades por talle en esta solicitud.":"Elegí el talle que querés consultar."):t===0?"":(sel?(!maxQ?"Ya agregaste todas las que hay en talle "+sel+".":(left<=2?"Quedan "+left+" en talle "+sel+".":"Hay stock en talle "+sel+".")):"Elegí un talle.");
    var avisar=n?"https://wa.me/"+n+"?text="+encodeURIComponent("Hola! Me avisan cuando vuelva la camiseta de "+p.club+" "+p.titulo+"?"):"#";
    var cuotas=Number(data.config.cuotas)||0;
    dlg.innerHTML='<div class="detail"><div class="art">'+art(p)+'</div><div class="detail-body">'+modeBadge(p)+'<span class="hint">'+esc(p.categoria)+' · '+esc(p.epoca)+'</span><div class="d-title"><h2>'+esc(p.club)+'</h2><button class="fav'+(isFav(p.id)?" on":"")+'" id="favBtn" aria-pressed="'+isFav(p.id)+'" aria-label="'+(isFav(p.id)?"Quitar de favoritos":"Agregar a favoritos")+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.9 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.4 0 5.7 3.3 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3z"/></svg><span>'+(isFav(p.id)?"En favoritos":"Favoritos")+'</span></button></div><p style="margin:0;font-weight:600">'+esc(p.titulo)+'</p><div class="prices">'+(onSale(p)?'<s>'+money(p.precioAnterior)+'</s>':"")+'<strong>'+money(p.precio)+'</strong></div><span class="transfer">'+money(transfer(p.precio))+' '+offW()+'</span>'+(cuotas>1?'<span class="hint">o '+cuotas+' cuotas de '+money(p.precio/cuotas)+'</span>':"")+
      '<div><p class="hint" style="margin-bottom:8px">Talle</p><div class="pick">'+btns+'</div></div>'+stepper+(note?'<p class="hint">'+note+'</p>':"")+extras()+
      (t?'<button class="btn btn-ink" id="addBag" '+(sel&&maxQ?"":"disabled")+'>'+addLabel(maxQ)+'</button>':'<button class="btn btn-nostock" disabled>Sin stock</button><button class="btn btn-notify" id="notifyBtn">¿Querés que te avise cuando haya stock?</button>')+
      ""+
      deliveryInfo(p)+'<p class="hint legal-mini">Tenés 10 días desde que la recibís para arrepentirte de la compra, y garantía por falla. <button class="inline-link" data-legal="cambios">Cambios y devoluciones</button></p>'+
      shipBlock()+'</div></div><button class="close" aria-label="Cerrar">×</button>';
  }
  dlg.onclick=function(e){
    if(e.target===dlg||e.target.closest(".close")){dlg.close();return}
    var b=e.target.closest("[data-s]"); if(b&&!b.disabled){if(sel!==b.dataset.s){sel=b.dataset.s;qty=1}draw();return}
    if(e.target.closest("#favBtn")){var wasIn=!!me();toggleFav(p.id,function(){draw();if(view==="account")renderAccount()});if(!wasIn)dlg.close();return}
    var q=e.target.closest("[data-qd]"); if(q&&!q.disabled){qty+=Number(q.dataset.qd);draw();return}
    if(e.target.closest("#persToggle")){persOpen=true;draw();var pn=dlg.querySelector("#persNombre");if(pn)pn.focus();return}
    if(e.target.closest("#persRemove")){persOpen=false;pers={nombre:"",numero:""};draw();var pt=dlg.querySelector("#persToggle");if(pt)pt.focus();return}
    if(e.target.closest("#addBag")&&sel){addToCart(p.id,sel,qty,persOn()?pers:null);dlg.close();return}
    if(e.target.closest("#notifyBtn")){openNotify(p);return}
    if(e.target.closest("#shipCalc")){var inp=dlg.querySelector("#shipIn");shipCp=(inp?inp.value:"").trim();try{localStorage.setItem("laonce-cp",shipCp)}catch(_){}draw();return}
    if(e.target.closest("#shipChange")){shipCp="";draw();var i2=dlg.querySelector("#shipIn");if(i2)i2.focus();return}
  };
  dlg.onkeydown=function(e){if(e.key==="Enter"&&e.target.id==="shipIn"){e.preventDefault();dlg.querySelector("#shipCalc").click()}};
  dlg.oninput=function(e){var t=e.target;if(t.id!=="persNombre"&&t.id!=="persNumero")return;
    if(t.id==="persNombre"){var v=t.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ .'-]/g,"").slice(0,12);if(v!==t.value)t.value=v;pers.nombre=v.trim()}
    else{var u=t.value.replace(/\D/g,"").slice(0,2);if(u!==t.value)t.value=u;pers.numero=u}
    var b=dlg.querySelector("#addBag");if(b){var left=sel?capacity(p,sel)||0:0,inCart=sel?cart.filter(function(l){return l.id===p.id&&l.talle===sel}).reduce(function(a,l){return a+l.cant},0):0;b.textContent=addLabel(Math.max(0,left-inCart))}};
  draw(); dlg.showModal();
}



/* ---------- Aviso de stock ---------- */
/* Avisos de stock: se envían a la dirección configurada en el panel (Formspree, Google Apps Script o el servidor propio).
   Sin dirección configurada, se abre el email o WhatsApp del negocio; si no hay ninguno, queda guardado en este navegador. */
/* ---------- Planilla de Google: productos (lectura) y pedidos/avisos (Apps Script) ---------- */
function sheetId(){var v=String(data.config.planilla||"").trim(),m=v.match(/\/d\/([a-zA-Z0-9_-]{20,})/);return m?m[1]:(/^[a-zA-Z0-9_-]{20,}$/.test(v)?v:"")}
function sheetApp(){var v=String(data.config.planillaApp||"").trim();return /^https:\/\/script\.google(usercontent)?\.com\//.test(v)?v:""}
function sendSheet(info){var u=sheetApp();if(!u)return Promise.resolve(false);return fetch(u,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(info)}).then(function(){return true})}
function sheetBool(v,def){if(v==null||v==="")return def;return !/^(no|n|false|0)$/i.test(String(v).trim())}
function applySheet(rows){
  var SZ=["S","M","L","XL","XXL"],seen={},changed=false;
  rows.forEach(function(r){
    var id=String(r.id||"").trim();if(!/^[a-zA-Z0-9_-]{1,70}$/.test(id)||seen[id])return;seen[id]=1;
    var pre=String(r.modalidad||"").trim().toLowerCase()==="pedido",p=byId(id),isNew=!p;
    if(isNew){p={id:id,club:"",titulo:"",categoria:"Sudamérica",epoca:"Actual",precio:0,precioAnterior:0,patron:{tipo:"liso",c1:"#FFFFFF",c2:"#0F2A5C"},foto:null,stock:{S:0,M:0,L:0,XL:0,XXL:0},destacado:false,nuevo:false,modalidad:"stock"}}
    if(r.club)p.club=String(r.club).slice(0,100);if(r.titulo)p.titulo=String(r.titulo).slice(0,140);
    if(CATS.indexOf(r.categoria)>=0)p.categoria=r.categoria;if(EPOCAS.indexOf(r.epoca)>=0)p.epoca=r.epoca;
    var pr=Math.round(Number(r.precio));if(pr>0)p.precio=pr;p.precioAnterior=Math.max(0,Math.round(Number(r.precio_anterior)||0));
    p.modalidad=pre?"pedido":"stock";
    if(pre){p.tallesPedido=SZ.filter(function(z){return Number(r[z])>0||/^s[ií]$/i.test(String(r[z]||"").trim())});p.stock={S:0,M:0,L:0,XL:0,XXL:0}}
    else{p.stock={};SZ.forEach(function(z){p.stock[z]=Math.max(0,Math.floor(Number(r[z])||0))});delete p.tallesPedido}
    var f=String(r.foto||"").trim();if(/^https:\/\//i.test(f))p.foto=f;else if(!f&&!(p.foto&&String(p.foto).indexOf("data:")===0))p.foto=null;
    p.destacado=sheetBool(r.destacado,false);p.nuevo=sheetBool(r.nuevo,false);p.activo=sheetBool(r.activo,true);
    if(!p.club||!(p.precio>0))return;
    if(isNew)data.productos.push(p);changed=true;
  });
  if(changed){data.productos=data.productos.filter(function(p){return p.activo!==false})}
  return changed;
}
function loadSheet(){
  var id=sheetId();if(!id||view==="admin")return;
  fetch("https://docs.google.com/spreadsheets/d/"+id+"/gviz/tq?tqx=out:json&headers=1&sheet=Productos",{cache:"no-store"}).then(function(r){return r.text()}).then(function(t){
    var j=JSON.parse(t.slice(t.indexOf("(")+1,t.lastIndexOf(")")));if(!j.table)return;
    var cols=j.table.cols.map(function(c){return String(c.label||"").trim()});
    var rows=(j.table.rows||[]).map(function(row){var o={};(row.c||[]).forEach(function(c,i){o[cols[i]]=c?(c.v!=null?c.v:c.f):null});return o});
    if(applySheet(rows)&&view!=="admin"&&view!=="checkout"){validCart();render()}
  }).catch(function(){});
}
function sendStockAlert(info){
  if(sheetApp())return sendSheet(info);
  var c=data.config, url=String(c.avisosUrl||"").trim();
  if(/^https:\/\//i.test(url)){
    return fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(info)}).then(function(r){if(!r.ok)throw Error("HTTP "+r.status)});
  }
  var txt="Hola! Avisame cuando vuelva a entrar: "+info.producto+". Mi email: "+info.email;
  try{
    if(c.emailContacto)window.open("mailto:"+encodeURIComponent(c.emailContacto)+"?subject="+encodeURIComponent("Aviso de stock: "+info.producto)+"&body="+encodeURIComponent(txt),"_blank");
    else if(waNumber())window.open("https://wa.me/"+waNumber()+"?text="+encodeURIComponent(txt),"_blank","noopener");
  }catch(e){}
  return Promise.resolve();
}
/* Pedidos sin WhatsApp del negocio: se mandan a la dirección de avisos/pedidos o al email del negocio. */
function sendOrder(info,viaWa){
  if(sheetApp()){sendSheet(info).catch(function(){});return}
  if(viaWa)return;
  var c=data.config, url=String(c.avisosUrl||"").trim();
  if(/^https:\/\//i.test(url)){try{fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(info)}).catch(function(){})}catch(e){}return}
  if(c.emailContacto){try{window.open("mailto:"+encodeURIComponent(c.emailContacto)+"?subject="+encodeURIComponent("Nuevo pedido de "+info.nombre)+"&body="+encodeURIComponent(info.detalle),"_blank")}catch(e){}}
}
function openHowTo(){var d=document.getElementById("dlg");if(!d)return;var off=Number(data.config.descuentoTransferencia)||0,free=Number(data.config.envioGratisDesde)||0;
  d.innerHTML='<div class="howto"><button class="close" aria-label="Cerrar">×</button><span class="eyebrow">Cómo comprar</span><h2>Así de simple</h2><ol>'+
  '<li><b>Elegí tu camiseta y el talle.</b> <span>Las <b>en stock</b> salen enseguida. Las <b>por pedido</b> las traemos en ≈ 30 días y podés sumarles nombre y número.</span></li>'+
  '<li><b>Agregala al carrito y finalizá la compra.</b> <span>Completás tus datos y la entrega. No hace falta crear una cuenta.</span></li>'+
  '<li><b>Te escribimos por WhatsApp.</b> <span>Confirmamos disponibilidad y coordinamos el pago'+(off?' (con '+off+'% off '+offW()+')':'')+' y el envío'+(free?' (gratis desde '+money(free)+')':'')+'.</span></li></ol>'+
  '<button class="btn btn-ink" id="howtoGo">Ver camisetas</button></div>';
  d.onclick=function(e){if(e.target===d||e.target.closest(".close")){d.close();return}if(e.target.closest("#howtoGo")){d.close();go("todo")}};d.showModal()}
function openNotify(p){
  var d=document.getElementById("notifyDlg");
  if(!d){d=document.createElement("dialog");d.id="notifyDlg";d.className="notify";document.body.appendChild(d)}
  var nombre=(p.club+" "+p.titulo).toUpperCase(), u=(typeof me==="function")?me():null;
  function form(err,val){
    d.innerHTML='<button class="close" aria-label="Cerrar">×</button><p class="nt-lead">Dejanos tu email y te avisamos cuando vuelva a entrar:</p><h3 class="nt-name">'+esc(nombre)+'</h3>'+
      '<form class="nt-form" novalidate><input type="email" name="email" placeholder="Email" autocomplete="email" value="'+esc(val!=null?val:(u?u.email:""))+'" aria-label="Email"'+(err?' aria-invalid="true"':"")+'>'+(err?'<p class="nt-err">'+esc(err)+'</p>':"")+'<button type="submit" class="nt-send">¿Querés que te avise cuando haya stock?</button></form>';
    var f=d.querySelector("form"), inp=f.querySelector("input"); setTimeout(function(){inp.focus()},30);
    f.onsubmit=function(ev){
      ev.preventDefault();
      var em=inp.value.trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){form(em?"Revisá el email":"Poné tu email",inp.value);return}
      try{var L=JSON.parse(localStorage.getItem("laonce-avisos")||"[]");if(!L.some(function(x){return x.id===p.id&&x.email===em})){L.push({id:p.id,producto:p.club+" "+p.titulo,email:em,fecha:Date.now()});localStorage.setItem("laonce-avisos",JSON.stringify(L))}}catch(_){}
      var btn=f.querySelector(".nt-send");btn.disabled=true;btn.textContent="Enviando…";
      sendStockAlert({tipo:"aviso_stock",email:em,producto:p.club+" "+p.titulo,id:p.id,fecha:new Date().toISOString()}).then(function(){
        d.innerHTML='<button class="close" aria-label="Cerrar">×</button><div class="nt-ok"><div class="nt-check">✓</div><h3>¡Listo!</h3><p>Te vamos a avisar a <b>'+esc(em)+'</b> cuando vuelva a entrar <b>'+esc(p.club+" "+p.titulo)+'</b>.</p><button class="btn btn-ink" id="ntClose">Seguir mirando</button></div>';
      },function(){form("No pudimos registrar tu aviso. Probá de nuevo en un rato.",em)});
    };
  }
  d.onclick=function(e){if(e.target===d||e.target.closest(".close")||e.target.closest("#ntClose"))d.close()};
  form(); if(!d.open) d.showModal();
}

/* ---------- Cálculo aproximado de envío ---------- */
var shipCp=(function(){try{return localStorage.getItem("laonce-cp")||""}catch(e){return ""}})();
function cpZone(raw){
  var v=String(raw||"").toUpperCase().replace(/\s/g,""), m=v.match(/^([A-Z])?(\d{4})/); if(!m) return null;
  var L=m[1]||"", n=+m[2];
  if(L==="C"||(!L&&n>=1000&&n<=1499)) return {z:"CABA",k:1};
  if((L==="B"||!L)&&n>=1500&&n<=1999) return {z:"GBA",k:1.12};
  if("QRUVZ".indexOf(L)>=0||(!L&&n>=8300)) return {z:"Patagonia",k:1.6};
  if(L==="B"||!L) return {z:"Buenos Aires",k:1.25};
  return {z:"Interior",k:1.35};
}
function shipBlock(){
  var T=data.config.envioTarifas||{clasico:8829,expreso:9713,retiro:5816}, zn=shipCp?cpZone(shipCp):null;
  var truck='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/></svg>';
  var pin='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/></svg>';
  if(!zn){
    return '<div class="ship"><div class="ship-h">'+truck+'<span>Medios de envío</span></div><div class="ship-form"><input id="shipIn" inputmode="text" autocomplete="postal-code" placeholder="Tu código postal" value="'+esc(shipCp)+'" aria-label="Código postal"><button class="ship-calc" id="shipCalc">Calcular</button></div>'+(shipCp?'<p class="ship-err">No reconocemos ese código postal. Probá con 4 números, por ejemplo 1424.</p>':"")+'<a class="ship-link" href="https://www.correoargentino.com.ar/formularios/cpa" target="_blank" rel="noopener">No sé mi código postal</a></div>';
  }
  var r=function(x){return zn.k===1?x:Math.round(x*zn.k/10)*10};
  var free=Number(data.config.envioGratisDesde)||0;
  return '<div class="ship done"><div class="ship-top"><span>Entregas para el CP: <b>'+esc(shipCp.toUpperCase())+'</b></span><button class="ship-chg" id="shipChange">Cambiar CP</button></div>'+
    '<div class="ship-h">'+truck+'<span>Envío a domicilio</span></div>'+
    '<div class="ship-opt"><span>Correo Argentino Clásico · Envío a domicilio</span><b>'+money(r(T.clasico))+'</b></div>'+
    '<div class="ship-opt"><span>Correo Argentino Expreso · Envío a domicilio</span><b>'+money(r(T.expreso))+'</b></div>'+
    '<div class="ship-h">'+pin+'<span>Retirar por</span></div>'+
    '<div class="ship-opt"><span>Punto de retiro<small>Direcciones a confirmar</small></span><b>'+money(r(T.retiro))+'</b></div>'+
    '<p class="ship-note">Precios aproximados para '+esc(zn.z)+'. El costo final se confirma al coordinar la entrega.'+(free?' Envío gratis en compras desde '+money(free)+'.':"")+'</p></div>';
}

/* ---------- Pedido ---------- */
/* ---------- Adicionales de encargos: nombre y número ---------- */
function persPrice(){return Math.max(0,Math.round(Number(data.config.precioPersonalizacion)||0))}
function cleanPers(x){if(!x||typeof x!=="object")return null;var n=String(x.nombre||"").toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ .'-]/g,"").replace(/\s+/g," ").trim().slice(0,12),u=String(x.numero==null?"":x.numero).replace(/\D/g,"").slice(0,2);return n||u?{nombre:n,numero:u}:null}
function persKey(l){return l&&l.pers?l.pers.nombre+"|"+l.pers.numero:""}
function linePrice(l){var p=byId(l.id);return (p?Number(p.precio)||0:0)+(l.pers?persPrice():0)}
function persText(x){return x?"Nombre y número: "+[x.nombre,x.numero].filter(Boolean).join(" · "):""}
function addToCart(id,talle,cant,pers){
  validCart();cant=Math.floor(Number(cant));var product=byId(id);
  if(!product||SIZES.indexOf(talle)<0||!Number.isFinite(cant)||cant<1){toast("Revisá el producto, talle y cantidad");return}
  pers=isPre(product)?cleanPers(pers):null;
  var p=product, key=pers?pers.nombre+"|"+pers.numero:"", l=cart.find(function(x){return x.id===id&&x.talle===talle&&persKey(x)===key}), max=capacity(p,talle)||0;
  var have=cart.filter(function(x){return x.id===id&&x.talle===talle}).reduce(function(a,x){return a+x.cant},0), add=Math.min(cant,max-have);
  if(add<=0){toast("No hay más stock en ese talle");return}
  if(l) l.cant+=add; else cart.push(pers?{id:id,talle:talle,cant:add,pers:pers}:{id:id,talle:talle,cant:add});
  cartNotice="";saveCart(); toast((add>1?add+" agregadas: ":"Agregada: ")+p.club+" talle "+talle+(pers?" con "+[pers.nombre,pers.numero].filter(Boolean).join(" "):""),function(){var d=document.getElementById("dlg");if(d&&d.open)d.close();openBag()});
  updateBadge(true);
}
function validCart(){
 var before=JSON.stringify(cart), clean=[];
 cart.forEach(function(l){
  if(!l||typeof l!=="object")return;
  var p=byId(l.id), n=Number(l.cant);
  if(!p||SIZES.indexOf(l.talle)<0||!Number.isFinite(n)||n<1)return;
  var max=Math.max(0,Math.floor(capacity(p,l.talle)||0));if(!max)return;
  var pz=isPre(p)?cleanPers(l.pers):null, key=pz?pz.nombre+"|"+pz.numero:"";
  var found=clean.find(function(x){return x.id===l.id&&x.talle===l.talle&&persKey(x)===key});
  if(found)found.cant=Math.min(max,found.cant+Math.floor(n));
  else{var nl={id:l.id,talle:l.talle,cant:Math.min(max,Math.floor(n))};if(pz)nl.pers=pz;clean.push(nl)}
 });
 cart=clean;saveCart();var changed=before!==JSON.stringify(cart);
 if(changed)cartNotice="Actualizamos tu carrito porque cambió la disponibilidad de algún producto.";
 updateBadge(false);return changed;
}
function cartAlert(){return cartNotice?'<p class="cart-adjustment" role="status">'+esc(cartNotice)+'</p>':""}

function openBag(){
  validCart();
  var dlg=document.getElementById("bagDlg");
  function draw(){
    var sum=0, lines=cart.map(function(l,i){var p=byId(l.id);sum+=linePrice(l)*l.cant;
      return '<div class="line"><div class="art">'+art(p)+'</div><div><strong>'+esc(p.club)+'</strong><div class="hint">'+esc(p.titulo)+' · '+(isPre(p)?'Por pedido ≈ 30 días':'En stock')+' · Talle '+esc(l.talle)+(l.pers?' · '+esc(persText(l.pers)):'')+'</div><div class="qty"><button data-bq="'+i+'" data-d="-1" aria-label="Una menos" '+(l.cant<=1?"disabled":"")+'>−</button><span class="hint">'+l.cant+'</span><button data-bq="'+i+'" data-d="1" aria-label="Una más" '+(l.cant>=capacity(p,l.talle)?"disabled":"")+'>+</button><button class="linkish rm" data-rm="'+i+'">Quitar</button></div></div><strong>'+money(linePrice(l)*l.cant)+'</strong></div>'}).join("");
    var n=waNumber(), free=Number(data.config.envioGratisDesde)||0, pz=prizeCalc(), pd=pz?pz.disc:0, payT=pz&&pz.stack?transfer(sum)-pd:sum-Math.max(pd,sum-transfer(sum));
    var msg="Hola! Quiero hacer este pedido:\n"+cart.map(function(l){var p=byId(l.id);return "• "+l.cant+" x "+p.club+" "+p.titulo+" ["+(isPre(p)?"POR PEDIDO ≈ 30 días":"EN STOCK")+"] (talle "+l.talle+(l.pers?", "+persText(l.pers):"")+") "+money(linePrice(l)*l.cant)}).join("\n")+(pd?"\nPremio ruleta "+prizeLabel(pz)+" (código "+pz.r.code+"): -"+money(pd):pz&&pz.envio?"\nPremio ruleta: envío gratis (código "+pz.r.code+")":pz&&pz.mystery?"\nPremio ruleta: Mystery Box de regalo (código "+pz.r.code+")":"")+"\nTotal: "+money(sum-pd)+" ("+money(payT)+" por transferencia)";
    var href=n?"https://wa.me/"+n+"?text="+encodeURIComponent(msg):"#";
    dlg.innerHTML='<div class="drawer-head"><h2>Mi pedido</h2><button class="close" style="position:static" aria-label="Cerrar">×</button></div><div class="drawer-body">'+cartAlert()+(cart.length?cartDelivery():'')+(cart.length?lines:'<div class="empty" style="margin-top:20px">Todavía no agregaste camisetas.<br><br><button class="btn btn-ink" id="backShop">Volver a la tienda</button></div>')+'</div>'+
      (cart.length?'<div class="drawer-foot">'+(pd?'<div class="prize-row"><span>Premio ruleta · '+esc(prizeLabel(pz))+'</span><span>−'+money(pd)+'</span></div>':'')+'<div class="tot"><span>Total</span><span>'+money(sum-pd)+'</span></div><span class="transfer">'+money(payT)+' '+offW()+'</span>'+(pz&&pz.mystery?'<span class="hint">Tu Mystery Box de regalo se suma a este pedido.</span>':'')+(pz&&!pd&&!pz.envio&&!pz.mystery?'<span class="hint">Tu premio de la ruleta vale para camisetas en stock.</span>':'')+(pz&&pz.envio?'<span class="hint">Tenés envío gratis por el premio de la ruleta.</span>':free>0?'<span class="hint">'+(sum>=free?"Tenés envío gratis.":"Te faltan "+money(free-sum)+" para el envío gratis.")+'</span>':"")+'<button class="btn btn-ink btn-checkout" id="goCheckout">Finalizar compra</button><p class="hint">Podés comprar sin crear una cuenta.</p>'+'</div>':"");
  }
  dlg.onclick=function(e){
    if(e.target===dlg||e.target.closest(".close")||e.target.closest("#backShop")){dlg.close();render();return}
    var qb=e.target.closest("[data-bq]");if(qb&&!qb.disabled){cart[+qb.dataset.bq].cant+=Number(qb.dataset.d);validCart();updateBadge(false);draw();return}
    var b=e.target.closest("[data-rm]");
    if(b){cart.splice(+b.dataset.rm,1);saveCart();updateBadge(false);draw();return}
    var nv=e.target.closest("[data-nav]"); if(nv){dlg.close();go(nv.dataset.nav);return}
    if(e.target.closest("#goCheckout")){dlg.close();startCheckout();return}
    if(e.target.closest("#bagLogin")){dlg.close();openAuth("login",function(){render();openBag()})}
  };
  draw(); dlg.showModal();
}
function updateBadge(anim){
  var btn=document.getElementById("openBag"); if(!btn) return;
  var n=cart.reduce(function(a,x){return a+x.cant},0), i=btn.querySelector("i");
  if(!n){ if(i) i.remove(); btn.setAttribute("aria-label","Carrito, vacío"); return; }
  if(!i){ i=document.createElement("i"); btn.appendChild(i); }
  i.textContent=n; btn.setAttribute("aria-label","Carrito, "+n+(n===1?" camiseta":" camisetas"));
  if(anim){ i.classList.remove("bump"); void i.offsetWidth; i.classList.add("bump"); }
}
var tt=null;
function toast(t,onTap){
  var el=document.getElementById("toast");if(!el)return;
  var tap=!!onTap&&matchMedia("(max-width:720px)").matches;
  el.textContent=t;el.onclick=null;el.classList.toggle("tap",tap);el.removeAttribute("tabindex");
  if(el.getAttribute("role")==="button")el.setAttribute("role","status");
  if(tap){var go=document.createElement("span");go.className="toast-go";go.textContent="Ver carrito ›";el.appendChild(go);el.setAttribute("role","button");el.setAttribute("tabindex","0");el.setAttribute("aria-label",t+". Tocá para ver el carrito");
    el.onclick=function(){clearTimeout(tt);el.classList.remove("show","tap");el.onclick=null;onTap()};
    el.onkeydown=function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();el.onclick&&el.onclick()}}}
  else el.removeAttribute("aria-label");
  el.classList.add("show");clearTimeout(tt);tt=setTimeout(function(){el.classList.remove("show","tap");el.onclick=null},tap?3800:2200);
}

/* ---------- Panel de socios ---------- */
function renderAdmin(){
  clearInterval(timer);
  var c=data.config;
  var rows=data.productos.map(function(p,i){
    var st=isPre(p)?'<div class="hint">Por encargo, sin stock local</div>'+SIZES.map(function(s){return '<label style="display:inline-block;margin:3px"><input type="checkbox" data-pre-size="'+i+'" value="'+s+'" '+((p.tallesPedido||[]).includes(s)?'checked':'')+'> '+s+'</label>'}).join(''):SIZES.map(function(s){var n=Number(p.stock[s])||0;return '<label>'+s+'<input type="number" min="0" inputmode="numeric" class="'+(n?"":"zero")+'" data-i="'+i+'" data-k="stock.'+s+'" value="'+n+'"></label>'}).join("");
    var cats=CATS.map(function(k){return '<option '+(p.categoria===k?"selected":"")+'>'+k+'</option>'}).join("");
    var eps=EPOCAS.map(function(k){return '<option '+(p.epoca===k?"selected":"")+'>'+k+'</option>'}).join("");
    var pats=Object.keys(PATTERNS).map(function(k){return '<option value="'+k+'" '+((p.patron||{}).tipo===k?"selected":"")+'>'+PATTERNS[k]+'</option>'}).join("");
    return '<tr><td><label class="thumb" title="Cambiar foto">'+art(p)+'<input type="file" accept="image/*" hidden data-photo="'+i+'"></label>'+(p.foto?'<button class="linkish" style="font-size:12px" data-nophoto="'+i+'">Quitar</button>':"")+'</td>'+
      '<td><select aria-label="Modalidad" data-i="'+i+'" data-k="modalidad"><option value="stock" '+(!isPre(p)?'selected':'')+'>En stock</option><option value="pedido" '+(isPre(p)?'selected':'')+'>Por pedido</option></select>'+(p.fuente?'<a class="source-ref" href="'+esc(p.fuente)+'" target="_blank" rel="noopener">Ficha del proveedor ↗</a>':'')+'<input class="w-title" data-i="'+i+'" data-k="club" value="'+esc(p.club)+'" aria-label="Club"><input class="w-title" style="margin-top:4px" data-i="'+i+'" data-k="titulo" value="'+esc(p.titulo)+'" aria-label="Modelo"></td>'+
      '<td><select data-i="'+i+'" data-k="categoria" aria-label="Categoría">'+cats+'</select><select style="margin-top:4px;display:block" data-i="'+i+'" data-k="epoca" aria-label="Época">'+eps+'</select></td>'+
      '<td><input class="w-price" type="number" min="0" step="500" data-i="'+i+'" data-k="precio" value="'+Number(p.precio)+'" aria-label="Precio"><input class="w-price" style="margin-top:4px" type="number" min="0" step="500" data-i="'+i+'" data-k="precioAnterior" value="'+(Number(p.precioAnterior)||0)+'" aria-label="Precio anterior" title="Precio tachado (0 = sin oferta)"></td>'+
      '<td><div class="stock">'+st+'</div></td>'+
      '<td><select data-i="'+i+'" data-k="patron.tipo" aria-label="Dibujo">'+pats+'</select><div style="display:flex;gap:4px;margin-top:4px"><input type="color" data-i="'+i+'" data-k="patron.c1" value="'+esc(p.patron.c1)+'" aria-label="Color 1"><input type="color" data-i="'+i+'" data-k="patron.c2" value="'+esc(p.patron.c2)+'" aria-label="Color 2"></div></td>'+
      '<td>'+(isPre(p)?'<label class="toggle"><input type="checkbox" data-i="'+i+'" data-k="activo" '+(p.activo!==false?'checked':'')+'> Publicar encargo</label>':'')+'<label class="toggle" style="font-size:14px"><input type="checkbox" data-i="'+i+'" data-k="nuevo" '+(p.nuevo?"checked":"")+'> Nuevo</label><label class="toggle" style="font-size:14px"><input type="checkbox" data-i="'+i+'" data-k="destacado" '+(p.destacado?"checked":"")+'> Destacada</label></td>'+
      '<td><button class="btn btn-danger" style="padding:6px 12px;font-size:14px" data-del="'+i+'">Borrar</button></td></tr>';
  }).join("");
  var units=data.productos.reduce(function(a,p){return a+total(p)},0);
  function f(label,key,type,extra){return '<label class="f">'+label+'<input '+(type?'type="'+type+'"':"")+' data-c="'+key+'" value="'+esc(c[key])+'" '+(extra||"")+'></label>'}
  app.innerHTML='<main class="wrap">'+
   '<div class="admin-head"><div><button class="linkish" data-nav="inicio">← Volver a la tienda</button><h1>Panel de socios</h1><p class="hint">'+data.productos.length+' modelos · '+units+' camisetas en stock</p></div><button class="btn btn-ink" id="add">Agregar camiseta</button></div>'+
   (adminMsg?'<div class="msg '+adminMsg.kind+'">'+esc(adminMsg.text)+'</div>':'<div class="msg info">Editá el catálogo y descargá una copia HTML para conservar los cambios. La descarga no publica la tienda.</div>')+
   '<section class="panel"><h3>Datos del negocio</h3><div class="fields">'+
     f("Nombre","nombre")+f("WhatsApp del negocio, donde llegan los pedidos (ej. 5491122334455)","whatsapp","","inputmode=\"tel\" placeholder=\"54911…\"")+f("Instagram (sin @)","instagram","","placeholder=\"laonce.camisetas\"")+
     f("% descuento por transferencia","descuentoTransferencia","number","min=\"0\" max=\"50\"")+f("Nombre y número en encargos ($ extra por camiseta)","precioPersonalizacion","number","min=\"0\" step=\"500\"")+f("Envío gratis desde ($, 0 = no)","envioGratisDesde","number","min=\"0\" step=\"1000\"")+f("Cuotas sin interés (0 = no)","cuotas","number","min=\"0\" max=\"12\"")+
     f("Envíos","envios")+f("Retiro / zona","zona")+
   '</div></section><section class="panel"><h3>Datos legales (se muestran al pie de la página)</h3><div class="fields">'+
     f("Razón social o nombre del titular","razonSocial")+f("CUIT","cuit","","inputmode=\"numeric\" placeholder=\"20-12345678-9\"")+f("Domicilio comercial","domicilio")+f("Email de contacto","emailContacto","email")+f("Planilla de Google: link de la planilla (productos, stock y fotos)","planilla","url","placeholder=\"https://docs.google.com/spreadsheets/d/...\"")+f("Planilla de Google: URL de la app de pedidos (termina en /exec)","planillaApp","url","placeholder=\"https://script.google.com/macros/s/.../exec\"")+f("Avisos de stock y pedidos: dirección que los recibe (Formspree, Google o servidor propio)","avisosUrl","url","placeholder=\"https://formspree.io/f/...\"")+f("Link del QR de Data Fiscal (ARCA)","dataFiscalUrl","url","placeholder=\"https://qr.afip.gob.ar/?qr=...\"")+
   '</div></section>'+
   supplierPanel()+'<section class="panel"><h3>Banners de categorías (inicio)</h3><div class="tile-edit">'+tileList().map(function(t,i){
      var o='<option value="center 15%">Arriba</option><option value="center 30%">Un poco arriba</option><option value="center">Centro</option><option value="center 70%">Abajo</option>'.replace('value="'+(t.pos||"center")+'"','value="'+(t.pos||"center")+'" selected');
      return '<div><label class="tthumb" title="Cambiar foto">'+(t.foto?'<img src="'+esc(t.foto)+'" alt="" style="object-position:'+esc(t.pos||"center")+'">':jersey(t.patron))+'<input type="file" accept="image/*" hidden data-tphoto="'+i+'"></label><label class="f" style="margin-top:6px">Título<input data-tile="'+i+'" data-tk="titulo" value="'+esc(t.titulo)+'"></label><label class="f" style="margin-top:6px">Encuadre<select data-tile="'+i+'" data-tk="pos">'+o+'</select></label>'+(t.foto?'<button class="linkish" style="font-size:13px;margin-top:6px" data-tnophoto="'+i+'">Quitar foto</button>':"")+'</div>';
    }).join("")+'</div></section>'+
   '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Foto</th><th>Club y modelo</th><th>Categoría y época</th><th>Precio / tachado</th><th>Stock por talle</th><th>Dibujo sin foto</th><th>Etiquetas</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
   '<p class="hint" style="margin:12px 0 90px">Tocá la miniatura para subir una foto. Se achica sola para que la página cargue rápido. El precio tachado arma la oferta: dejalo en 0 si no hay descuento.</p>'+
   '</main>'+
   '<div class="savebar '+(dirty?"show":"")+'"><span>Tenés cambios sin guardar</span><button class="btn btn-ghost" id="discard">Descartar</button><button class="btn btn-save" id="save" '+(busy?"disabled":"")+'>'+(busy?"Guardando…":(hasClaude()?"Guardar y publicar":"Descargar copia HTML"))+'</button></div><div class="toast" id="toast"></div>';
}
function setPath(obj,path,val){var ks=path.split(".");var o=obj;for(var i=0;i<ks.length-1;i++){o=o[ks[i]]=o[ks[i]]||{}}o[ks[ks.length-1]]=val}
function markDirty(){dirty=true;var b=document.querySelector(".savebar");if(b)b.classList.add("show")}
function resizePhoto(file,cb,mx){
  var r=new FileReader();
  r.onload=function(){var img=new Image();img.onload=function(){
    var max=mx||700,s=Math.min(1,max/Math.max(img.width,img.height));
    var cv=document.createElement("canvas");cv.width=Math.round(img.width*s);cv.height=Math.round(img.height*s);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);cb(cv.toDataURL("image/jpeg",0.78));
  };img.src=r.result};
  r.readAsDataURL(file);
}
function buildDoc(){
  var json=JSON.stringify(data).replace(/</g,"\\u003c");
  var css=document.getElementById("main-css").textContent;
  var js=document.getElementById("main-js").textContent;
  return '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>'+esc(data.config.nombre)+' · Camisetas<\/title>\n'+HEAD_FONTS+'\n<style id="main-css">'+css+'<\/style>\n<\/head>\n<body>\n<div id="app"><\/div>\n<script id="store-data" type="application/json">'+json+'<\/script>\n<script id="main-js">'+js+'<\/script>\n<\/body>\n<\/html>';
}
function hasClaude(){return !!(window.claude&&window.claude.use)}
function downloadCopy(doc){
 var blob=new Blob([doc],{type:"text/html;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="La-ONCE-Kits.html";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},10000);
 saved=clone(data);dirty=false;adminMsg={kind:"info",text:"Descarga preparada. Conservá el archivo descargado con tus cambios; la tienda no se publicó."};render();
}
async function save(){
  if(busy) return;
  var doc=buildDoc();
  if(doc.length>15*1024*1024){adminMsg={kind:"err",text:"La página quedó muy pesada por las fotos. Quitá alguna y probá de nuevo."};render();return}
  var a=null;
  try{a=window.claude&&window.claude.use?await window.claude.use("artifact"):null}catch(e){a=null}
  if(!a){downloadCopy(doc);return}
  busy=true;render();
  try{ await a.publish(doc);saved=clone(data);dirty=false; adminMsg={kind:"info",text:"Publicado. La tienda se está actualizando."}; }
  catch(e){
    var code=e&&e.code;
    if(code==="conflict"){dirty=false;adminMsg={kind:"info",text:"Otro socio guardó justo antes. La página se recarga con su versión; volvé a hacer tu cambio."}}
    else if(code==="not_writer"||code==="not_granted"||code==="consent_required"||code==="not_declared"||code==="capability_disabled") adminMsg={kind:"err",text:"Esta cuenta puede ver la página pero no editarla. Pedile al dueño permiso de edición."};
    else if(code==="too_large") adminMsg={kind:"err",text:"La página quedó muy pesada. Quitá alguna foto y probá de nuevo."};
    else if(code==="rate_limited") adminMsg={kind:"err",text:"Se guardó muchas veces seguidas. Esperá un minuto y volvé a publicar."};
    else adminMsg={kind:"err",text:"No se pudo publicar ("+(code||"error")+"). Probá de nuevo en un rato."};
  }
  busy=false;render();
}

/* ---------- Navegación y eventos ---------- */

/* ---------- Cuentas (guardadas en este navegador) ---------- */
function loadJSON(k,d){try{var v=JSON.parse(localStorage.getItem(k)||"null");return v==null?d:v}catch(e){return d}}
function saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var accounts=loadJSON("laonce-accounts",{});
var session=loadJSON("laonce-session",null);
if(session&&!accounts[session]) session=null;
function me(){return session?accounts[session]:null}
function saveAccounts(){saveJSON("laonce-accounts",accounts)}
function setSession(email){session=email;saveJSON("laonce-session",email)}
async function hashPw(pw,salt){
  try{var buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(salt+"|"+pw));return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,"0")}).join("")}
  catch(e){var h=0,str=salt+"|"+pw;for(var i=0;i<str.length;i++){h=(h*31+str.charCodeAt(i))|0}return "x"+h}
}
function accountLink(){
  var u=me();
  var ic='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
  if(!u) return '<button class="acc-link" data-auth="login">'+ic+'<span>Iniciar sesión o registrarse</span></button>';
  return '<span class="acc-hi">'+ic+'<span class="acc-txt">Hola! <span class="acc-mail">'+esc(u.email)+'</span>, </span><button class="acc-link" id="goAccount">Mi cuenta</button></span>';
}
var afterAuth=null;
function authDialog(){
  var d=document.getElementById("authDlg");
  if(!d){d=document.createElement("dialog");d.id="authDlg";d.className="auth";document.body.appendChild(d)}
  return d;
}
function openAuth(mode,then){
  afterAuth=then||null;
  var d=authDialog(), err="";
  function draw(){
    var reg=mode==="register";
    d.innerHTML='<button class="close" aria-label="Cerrar">×</button><div class="auth-tabs" role="tablist"><button role="tab" data-mode="login" aria-selected="'+(!reg)+'">Iniciar sesión</button><button role="tab" data-mode="register" aria-selected="'+reg+'">Registrarse</button></div>'+
      '<form class="auth-form" novalidate>'+(reg?'<label class="cf"><span>Nombre y apellido</span><input name="nombre" autocomplete="name" required></label>':"")+
      '<label class="cf"><span>Email</span><input name="email" type="email" autocomplete="email" required></label>'+
      '<label class="cf"><span>Contraseña</span><input name="pw" type="password" autocomplete="'+(reg?"new-password":"current-password")+'" required></label>'+
      (reg?'<label class="cf"><span>Repetir contraseña</span><input name="pw2" type="password" autocomplete="new-password" required></label>':"")+
      (err?'<p class="auth-err">'+esc(err)+'</p>':"")+
      '<button class="btn btn-ink auth-go" type="submit">'+(reg?"Crear cuenta":"Entrar")+'</button>'+
      '<p class="hint auth-sw">'+(reg?'¿Ya tenés cuenta? <button type="button" class="linkish" data-mode="login">Iniciá sesión</button>':'¿No tenés cuenta? <button type="button" class="linkish" data-mode="register">Registrate</button>')+'</p></form>';
    var f=d.querySelector("form"), first=f.querySelector("input"); if(first) setTimeout(function(){first.focus()},30);
    f.onsubmit=async function(ev){
      ev.preventDefault();
      var v=Object.fromEntries(new FormData(f)), email=String(v.email||"").trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){err="Revisá el email";draw();return}
      if(reg){
        if(!String(v.nombre||"").trim()){err="Poné tu nombre";draw();return}
        if(String(v.pw||"").length<6){err="La contraseña tiene que tener al menos 6 caracteres";draw();return}
        if(v.pw!==v.pw2){err="Las contraseñas no coinciden";draw();return}
        if(accounts[email]){err="Ya hay una cuenta con ese email. Iniciá sesión.";draw();return}
        var salt=Math.random().toString(36).slice(2);
        accounts[email]={email:email,nombre:String(v.nombre).trim(),salt:salt,hash:await hashPw(v.pw,salt),creada:Date.now(),pedidos:[],favs:[],telefono:"",direccion:null};
        saveAccounts();
      }else{
        var a=accounts[email];
        if(!a||a.hash!==await hashPw(v.pw||"",a.salt)){err="Email o contraseña incorrectos";draw();return}
      }
      setSession(email); d.close(); toast("Hola, "+me().nombre.split(" ")[0]+"!");
      var t=afterAuth; afterAuth=null; if(t) t(); else render();
    };
  }
  d.onclick=function(e){
    if(e.target===d||e.target.closest(".close")){d.close();return}
    var m=e.target.closest("[data-mode]"); if(m){mode=m.dataset.mode;err="";draw()}
  };
  draw(); if(!d.open) d.showModal();
}
function logout(){setSession(null);view="home";render();scrollTo(0,0);toast("Cerraste sesión")}
function isFav(id){var u=me();return !!(u&&u.favs.indexOf(id)>=0)}
function toggleFav(id,cb){
  if(!me()){openAuth("login",function(){toggleFav(id,function(){render()})});return}
  var u=me(), i=u.favs.indexOf(id);
  if(i>=0){u.favs.splice(i,1);toast("Quitada de favoritos")}else{u.favs.push(id);toast("Agregada a favoritos")}
  saveAccounts(); if(cb) cb();
}
var ESTADOS={pendiente:"Pendiente de pago",pagado:"Pagado"};
function crumbs(label){return '<nav class="crumbs" aria-label="Ruta"><button class="crumb-link" data-nav="inicio">Inicio</button><span class="crumb-sep" aria-hidden="true">»</span><span class="crumb-here" aria-current="page">'+esc(label)+'</span></nav>'}
var openOrder=null, editProfile=false, accPage="resumen", addrEdit=null, pwMsg=null;
var ACC_PAGES=[["resumen","Resumen de mi cuenta"],["carrito","Mi carrito"],["direccion","Mi dirección"],["favoritos","Mis favoritos"],["password","Cambiar contraseña"]];
function migrateAcc(u){
  if(!u.direcciones){u.direcciones=[];if(u.direccion&&u.direccion.direccion){u.direcciones.push(Object.assign({nombre:u.nombre,telefono:u.telefono||""},u.direccion))}delete u.direccion;saveAccounts()}
  (u.pedidos||[]).forEach(function(o){if(o.estado!=="pendiente"&&o.estado!=="pagado")o.estado="pendiente"});
}
function goAcc(pg){view="account";accPage=pg||"resumen";openOrder=null;editProfile=false;addrEdit=null;pwMsg=null;render();scrollTo(0,0)}
function accSide(u){
  var nCart=cart.reduce(function(a,l){return a+l.cant},0);
  return '<aside class="acc-side"><h2>Mi cuenta</h2><nav>'+ACC_PAGES.map(function(p){
    var extra=p[0]==="carrito"?' <em>('+nCart+')</em>':p[0]==="favoritos"?' <em>('+u.favs.length+')</em>':p[0]==="direccion"?' <em>('+u.direcciones.length+')</em>':"";
    return '<button data-accp="'+p[0]+'" aria-current="'+(accPage===p[0]?"page":"false")+'">'+p[1]+extra+'</button>'}).join("")+
    '<button id="logout" class="acc-out">Cerrar sesión</button></nav></aside>';
}
function renderAccount(){
  clearInterval(timer);
  var u=me(); if(!u){view="home";render();return}
  migrateAcc(u);
  var label=accPage==="resumen"?"Mi cuenta":(ACC_PAGES.find(function(p){return p[0]===accPage})||[0,"Mi cuenta"])[1];
  var body=accPage==="carrito"?accCart(u):accPage==="direccion"?accAddr(u):accPage==="favoritos"?accFavs(u):accPage==="password"?accPw(u):accSummary(u);
  app.innerHTML=crumbs(label)+'<main class="wrap acc"><div class="acc-layout">'+accSide(u)+'<div class="acc-main">'+body+'</div></div></main>'+footer()+'<dialog id="dlg"></dialog><dialog id="bagDlg" class="drawer"></dialog><div class="toast" id="toast"></div>';
}
function accSummary(u){
  var P=u.pedidos||[], cnt=function(e){return P.filter(function(o){return o.estado===e}).length};
  var rows=P.slice().reverse().map(function(o){
    var det=openOrder===o.id?'<tr class="od-row"><td colspan="5"><div class="od">'+o.items.map(function(it){return '<div><span>'+it.cant+' × '+esc(it.club)+' '+esc(it.titulo)+' · Talle '+esc(it.talle)+(it.pers?' · '+esc(persText(it.pers)):'')+'</span><b>'+money(it.precio*it.cant)+'</b></div>'}).join("")+(o.entrega?'<div class="od-meta">'+esc(o.entrega)+(o.pago?' · '+esc(o.pago):"")+'</div>':"")+'</div></td></tr>':"";
    return '<tr><td class="mono">'+esc(o.id)+'</td><td>'+money(o.total)+'</td><td><span class="st st-'+o.estado+'">'+ESTADOS[o.estado]+'</span></td><td>'+new Date(o.fecha).toLocaleDateString("es-AR")+'</td><td class="acts"><button class="linkish" data-od="'+esc(o.id)+'">'+(openOrder===o.id?"Ocultar":"Detalle")+'</button>'+(o.estado==="pendiente"?'<button class="linkish pay-l" data-pay="'+esc(o.id)+'">'+(PAYON&&PAYON.pagos?'Pagar':'Coordinar pago')+'</button>':"")+'</td></tr>'+det;
  }).join("");
  var ini=(u.nombre||u.email).trim().charAt(0).toUpperCase();
  return '<section class="acc-top"><div class="acc-user"><div class="avatar" aria-hidden="true">'+esc(ini)+'</div><div><h1>'+esc(u.nombre)+'</h1><span class="hint">Miembro desde '+new Date(u.creada).toLocaleDateString("es-AR",{month:"long",year:"numeric"})+'</span><button class="linkish" id="editProfile">'+(u.telefono?"Editar perfil":"Completar perfil")+'</button></div></div>'+
    '<div class="acc-card"><div><h3><button class="linkish plain" data-jump="orders">Mis pedidos</button> <em>('+P.length+')</em></h3><ul><li>Pendientes de pago <em>('+cnt("pendiente")+')</em></li><li>Pagados <em>('+cnt("pagado")+')</em></li></ul></div>'+
      '<div><h3>Descuento <em>('+(Number(data.config.descuentoTransferencia)||0)+'%)</em></h3><p class="hint">Pagando '+offW()+'</p><h3>Cupones <em>(0)</em></h3></div></div></section>'+
    (editProfile?'<section class="acc-sec"><h2>Mis datos</h2><div class="co-fields"><label class="cf"><span>Nombre y apellido</span><input data-pf="nombre" value="'+esc(u.nombre)+'"></label><label class="cf"><span>Teléfono / WhatsApp</span><input data-pf="telefono" type="tel" value="'+esc(u.telefono||"")+'"></label></div><div class="acc-btns"><button class="btn btn-ink" id="saveProfile">Guardar</button><button class="btn btn-ghost" id="cancelProfile">Cancelar</button></div></section>':"")+
    '<section class="acc-sec" id="orders"><h2>Mis pedidos</h2>'+(P.length?'<div class="tbl-wrap"><table class="otbl"><thead><tr><th>Número de pedido</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="empty">Todavía no hiciste ningún pedido.<br><br><button class="btn btn-ink" data-nav="inicio">Ir a la tienda</button></div>')+'</section>';
}
function accFavs(u){
  var favs=u.favs.map(byId).filter(Boolean);
  return '<section class="acc-sec first"><h2>Mis favoritos</h2>'+(favs.length?'<div class="grid acc-grid">'+favs.map(card).join("")+'</div>':'<div class="empty">Todavía no guardaste ninguna camiseta en favoritos.<br>Volvé a la tienda y fijate cuál te gusta: tocá el corazón para guardarla.<br><br><button class="btn btn-ink" data-nav="inicio">Volver a la tienda</button></div>')+'</section>';
}
function accAddr(u){
  var L=u.direcciones;
  var form=addrEdit!==null?(function(){var a=addrEdit==="new"?{nombre:u.nombre,telefono:u.telefono||""}:L[addrEdit];
    function f(k,l,t){return '<label class="cf"><span>'+l+'</span><input data-ad="'+k+'" '+(t?'type="'+t+'"':"")+' value="'+esc(a[k]||"")+'"></label>'}
    return '<div class="addr-form"><h3>'+(addrEdit==="new"?"Nueva dirección":"Modificar dirección")+'</h3><div class="co-fields">'+f("nombre","Nombre y apellido")+f("telefono","Teléfono","tel")+f("direccion","Dirección")+f("depto","Número de departamento (opcional)")+f("localidad","Localidad / provincia")+f("cp","Código postal")+'</div><p class="auth-err" id="adErr" hidden></p><div class="acc-btns"><button class="btn btn-ink" id="saveAddr">Guardar dirección</button><button class="btn btn-ghost" id="cancelAddr">Cancelar</button></div></div>'})():"";
  var rows=L.map(function(a,i){return '<tr><td>'+esc(a.nombre)+'</td><td>'+esc(a.direccion)+(a.depto?" "+esc(a.depto):"")+(a.cp?" ("+esc(a.cp)+")":"")+'  '+esc(a.localidad)+'  Argentina</td><td>'+esc(a.telefono||"")+'</td><td class="acts"><button class="linkish muted" data-adm="'+i+'">Modificar</button><button class="linkish del" data-adx="'+i+'">Eliminar</button></td></tr>'}).join("");
  return '<section class="acc-sec first"><div class="sec-head"><h2>Mi dirección</h2>'+(addrEdit===null?'<button class="btn btn-red" id="addAddr">Agregar dirección</button>':"")+'</div>'+form+
    (L.length?'<div class="tbl-wrap"><table class="otbl addr"><thead><tr><th>Nombre completo</th><th>Dirección</th><th>Teléfono</th><th>Acción</th></tr></thead><tbody>'+rows+'</tbody></table></div>':(addrEdit===null?'<div class="empty">Todavía no cargaste ninguna dirección.</div>':""))+'</section>';
}
function accCart(u){
  validCart();
  var sub=0, rows=cart.map(function(l,i){var p=byId(l.id), st=capacity(p,l.talle)||0;sub+=linePrice(l)*l.cant;
    return '<tr><td class="cg"><div class="cgw"><div class="art">'+art(p)+'</div><div><b>'+esc(p.club)+' '+esc(p.titulo)+'</b><span class="hint">Talle: '+esc(l.talle)+(l.pers?' · '+esc(persText(l.pers)):'')+'</span></div></div></td><td>'+money(p.precio)+'</td><td><div class="stepper sm"><button data-cq="'+i+'" data-d="-1" aria-label="Una menos" '+(l.cant<=1?"disabled":"")+'>−</button><output>'+l.cant+'</output><button data-cq="'+i+'" data-d="1" aria-label="Una más" '+(l.cant>=st?"disabled":"")+'>+</button></div></td><td><b>'+money(linePrice(l)*l.cant)+'</b></td><td class="cact"><button class="ico'+(isFav(p.id)?" on":"")+'" data-cfav="'+esc(p.id)+'" aria-label="Guardar en favoritos" title="Guardar en favoritos"><svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.9 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.4 0 5.7 3.3 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3z"/></svg></button><button class="ico" data-crm="'+i+'" aria-label="Quitar" title="Quitar"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg></button></td></tr>'}).join("");
  var pz=prizeCalc(), pd=pz?pz.disc:0, d=Number(data.config.descuentoTransferencia)||0, free=Number(data.config.envioGratisDesde)||0, units=cart.reduce(function(a,l){return a+l.cant},0);
  if(!cart.length) return '<section class="acc-sec first"><h2>Mi carrito</h2><div class="empty">Tu carrito está vacío.<br><br><button class="btn btn-ink" data-nav="inicio">Volver a la tienda</button></div></section>';
  return '<section class="acc-sec first"><div class="cart-page"><div><h2>Mi carrito</h2><div class="tbl-wrap"><table class="ctbl"><thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    cartNotes()+'</div>'+
    '<aside class="cart-sum"><h2>Resumen</h2><div class="promo"><b>Más beneficios</b>'+(d?'<div><span class="tag-ic">%</span>Pagando '+offW()+', '+d+'% OFF</div>':"")+(free?'<div><span class="tag-ic">✈</span>Envío gratis desde '+money(free)+'</div>':"")+'</div>'+
    '<div class="cs-rows"><div><span>Productos ('+units+')</span><span>'+money(sub)+'</span></div>'+(pd?'<div class="co-desc"><span>Premio ruleta · '+esc(prizeLabel(pz))+'</span><span>−'+money(pd)+'</span></div>':"")+(d?'<div class="co-desc"><span>Con '+offN()+'</span><span>'+money(pz&&pz.stack?sub*(1-d/100)-pd:sub-Math.max(pd,sub*d/100))+'</span></div>':"")+'<div class="cs-total"><span>Total</span><span>'+money(sub-pd)+'</span></div></div>'+
    '<button class="btn btn-ink btn-checkout" id="cartCheckout">Finalizar compra</button><button class="linkish keep" data-nav="inicio">‹ Seguir comprando</button></aside></div></section>';
}
function cartNotes(){return '<div class="cart-notes"><p>Revisá modelo, talle y datos de entrega. Antes del pago confirmamos disponibilidad, importe final y condiciones de compra por WhatsApp.</p></div>'}
function accPw(u){
  return '<section class="acc-sec first"><h2>Cambiar contraseña</h2><div class="pw-box"><label class="cf"><span>Contraseña actual</span><input type="password" data-pw="old" autocomplete="current-password"></label><label class="cf"><span>Contraseña nueva</span><input type="password" data-pw="n1" autocomplete="new-password"></label><label class="cf"><span>Repetir contraseña nueva</span><input type="password" data-pw="n2" autocomplete="new-password"></label>'+(pwMsg?'<p class="'+(pwMsg.ok?"pw-ok":"auth-err")+'">'+esc(pwMsg.t)+'</p>':"")+'<button class="btn btn-ink" id="savePw">Cambiar contraseña</button></div></section>';
}
async function savePassword(){
  var u=me(), g=function(k){var el=app.querySelector('[data-pw="'+k+'"]');return el?el.value:""};
  if(u.hash!==await hashPw(g("old"),u.salt)){pwMsg={t:"La contraseña actual no es correcta"};renderAccount();return}
  if(g("n1").length<6){pwMsg={t:"La nueva contraseña tiene que tener al menos 6 caracteres"};renderAccount();return}
  if(g("n1")!==g("n2")){pwMsg={t:"Las contraseñas nuevas no coinciden"};renderAccount();return}
  u.salt=Math.random().toString(36).slice(2); u.hash=await hashPw(g("n1"),u.salt); saveAccounts();
  pwMsg={ok:1,t:"Listo, cambiaste tu contraseña."}; renderAccount();
}
function saveAddr(){
  var u=me(), g=function(k){var el=app.querySelector('[data-ad="'+k+'"]');return el?el.value.trim():""};
  var a={nombre:g("nombre"),telefono:g("telefono"),direccion:g("direccion"),depto:g("depto"),localidad:g("localidad"),cp:g("cp")};
  if(!a.nombre||!a.direccion||!a.localidad||!a.cp){var e=document.getElementById("adErr");e.textContent="Completá nombre, dirección, localidad y código postal";e.hidden=false;return}
  if(addrEdit==="new") u.direcciones.push(a); else u.direcciones[addrEdit]=a;
  saveAccounts(); addrEdit=null; renderAccount(); toast("Dirección guardada");
}
function saveProfileFromForm(){
  var u=me(), g=function(k){var el=app.querySelector('[data-pf="'+k+'"]');return el?el.value.trim():""};
  if(g("nombre")) u.nombre=g("nombre"); u.telefono=g("telefono");
  saveAccounts(); editProfile=false; renderAccount(); toast("Datos guardados");
}
function cartSnapshot(){return cart.map(function(l){var p=byId(l.id);return {id:l.id,club:p.club,titulo:p.titulo,talle:l.talle,cant:l.cant,precio:linePrice(l),pers:l.pers||null,modalidad:p.modalidad||"stock"}})}
function startCheckout(){
  co.aceptaEspera=false;payView=null;clearTimeout(payPoll);delete coErr.pay;
  var changed=validCart(),u=me();
  if(u)migrateAcc(u);
  var items=cartSnapshot(), total=items.reduce(function(a,it){return a+it.precio*it.cant},0);
  var o=u&&co.pendingId&&(u.pedidos||[]).find(function(x){return x.id===co.pendingId&&x.estado==="pendiente"});
  if(u&&items.length){
  if(o){o.items=items;o.total=total;o.fecha=Date.now()}
  else{var id="LO"+new Date().toISOString().slice(2,10).replace(/-/g,"")+String(Date.now()).slice(-5);u.pedidos=u.pedidos||[];u.pedidos.push({id:id,fecha:Date.now(),total:total,estado:"pendiente",items:items});co.pendingId=id}
  saveAccounts();}saveCo();
  view="checkout"; coDone=false; render(); scrollTo(0,0);
}
function payOrder(id){
  var o=(me().pedidos||[]).find(function(x){return x.id===id}); if(!o) return;
  cart=o.items.filter(function(it){return byId(it.id)}).map(function(it){return {id:it.id,talle:it.talle,cant:it.cant,pers:it.pers||null}}); saveCart(); updateBadge(false);
  co.pendingId=o.id; startCheckout();
}

/* ---------- Legales ---------- */
var legalPage="terminos", arrDone=null, arrErr={}, arrData={nombre:"",email:"",telefono:"",pedido:"",fecha:"",detalle:""};
var LEGAL_PAGES={terminos:"Términos y condiciones",privacidad:"Política de privacidad",cambios:"Cambios y devoluciones",arrepentimiento:"Botón de arrepentimiento"};
var RECLAMOS_URL="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario";
function seller(){
  var c=data.config;
  return {nombre:c.razonSocial||c.nombre, cuit:c.cuit||"", dom:c.domicilio||"", email:c.emailContacto||"", wa:waNumber()};
}
function sellerLine(){
  var s=seller(), parts=[esc(s.nombre)];
  if(s.cuit) parts.push("CUIT "+esc(s.cuit));
  if(s.dom) parts.push(esc(s.dom));
  if(s.email) parts.push('<a href="mailto:'+esc(s.email)+'">'+esc(s.email)+'</a>');
  return parts.join(" · ");
}
function goLegal(k,fromHistory){view="legal";legalPage=LEGAL_PAGES[k]?k:"terminos";arrDone=null;arrErr={};if(!fromHistory&&location.hash!=="#legal-"+legalPage)setHash("#legal-"+legalPage);render();scrollTo(0,0)}
function legalFooter(){
  var c=data.config, links=Object.keys(LEGAL_PAGES).map(function(k){return '<button data-legal="'+k+'">'+LEGAL_PAGES[k]+'</button>'}).join("");
  return '<div class="legal-bar"><div class="wrap">'+
    '<nav class="legal-links" aria-label="Legales">'+links+'</nav>'+
    '<div class="legal-row"><p class="reclamos-txt">Defensa de las y los Consumidores. Para reclamos <a href="'+RECLAMOS_URL+'" target="_blank" rel="noopener">Ingrese aquí</a></p>'+
    (c.dataFiscalUrl?'<a class="datafiscal" href="'+esc(c.dataFiscalUrl)+'" target="_blank" rel="noopener" title="Data Fiscal (ARCA)"><b>DATA</b><span>FISCAL</span></a>':"")+'</div>'+
    '<p class="legal-seller">© '+new Date().getFullYear()+' '+sellerLine()+'. Precios finales en pesos argentinos.</p></div></div>';
}
function lp(t){return '<p>'+t+'</p>'}
function legalBody(k){
  var s=seller(), c=data.config, d=Number(c.descuentoTransferencia)||0, cq=Number(c.cuotas)||0;
  var who='<b>'+esc(s.nombre)+'</b>'+(s.cuit?' (CUIT '+esc(s.cuit)+')':'')+(s.dom?', con domicilio en '+esc(s.dom):'');
  var contacto=(s.email?'el email <a href="mailto:'+esc(s.email)+'">'+esc(s.email)+'</a>':'')+(s.email&&s.wa?' o ':'')+(s.wa?'WhatsApp (+'+esc(s.wa)+')':'');
  if(!contacto) contacto="nuestros canales de contacto";
  if(k==="terminos") return ''+
    '<h2>1. Quiénes somos</h2>'+lp('Este sitio es operado por '+who+'. Podés contactarnos por '+contacto+'.')+
    '<h2>2. Aceptación</h2>'+lp('Al comprar en este sitio aceptás estos términos y condiciones y nuestra Política de privacidad. Si no estás de acuerdo, no realices la compra.')+
    '<h2>3. Productos, precios y stock</h2>'+lp('Los precios están expresados en pesos argentinos y son precios finales. Las fotos son ilustrativas. Las ofertas y descuentos son válidos mientras dure el stock o hasta la fecha que se indique. Si un producto se agota después de tu compra, te avisamos y te devolvemos el total de lo pagado.')+
    '<h2>4. Medios de pago</h2>'+lp(PAYON&&PAYON.pagos?'Aceptamos Mercado Pago con dinero en cuenta'+(d?' (con '+d+'% de descuento)':'')+' y tarjetas de débito, crédito y prepagas (Visa, Mastercard y otras), procesadas por Mercado Pago'+(cq>1?', hasta '+cq+' cuotas':'')+'. Los datos de la tarjeta se cargan en el formulario seguro de Mercado Pago y no pasan por nuestra página. El pedido se confirma y el stock se descuenta cuando Mercado Pago acredita el pago.':'Aceptamos transferencia bancaria'+(d?' (con '+d+'% de descuento)':'')+' y tarjetas de débito y crédito'+(cq>1?', hasta '+cq+' cuotas sin interés (CFT 0%)':'')+'. El pedido se confirma una vez acreditado el pago.')+
    '<h2>5. Camisetas por pedido (encargo)</h2>'+lp('Algunas camisetas se traen por encargo. El plazo estimado es de aproximadamente 30 días desde la confirmación del pedido, más la entrega local, y puede variar por transporte o aduana. Antes del pago confirmamos modelo, talle, precio y disponibilidad. Si finalmente no podemos conseguirla, te devolvemos el total pagado. El derecho de arrepentimiento también aplica a estas compras, salvo las camisetas personalizadas con nombre o número, que se confeccionan según tu pedido (art. 1116 del Código Civil y Comercial); igual tienen garantía por falla.')+
    '<h2>6. Envíos y entregas</h2>'+lp('Hacemos '+esc((c.envios||"envíos a todo el país").toLowerCase())+'. El costo y el plazo dependen del destino y se informan antes de confirmar. '+(c.zona?esc(c.zona)+'. ':'')+'Es responsabilidad del comprador informar correctamente los datos de entrega.')+
    '<h2>7. Cambios, devoluciones y arrepentimiento</h2>'+lp('Podés arrepentirte de tu compra dentro de los 10 días corridos desde que recibís el producto, sin costo y sin dar explicaciones, usando el <button class="inline-link" data-legal="arrepentimiento">Botón de arrepentimiento</button> (Ley 24.240, art. 34). Los detalles están en <button class="inline-link" data-legal="cambios">Cambios y devoluciones</button>.')+
    '<h2>8. Garantía</h2>'+lp('Los productos nuevos tienen la garantía legal de 6 meses por defectos o fallas de fabricación (Ley 24.240, art. 11).')+
    '<h2>9. Datos personales</h2>'+lp('Tratamos tus datos según la <button class="inline-link" data-legal="privacidad">Política de privacidad</button> y la Ley 25.326.')+
    '<h2>10. La ruleta (promoción)</h2>'+lp('La participación en la ruleta es gratuita y sin obligación de compra. Los premios, sus probabilidades, la frecuencia de participación, la vigencia de los códigos y las condiciones de uso se publican en la misma página de la ruleta, en "Premios, probabilidades y cómo funciona", y forman parte de estas bases. El premio se aplica automáticamente en el carrito, vale para un solo pedido y se valida con su código al confirmar la compra. Los premios de $3.000 y $6.000 y el envío gratis se suman al descuento '+offW()+'; los premios en porcentaje se aplican sobre una camiseta en stock y no se acumulan con ese descuento: se aplica el mayor beneficio. La Mystery Box es una camiseta sorpresa de regalo elegida por nosotros, sin compra mínima (envío aparte).')+
    '<h2>11. Consultas y reclamos</h2>'+lp('Ante cualquier problema escribinos por '+contacto+'. También podés hacer un reclamo en <a href="'+RECLAMOS_URL+'" target="_blank" rel="noopener">Defensa de las y los Consumidores</a>.')+
    '<h2>12. Ley aplicable</h2>'+lp('Estos términos se rigen por las leyes de la República Argentina. Para cualquier conflicto son competentes los tribunales del domicilio del consumidor.');
  if(k==="privacidad") return ''+
    '<h2>Qué datos pedimos</h2>'+lp('Nombre, email, teléfono, DNI o CUIT y dirección de entrega, solo para procesar tus pedidos, coordinar envíos y avisarte cuando vuelva el stock si lo pedís. No guardamos los datos completos de tu tarjeta.')+
    '<h2>Para qué los usamos</h2>'+lp('Para gestionar tus compras, emitir comprobantes, responder consultas y, solo si nos lo pedís, enviarte novedades. No vendemos ni cedemos tus datos a terceros, salvo a quienes intervienen en el pago o el envío.')+
    '<h2>Tus derechos</h2>'+lp('Podés pedir acceder, corregir o eliminar tus datos escribiendo a '+contacto+'. El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326.')+
    lp('La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.')+
    '<h2>Datos guardados en tu dispositivo</h2>'+lp('La página guarda en tu navegador tu carrito y tus preferencias para que no los pierdas al volver.');
  if(k==="cambios") return ''+
    '<h2>Arrepentimiento (10 días)</h2>'+lp('Tenés 10 días corridos desde que recibís el producto para arrepentirte de la compra, sin dar motivos. El producto tiene que estar sin uso, con sus etiquetas y en su empaque. Los costos de devolución corren por nuestra cuenta y te devolvemos el total pagado. Hacelo desde el <button class="inline-link" data-legal="arrepentimiento">Botón de arrepentimiento</button>.')+
    '<h2>Fallas</h2>'+lp('Si la camiseta tiene una falla de fabricación, escribinos con fotos y te la cambiamos o te devolvemos el dinero. La garantía legal es de 6 meses.')+
    '<h2>Cambios de talle o modelo</h2>'+lp('Pasados los 10 días del arrepentimiento, no hacemos cambios de talle ni de modelo. Antes de comprar, revisá la tabla de talles o consultanos.')+
    '<h2>Cómo pedirlo</h2>'+lp('Escribinos por '+contacto+' con tu número de pedido.');
  return '';
}
function arrForm(){
  if(arrDone) return '<div class="arr-ok"><div class="co-ok">✓</div><h2>Recibimos tu solicitud</h2><p>Tu código de trámite es</p><p class="arr-code">'+esc(arrDone.code)+'</p><p>Guardalo. Te vamos a contactar para coordinar la devolución, sin costo para vos.'+(arrDone.href?' Si no se abrió WhatsApp, tocá el botón.':'')+'</p>'+(arrDone.href?'<a class="btn btn-wa" target="_blank" rel="noopener" href="'+esc(arrDone.href)+'">Enviar por WhatsApp</a>':'')+(arrDone.mail?' <a class="btn btn-ghost" href="'+esc(arrDone.mail)+'">Enviar por email</a>':'')+'</div>';
  function f(k,l,t,x){return '<label class="cf'+(arrErr[k]?" err":"")+'"><span>'+l+'</span><input data-arr="'+k+'" '+(t?'type="'+t+'"':'')+' value="'+esc(arrData[k])+'" '+(x||'')+'>'+(arrErr[k]?'<em>'+esc(arrErr[k])+'</em>':'')+'</label>'}
  return '<p class="arr-lead">Tenés <b>10 días corridos desde que recibís tu compra</b> para arrepentirte, sin dar motivos y sin costo (Ley 24.240, art. 34). Completá el formulario y te damos un código de trámite.</p>'+
    '<div class="co-fields arr-fields">'+f("nombre","Nombre y apellido","",'autocomplete="name"')+f("email","Email","email",'autocomplete="email"')+f("telefono","Teléfono","tel",'autocomplete="tel" inputmode="tel"')+f("pedido","Número de pedido (si lo tenés)","",'placeholder="Ej: LO26092812345"')+f("fecha","Fecha en que lo recibiste","date")+f("detalle","Producto (opcional)","",'placeholder="Ej: Boca Juniors Titular talle M"')+'</div>'+
    '<button class="btn btn-ink arr-send" id="arrSend">Enviar solicitud de arrepentimiento</button>';
}
function sendArrepentimiento(){
  arrErr={};
  if(!arrData.nombre.trim()) arrErr.nombre="Poné tu nombre";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(arrData.email.trim())) arrErr.email=arrData.email.trim()?"Revisá el email":"Poné tu email";
  if(String(arrData.telefono).replace(/\D/g,"").length<8) arrErr.telefono="Poné un teléfono válido";
  if(!arrData.fecha) arrErr.fecha="Poné la fecha";
  if(Object.keys(arrErr).length){renderLegal();var e=app.querySelector(".cf.err input");if(e)e.focus();return}
  var code="ARR-"+new Date().toISOString().slice(2,10).replace(/-/g,"")+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
  var msg="Solicitud de ARREPENTIMIENTO de compra\nCódigo de trámite: "+code+"\nNombre: "+arrData.nombre+"\nEmail: "+arrData.email+"\nTeléfono: "+arrData.telefono+(arrData.pedido?"\nPedido: "+arrData.pedido:"")+"\nRecibido el: "+arrData.fecha.split("-").reverse().join("/")+(arrData.detalle?"\nProducto: "+arrData.detalle:"");
  var s=seller(), href=s.wa?"https://wa.me/"+s.wa+"?text="+encodeURIComponent(msg):"", mail=s.email?"mailto:"+s.email+"?subject="+encodeURIComponent("Arrepentimiento "+code)+"&body="+encodeURIComponent(msg):"";
  try{var L=JSON.parse(localStorage.getItem("laonce-arrepentimientos")||"[]");L.push({code:code,fecha:Date.now(),datos:arrData});localStorage.setItem("laonce-arrepentimientos",JSON.stringify(L))}catch(_){}
  if(href){try{window.open(href,"_blank","noopener")}catch(_){}}
  arrDone={code:code,href:href,mail:mail}; arrData={nombre:"",email:"",telefono:"",pedido:"",fecha:"",detalle:""};
  renderLegal(); scrollTo(0,0);
}
function renderLegal(){
  clearInterval(timer);
  var k=legalPage, title=LEGAL_PAGES[k];
  var menu=Object.keys(LEGAL_PAGES).map(function(x){return '<button data-legal="'+x+'" aria-current="'+(x===k?"page":"false")+'">'+LEGAL_PAGES[x]+'</button>'}).join("");
  app.innerHTML=crumbs(title)+'<main class="wrap legal"><div class="legal-layout"><aside class="legal-side"><nav aria-label="Legales">'+menu+'</nav></aside><article class="legal-doc"><h1>'+esc(title)+'</h1>'+(k==="arrepentimiento"?arrForm():legalBody(k)+'<p class="legal-upd">Última actualización: '+new Date().toLocaleDateString("es-AR",{month:"long",year:"numeric"})+'.</p>')+'</article></div></main>'+footer()+'<dialog id="dlg"></dialog><dialog id="bagDlg" class="drawer"></dialog><div class="toast" id="toast"></div>';
}


/* ---------- Checkout ---------- */
var coDone=false, coDoneTel="", coDoneCode="", coErr={};
var co=(function(){try{return JSON.parse(localStorage.getItem("laonce-checkout")||"{}")}catch(e){return {}}})();
co=Object.assign({pendingId:null,nombre:"",telefono:"",email:"",dni:"",entrega:"envio",direccion:"",depto:"",localidad:"",cp:"",pago:"transferencia",notas:""},co);
function saveCo(){try{var c=Object.assign({},co);delete c.notas;delete c.dni;delete c.aceptaEspera;delete c.terms;localStorage.setItem("laonce-checkout",JSON.stringify(c))}catch(e){}}
function coTotals(){
  var sub=cart.reduce(function(a,l){var p=byId(l.id);return a+(p?linePrice(l)*l.cant:0)},0);
  var d=Number(data.config.descuentoTransferencia)||0, td=(co.pago==="transferencia"||co.pago==="mercadopago")?sub*d/100:0;
  var pz=prizeCalc(), pd=pz?pz.disc:0, stack=!!(pz&&pz.stack), usePrize=pd>0&&(stack||pd>Math.round(td)), desc=stack?td+pd:(usePrize?pd:td);
  var free=Number(data.config.envioGratisDesde)||0, envioPrize=!!(pz&&pz.envio&&co.entrega==="envio"&&!(free>0&&sub>=free)), gratis=co.entrega==="retiro"||(free>0&&sub>=free)||envioPrize;
  return {stack:stack,sub:sub,desc:desc,total:sub-desc,gratis:gratis,free:free,d:d,td:td,pd:pd,pz:pz,usePrize:usePrize,envioPrize:envioPrize,mysteryPrize:!!(pz&&pz.mystery)};
}
function coHeader(){return crumbs("Checkout")}
/* Teléfono argentino: código de área (11, 2xx, 3xx…) + número, sin 0 ni 15. Acepta +54 9, 0 y 15 y los normaliza. */
function phoneAR(raw){
  var d=String(raw||"").replace(/\D/g,""), bad="Revisá el teléfono: código de área sin 0 y número sin 15. Ej: 11 6247-3815";
  if(!d) return {ok:false,msg:"Poné tu teléfono"};
  if(d.indexOf("54")===0&&d.length>=12) d=d.slice(2);
  if(d.length===11&&d.charAt(0)==="9") d=d.slice(1);
  if(d.charAt(0)==="0") d=d.slice(1);
  function areaOk(x){return x.length===2?x==="11":/^[23]/.test(x)}
  if(d.length===12){for(var a=2;a<=4;a++){if(d.substr(a,2)==="15"&&areaOk(d.slice(0,a))){d=d.slice(0,a)+d.slice(a+2);break}}}
  if(d.length!==10||!/^(11|[23])/.test(d)) return {ok:false,msg:bad};
  if(d.slice(0,2)==="11"&&/[01]/.test(d.charAt(2))) return {ok:false,msg:bad};
  var L=d.slice(-8),run=function(st){for(var i=1;i<L.length;i++)if((+L[i])-(+L[i-1])!==st)return false;return true};
  if(/^(\d)\1+$/.test(d.slice(2))||/^(\d)\1+$/.test(d.slice(4))||run(1)||run(-1)) return {ok:false,msg:"Ese número no parece real. Revisalo."};
  var pretty=d.slice(0,2)==="11"?"11 "+d.slice(2,6)+"-"+d.slice(6):d.slice(0,3)+" "+d.slice(3,6)+"-"+d.slice(6);
  return {ok:true,digits:d,pretty:pretty};
}
function markField(input,msg){var l=input.closest(".cf");if(!l)return;var em=l.querySelector("em");l.classList.toggle("err",!!msg);input.setAttribute("aria-invalid",msg?"true":"false");if(msg){if(!em){em=document.createElement("em");l.appendChild(em)}em.textContent=msg}else if(em)em.remove()}
function fld(key,label,type,extra,full){
  return '<label class="cf'+(full?" full":"")+(coErr[key]?" err":"")+'"><span>'+label+'</span><input data-co="'+key+'" '+(type?'type="'+type+'"':"")+' value="'+esc(co[key])+'" '+(extra||"")+'>'+(coErr[key]?'<em>'+esc(coErr[key])+'</em>':"")+'</label>';
}
function renderCheckout(){
  clearInterval(timer);
  if(payView){renderPayView();return}
  validCart();
  if(PAYON&&PAYON.pagos){if(co.pago==="transferencia")co.pago="mercadopago"}else if(co.pago==="mercadopago")co.pago="transferencia";
  var u=me();
  if(u){ if(!co.nombre) co.nombre=u.nombre; if(!co.email) co.email=u.email; if(!co.telefono&&u.telefono) co.telefono=u.telefono;
    migrateAcc(u); var A=u.direcciones[0]; if(A&&!co.direccion){co.direccion=A.direccion||"";co.depto=A.depto||"";co.localidad=A.localidad||"";co.cp=A.cp||""} }
  if(coDone){
    var viaWa=/^https:\/\/wa\.me\//.test(String(coDone));
    app.innerHTML=coHeader()+'<main class="wrap co-done"><div class="co-ok">✓</div>'+(viaWa?'<h1>Solicitud preparada</h1><p>Tu pedido queda pendiente de confirmación y pago. Enviá el detalle por WhatsApp para coordinarlo. Si no se abrió, tocá el botón.</p>':'<h1>¡Recibimos tu pedido!</h1>'+(coDoneCode?'<p class="co-code">Pedido N° <b>'+esc(coDoneCode)+'</b></p>':'')+'<p>Te vamos a escribir'+(coDoneTel?' al WhatsApp <b>'+esc(coDoneTel)+'</b>':'')+' para confirmar disponibilidad y coordinar el pago y la entrega.</p>')+'<div class="co-done-btns">'+(viaWa?'<a class="btn btn-wa" target="_blank" rel="noopener" href="'+esc(coDone)+'">Abrir WhatsApp</a>':'')+(u?'<button class="btn btn-ghost" id="goAccount">Ver mis pedidos</button>':'')+'<button class="btn btn-ghost" data-nav="inicio">Volver al inicio</button></div></main><div class="toast" id="toast"></div>';
    return;
  }
  if(!cart.length){
    app.innerHTML=coHeader()+'<main class="wrap co-done"><h1>Tu carrito está vacío</h1><p>Agregá alguna camiseta para finalizar la compra.</p><div class="co-done-btns"><button class="btn btn-ink" data-nav="inicio">Volver a la tienda</button></div></main><div class="toast" id="toast"></div>';
    return;
  }
  var T=coTotals(), cuotas=Number(data.config.cuotas)||0;
  var items=cart.map(function(l){var p=byId(l.id);return '<div class="co-item"><div class="art">'+art(p)+'<span class="co-q">'+l.cant+'</span></div><div><strong>'+esc(p.club)+'</strong><span class="hint">'+esc(p.titulo)+' · '+(isPre(p)?'Por pedido ≈ 30 días':'En stock')+' · Talle '+esc(l.talle)+(l.pers?' · '+esc(persText(l.pers)):'')+'</span></div><strong>'+money(linePrice(l)*l.cant)+'</strong></div>'}).join("");
  function opt(group,val,title,sub){return '<label class="co-opt'+(co[group]===val?" on":"")+'"><input type="radio" name="'+group+'" data-co="'+group+'" value="'+val+'" '+(co[group]===val?"checked":"")+'><span><b>'+title+'</b>'+(sub?'<small>'+sub+'</small>':"")+'</span></label>'}
  app.innerHTML=coHeader()+'<main class="wrap co"><h1 class="co-title">Tu pedido</h1>'+cartAlert()+cartDelivery()+'<div class="co-grid"><div class="co-form">'+
    '<section class="co-box"><h2>1. Tus datos</h2><div class="co-fields">'+fld("nombre","Nombre y apellido","","autocomplete=\"name\"",true)+fld("telefono","Teléfono / WhatsApp","tel","autocomplete=\"tel\" inputmode=\"tel\" maxlength=\"22\" placeholder=\"Ej: 11 6247-3815\"")+fld("email","Email","email","autocomplete=\"email\"")+'</div></section>'+
    '<section class="co-box"><h2>2. Entrega</h2><div class="co-opts">'+opt("entrega","envio","Envío a domicilio",esc(data.config.envios||"A todo el país")+(T.free>0?" · gratis desde "+money(T.free):""))+opt("entrega","retiro","Retiro",esc(data.config.zona||"A coordinar"))+'</div>'+
      (co.entrega==="envio"?'<div class="co-fields">'+fld("direccion","Dirección","","autocomplete=\"address-line1\"")+fld("depto","Número de departamento (opcional)","","autocomplete=\"address-line2\" placeholder=\"Ej: 4B\"")+fld("localidad","Localidad / provincia","","autocomplete=\"address-level2\"")+fld("cp","Código postal","","autocomplete=\"postal-code\" inputmode=\"numeric\"")+'</div>':"")+'</section>'+
    '<section class="co-box"><h2>3. Pago</h2><div class="co-opts">'+(PAYON&&PAYON.pagos?payOptions(T,opt):opt("pago","transferencia","Transferencia bancaria",(T.d?T.d+"% off · ":"")+"Mercado Pago, Ualá, MODO o tu banco")+opt("pago","tarjeta","Tarjeta débito o crédito","")+(co.pago==="tarjeta"?'<p class="hint">Coordinamos un enlace de pago después de confirmar tu pedido. No ingreses datos de tarjeta acá.</p>':"")+(co.entrega==="retiro"?opt("pago","efectivo","Efectivo","Al retirar"):""))+'</div>'+
      '<label class="cf full"><span>Notas (opcional)</span><input data-co="notas" value="'+esc(co.notas)+'" placeholder="Algo que tengamos que saber"></label></section>'+
  '</div><aside class="co-sum"><h2>Tu pedido</h2>'+items+'<div class="co-rows"><div><span>Subtotal</span><span>'+money(T.sub)+'</span></div>'+(T.stack?(T.td?'<div class="co-desc"><span>Descuento '+offN()+'</span><span>−'+money(T.td)+'</span></div>':"")+(T.pd?'<div class="co-desc"><span>Premio ruleta · '+esc(prizeLabel(T.pz))+'</span><span>−'+money(T.pd)+'</span></div>':""):T.desc?'<div class="co-desc"><span>'+(T.usePrize?'Premio ruleta · '+esc(prizeLabel(T.pz)):'Descuento '+offN())+'</span><span>−'+money(T.desc)+'</span></div>':"")+''+(T.mysteryPrize?'<div class="co-desc"><span>Mystery Box · premio ruleta</span><span>De regalo</span></div>':'')+'<div'+(T.envioPrize?' class="co-desc"':'')+'><span>Envío'+(T.envioPrize?' · premio ruleta':'')+'</span><span>'+(T.gratis?"Gratis":"A coordinar")+'</span></div><div class="co-total"><span>Total</span><span>'+money(T.total)+'</span></div></div>'+
    checkoutGame()+(hasPreCart()?'<label class="pre-ack"><input id="acceptLeadTime" type="checkbox" '+(co.aceptaEspera?'checked':'')+'> Entiendo que los encargos tardan aproximadamente 30 días desde la confirmación, más la entrega local, y que el plazo puede variar.</label>'+(coErr.espera?'<p class="import-error" role="alert">'+esc(coErr.espera)+'</p>':''):'')+'<div class="co-notes">'+cartNotes()+'</div><label class="terms-ok'+(coErr.terms?" err":"")+'"><input type="checkbox" id="termsOk" '+(co.terms?"checked":"")+'><span>He leído y acepto los <button class="inline-link" data-legal="terminos">Términos y condiciones</button> y la <button class="inline-link" data-legal="privacidad">Política de privacidad</button>.</span></label>'+(coErr.terms?'<p class="terms-err">'+esc(coErr.terms)+'</p>':"")+payButton()+(PAYON&&PAYON.pagos&&co.pago!=="efectivo"?'':'<p class="hint">'+(waNumber()?'Al confirmar te abrimos WhatsApp con el pedido completo para coordinar el pago y la entrega.':'Al confirmar te escribimos a tu WhatsApp para coordinar el pago y la entrega.')+'</p>')+'</aside></div></main><div class="toast" id="toast"></div>';
}
function coConfirm(){
  if(validCart()){renderCheckout();toast("Revisá el carrito actualizado antes de continuar");return}
  if(!cart.length){renderCheckout();return}
  coErr={};
  if(!co.nombre.trim()) coErr.nombre="Poné tu nombre";
  var ph=phoneAR(co.telefono); if(!ph.ok) coErr.telefono=ph.msg; else co.telefono=ph.pretty;
  if(!String(co.email).trim()) coErr.email="Poné tu email";
  else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(co.email).trim())) coErr.email="Revisá el email";
  if(co.entrega==="envio"){ if(!co.direccion.trim()) coErr.direccion="Falta la dirección"; if(!co.localidad.trim()) coErr.localidad="Falta la localidad"; if(!String(co.cp).trim()) coErr.cp="Falta el código postal"; }
  var cardOk=true;
  if(hasPreCart()&&!co.aceptaEspera)coErr.espera="Confirmá que leíste el plazo de los encargos";
  if(!co.terms) coErr.terms="Tenés que aceptar los términos y condiciones para continuar";
  if(Object.keys(coErr).length||!cardOk){renderCheckout();var f=app.querySelector(".cf.err input")||app.querySelector(".terms-ok.err input")||app.querySelector("#acceptLeadTime");if(f){f.focus();f.scrollIntoView({block:"center"})}return}
  if(PAYON&&PAYON.pagos&&co.pago!=="efectivo"){payOnline(coTotals());return}
  var n=waNumber();
  var T=coTotals(), pagos={transferencia:"Transferencia bancaria",tarjeta:"Tarjeta débito o crédito",efectivo:"Efectivo"};
  var msg="Hola! Quiero confirmar este pedido:\n"+cart.map(function(l){var p=byId(l.id);return "• "+l.cant+" x "+p.club+" "+p.titulo+" ["+(isPre(p)?"POR PEDIDO ≈ 30 días":"EN STOCK")+"] (talle "+l.talle+(l.pers?", "+persText(l.pers):"")+") "+money(linePrice(l)*l.cant)}).join("\n")+
    "\n\nSubtotal: "+money(T.sub)+(T.stack?(T.td?"\nDescuento transferencia: -"+money(T.td):"")+(T.pd?"\nPremio ruleta "+prizeLabel(T.pz)+" (código "+T.pz.r.code+"): -"+money(T.pd):""):T.desc?(T.usePrize?"\nPremio ruleta "+prizeLabel(T.pz)+" en "+T.pz.prod.club+" (código "+T.pz.r.code+"): -":"\nDescuento transferencia: -")+money(T.desc):"")+"\nTotal: "+money(T.total)+
    "\n\nNombre: "+co.nombre+"\nTeléfono: "+co.telefono+"\nEmail: "+co.email+
    (T.mysteryPrize?"\nMystery Box de regalo (premio ruleta, código "+T.pz.r.code+")":"")+"\nEntrega: "+(co.entrega==="envio"?"Envío a "+co.direccion+(co.depto?" (depto "+co.depto+")":"")+", "+co.localidad+" ("+co.cp+")"+(T.envioPrize?" — envío gratis (premio ruleta, código "+T.pz.r.code+")":T.gratis?" — envío gratis":""):"Retiro")+
    (hasPreCart()?"\nEncargos: acepto plazo estimado de 30 días desde confirmación, más entrega local. Si hay stock y encargo, coordinar envíos separados.":"")+"\nPago: "+pagos[co.pago]+(co.notas?"\nNotas: "+co.notas:"");
  var code="LO"+new Date().toISOString().slice(2,10).replace(/-/g,"")+"-"+String(Date.now()).slice(-4);
  msg="Pedido N° "+code+"\n"+msg;
  var href=n?"https://wa.me/"+n+"?text="+encodeURIComponent(msg):"";
  if(href){try{window.open(href,"_blank","noopener")}catch(e){}}
  sendOrder({tipo:"pedido",codigo:code,nombre:co.nombre,telefono:co.telefono,email:co.email,entrega:co.entrega==="envio"?"Envío a "+co.direccion+(co.depto?" (depto "+co.depto+")":"")+", "+co.localidad+" ("+co.cp+")":"Retiro",pago:pagos[co.pago],total:Math.round(T.total),detalle:msg,fecha:new Date().toISOString()},!!href);
  coDoneCode=code;
  coDoneTel=co.telefono;
  var u=me();
  if(u){
    migrateAcc(u); u.pedidos=u.pedidos||[];
    var info={fecha:Date.now(),total:T.total,estado:"pendiente",pago:pagos[co.pago],entrega:co.entrega==="envio"?"Envío a "+co.direccion+(co.depto?" (depto "+co.depto+")":"")+", "+co.localidad:"Retiro",items:cartSnapshot()};
    var o=co.pendingId&&u.pedidos.find(function(x){return x.id===co.pendingId});
    if(o) Object.assign(o,info); else u.pedidos.push(Object.assign({id:"LO"+new Date().toISOString().slice(2,10).replace(/-/g,"")+String(Date.now()).slice(-5)},info));
    co.pendingId=null; saveCo();
    if(!u.telefono) u.telefono=co.telefono;
    if(co.entrega==="envio"&&!u.direcciones.some(function(a){return a.direccion===co.direccion})) u.direcciones.push({nombre:co.nombre,telefono:co.telefono,direccion:co.direccion,depto:co.depto,localidad:co.localidad,cp:co.cp});
    saveAccounts();
  }
  if((T.usePrize||T.envioPrize||T.mysteryPrize)&&spinRecord){spinRecord.used=true;try{localStorage.setItem('laonce-ruleta-demo',JSON.stringify(spinRecord))}catch(e){}}
  cart=[]; saveCart(); coDone=href||"recibido"; renderCheckout(); scrollTo(0,0);
}

function render(){ validCart();if(view==="game")renderGame();else if(view==="account") renderAccount(); else if(view==="checkout") renderCheckout(); else if(view==="legal") renderLegal(); else if(view==="admin") renderAdmin(); else if(view==="catalog") renderCatalog(); else renderHome(); }
/* Cambia la dirección sin cortar la navegación: algunos visores (link publicado, vistas previas en el celular) no permiten tocar el historial */
function setHash(h,replace){try{history[replace?'replaceState':'pushState'](null,'',h)}catch(e){}}
function go(k,fromHistory){
 if(String(k).indexOf('legal-')===0){goLegal(String(k).slice(6),fromHistory);return}
 clearTimeout(qTimer);filt=emptyFilters();sec=['stock','pedido','destacado'].includes(k)?k:'todo';
 if(k==='inicio'){view='home'}else if(k==='ruleta'){view='game'}else if(k==='socios'){view='admin'}else{view='catalog';if(CATS.includes(k))filt.categoria=k;if(EPOCAS.includes(k))filt.epoca=k;if(k==='retro-sudamerica'){filt.epoca='Retro';filt.categoria='Sudamérica'}if(k==='oferta')filt.oferta=true;if(k==='nuevo')filt.nuevo=true}
 if(!fromHistory&&location.hash!=='#'+k)setHash('#'+encodeURIComponent(k));
 render();scrollTo(0,0);
}
window.addEventListener('popstate',function(){go(decodeURIComponent(location.hash.slice(1))||'inicio',true)});
app.addEventListener("click",function(e){
  var t=e.target,b;
  if(t.closest("#customRequest")){openCustomRequest();return}
  if(t.closest("#previewImport")){previewImport();return}
  if(t.closest("#commitImport")){commitImport();return}
  if(t.closest("#exportCatalog")){exportCatalog();return}
  if((b=t.closest("[data-nav]"))){go(b.dataset.nav);return}
  if((b=t.closest("[data-remove-filter]"))){var key=b.dataset.removeFilter;filt[key]=emptyFilters()[key];refreshCatalog();return}
  if(t.closest("#coConfirm")){coConfirm();return}
  if((b=t.closest("[data-legal]"))){goLegal(b.dataset.legal);return}
  if(t.closest("#arrSend")){sendArrepentimiento();return}
  if((b=t.closest("[data-auth]"))){openAuth(b.dataset.auth);return}
  if(t.closest("#goAccount")){goAcc("resumen");return}
  if((b=t.closest("[data-accp]"))){goAcc(b.dataset.accp);return}
  if(t.closest("#addAddr")){addrEdit="new";renderAccount();return}
  if(t.closest("#cancelAddr")){addrEdit=null;renderAccount();return}
  if(t.closest("#saveAddr")){saveAddr();return}
  if((b=t.closest("[data-adm]"))){addrEdit=+b.dataset.adm;renderAccount();return}
  if((b=t.closest("[data-adx]"))){if(confirm("¿Eliminar esta dirección?")){me().direcciones.splice(+b.dataset.adx,1);saveAccounts();renderAccount()}return}
  if(t.closest("#savePw")){savePassword();return}
  if((b=t.closest("[data-cq]"))&&!b.disabled){var cl=cart[+b.dataset.cq];cl.cant+=+b.dataset.d;validCart();saveCart();updateBadge(false);renderAccount();return}
  if((b=t.closest("[data-crm]"))){cart.splice(+b.dataset.crm,1);saveCart();updateBadge(false);renderAccount();return}
  if((b=t.closest("[data-cfav]"))){toggleFav(b.dataset.cfav,renderAccount);return}
  if(t.closest("#cartCheckout")){startCheckout();return}
  if(t.closest("#logout")){logout();return}
  if(t.closest("#editProfile")){editProfile=true;renderAccount();return}
  if(t.closest("#cancelProfile")){editProfile=false;renderAccount();return}
  if(t.closest("#saveProfile")){saveProfileFromForm();return}
  if((b=t.closest("[data-od]"))){openOrder=openOrder===b.dataset.od?null:b.dataset.od;renderAccount();return}
  if((b=t.closest("[data-pay]"))){payOrder(b.dataset.pay);return}
  if((b=t.closest("[data-jump]"))){var el=document.getElementById(b.dataset.jump);if(el)el.scrollIntoView({behavior:"smooth"});return}
  if((b=t.closest("[data-dir]"))){setSlide((slide+(+b.dataset.dir)+SLIDES.length)%SLIDES.length);startTimer();return}
  if((b=t.closest("[data-slide]"))){setSlide(+b.dataset.slide);startTimer();return}
  if((b=t.closest("[data-open]"))){openDetail(b.dataset.open);return}
  if((b=t.closest("[data-talle]"))){filt.talle=filt.talle===b.dataset.talle?null:b.dataset.talle;renderCatalog();return}
  if(t.closest("#prizeBar")){if(cart.some(function(l){var p=byId(l.id);return p&&!isPre(p)}))openBag();else go("stock");return}
  if(t.closest("#openBag")){openBag();return}
  if(t.closest("#clear")){clearTimeout(qTimer);filt=emptyFilters();sec="todo";refreshCatalog();return}
  if(t.closest("#howto")){openHowTo();return}
  if(t.closest("#goAdmin")){view="admin";setHash("#socios",true);render();scrollTo(0,0);return}
  if(t.closest("#add")){
    data.productos.unshift({id:uid(),club:"Club",titulo:"Modelo",categoria:"Sudamérica",epoca:"Actual",precio:60000,precioAnterior:0,patron:{tipo:"liso",c1:"#FFFFFF",c2:"#0F2A5C"},foto:null,stock:{S:0,M:0,L:0,XL:0,XXL:0},destacado:false,nuevo:true});
    dirty=true;renderAdmin();var fi=app.querySelector('.tbl input[data-k="club"]');if(fi){fi.focus();fi.select()}return}
  if((b=t.closest("[data-del]"))){var p=data.productos[+b.dataset.del];if(confirm("¿Borrar "+p.club+" "+p.titulo+"?")){data.productos.splice(+b.dataset.del,1);dirty=true;renderAdmin()}return}
  if((b=t.closest("[data-tnophoto]"))){data.tiles[+b.dataset.tnophoto].foto=null;dirty=true;renderAdmin();return}
  if((b=t.closest("[data-nophoto]"))){data.productos[+b.dataset.nophoto].foto=null;dirty=true;renderAdmin();return}
  if(t.closest("#discard")){data=clone(saved);dirty=false;adminMsg=null;renderAdmin();return}
  if(t.closest("#save")){save();return}
});
var qTimer=null;
app.addEventListener("input",function(e){
  var t=e.target;
  if(t.classList.contains("search")){
    var query=t.value;filt=emptyFilters();filt.q=query;sec="todo";view="catalog";clearTimeout(qTimer);
    qTimer=setTimeout(function(){
      view="catalog";sec="todo";
      var pos=t.selectionStart; render(); var s=app.querySelector(".search"); if(s){s.focus();try{s.setSelectionRange(pos,pos)}catch(_){}}
    },200);
    return;
  }
  if(t.dataset.tile&&t.tagName!=="SELECT"){data.tiles[+t.dataset.tile][t.dataset.tk]=t.value;markDirty();return}
  if(t.dataset.arr){arrData[t.dataset.arr]=t.value;if(arrErr[t.dataset.arr]){delete arrErr[t.dataset.arr];var la=t.closest(".cf");la.classList.remove("err");var ea=la.querySelector("em");if(ea)ea.remove()}return}
  if(t.dataset.co&&t.type!=="radio"){co[t.dataset.co]=t.value;if(coErr[t.dataset.co]){delete coErr[t.dataset.co];var l=t.closest(".cf");if(l){l.classList.remove("err");var em=l.querySelector("em");if(em)em.remove()}}saveCo();return}
  if(t.dataset.c){data.config[t.dataset.c]=t.type==="number"?Number(t.value)||0:t.value;markDirty();return}
  if(t.dataset.k&&t.type!=="checkbox"&&t.tagName!=="SELECT"&&t.type!=="color"){
    var p=data.productos[+t.dataset.i],k=t.dataset.k,v=t.value;
    if(t.type==="number"){v=Math.max(0,Math.floor(Number(v)||0));t.classList.toggle("zero",k.indexOf("stock.")===0&&v===0)}
    setPath(p,k,v);markDirty();
  }
});
app.addEventListener("change",function(e){
  var t=e.target;
  if(t.id==='acceptLeadTime'){co.aceptaEspera=t.checked;return}
  if(t.id==="termsOk"){co.terms=t.checked;if(t.checked&&coErr.terms){delete coErr.terms;var tl=t.closest(".terms-ok");tl.classList.remove("err");var te=app.querySelector(".terms-err");if(te)te.remove()}return}
  if(t.dataset.preSize!=null){var pre=data.productos[+t.dataset.preSize];pre.tallesPedido=pre.tallesPedido||[];if(t.checked&&!pre.tallesPedido.includes(t.value))pre.tallesPedido.push(t.value);else if(!t.checked)pre.tallesPedido=pre.tallesPedido.filter(function(s){return s!==t.value});markDirty();return}
  if(t.dataset.k==='modalidad'){var pre=data.productos[+t.dataset.i];if(t.value==='pedido'&&!pre.tallesPedido)pre.tallesPedido=SIZES.slice()}
  if(t.dataset.co==="telefono"){var ph=phoneAR(t.value);if(ph.ok){t.value=ph.pretty;co.telefono=ph.pretty;saveCo();delete coErr.telefono;markField(t,"")}else if(t.value.trim()){coErr.telefono=ph.msg;markField(t,ph.msg)}return}
  if(t.dataset.co&&t.type==="radio"){co[t.dataset.co]=t.value;if(co.entrega!=="retiro"&&co.pago==="efectivo")co.pago=PAYON&&PAYON.pagos?"mercadopago":"transferencia";delete coErr.pay;saveCo();renderCheckout();return}
  if(t.dataset.filter){var key=t.dataset.filter;filt[key]=t.type==="checkbox"?t.checked:t.value;refreshCatalog();return}
  if(t.id==="sort"){filt.orden=t.value;refreshCatalog();return}
  if(t.dataset.tile&&t.tagName==="SELECT"){data.tiles[+t.dataset.tile][t.dataset.tk]=t.value;dirty=true;renderAdmin();return}
  if(t.dataset.tphoto!=null&&t.files&&t.files[0]){var ti=+t.dataset.tphoto;resizePhoto(t.files[0],function(url){data.tiles[ti].foto=url;dirty=true;renderAdmin()},1000);return}
  if(t.dataset.photo!=null&&t.files&&t.files[0]){var i=+t.dataset.photo;resizePhoto(t.files[0],function(url){data.productos[i].foto=url;dirty=true;renderAdmin()});return}
  if(t.dataset.k){
    var p=data.productos[+t.dataset.i];
    if(t.type==="checkbox") setPath(p,t.dataset.k,t.checked);
    else if(t.tagName==="SELECT"||t.type==="color") setPath(p,t.dataset.k,t.value);
    markDirty(); if(t.tagName==="SELECT"||t.type==="color") renderAdmin();
  }
});
window.addEventListener("beforeunload",function(e){if(dirty&&!busy){e.preventDefault();e.returnValue=""}});
document.addEventListener("visibilitychange",startTimer);
matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",startTimer);
/* Modalidades. El límite de encargo es de compra, nunca inventario del proveedor. */
function isPre(p){return !!p&&p.modalidad==='pedido'}
function capacity(p,s){return isPre(p)?(p.activo!==false&&(p.tallesPedido||[]).includes(s)?5:0):Math.max(0,Math.floor(Number((p.stock||{})[s])||0))}
function available(p){return isPre(p)?SIZES.reduce(function(n,s){return n+capacity(p,s)},0):total(p)}
function modeBadge(p){return '<span class="mode-badge'+(isPre(p)?' pre':'')+'">'+(isPre(p)?'POR PEDIDO · ≈ 30 DÍAS':'EN STOCK')+'</span>'}
function deliveryInfo(p){return isPre(p)?'<div class="delivery-note pre"><b>Esta camiseta se trae por encargo.</b><p>Plazo estimado: 30 días desde la confirmación, más la entrega local. Puede variar por transporte o aduana. Confirmamos modelo, talle y precio antes del pago.</p><p>Foto de referencia del proveedor. Precio final en pesos. Nombre y número opcionales en «Agregar adicionales».</p></div>':'<div class="delivery-note"><b>Sale de nuestro stock.</b><p>Coordinamos despacho o retiro al confirmar el pedido. El plazo de entrega depende de tu localidad.</p></div>'}
function hasPreCart(){return cart.some(function(l){return isPre(byId(l.id))})}
function cartDelivery(){var pre=hasPreCart(),st=cart.some(function(l){return !isPre(byId(l.id))});return '<div class="delivery-note'+(pre?' pre':'')+'"><b>'+ (pre?(st?'Tu pedido combina dos tiempos de entrega':'Tu pedido es por encargo'):'Tu pedido sale de stock')+'</b><p>'+(pre?'Los encargos demoran aproximadamente 30 días desde la confirmación, más la entrega local. '+(st?'Las prendas en stock pueden salir antes; coordinamos si preferís uno o dos envíos y su costo.':'Confirmamos disponibilidad y precio antes del pago.'):'Confirmamos disponibilidad y coordinamos el envío o retiro antes del pago.')+'</p></div>'}
function modeIntro(){return '<section class="mode-intro"><span class="eyebrow">Dos formas de encontrar la tuya</span><h1>La misma pasión. Vos elegís cómo.</h1><div class="mode-grid"><button class="mode-link" data-nav="stock"><span class="eyebrow">La querés ahora</span><strong>En stock</strong><p>Camisetas que ya tenemos. Elegí tu talle y coordiná la entrega.</p><span class="go-arrow" aria-hidden="true">↗</span></button><button class="mode-link pre" data-nav="pedido"><span class="eyebrow">La espera vale la pena</span><strong>Por pedido</strong><p>Más modelos, menor precio. La traemos para vos en aproximadamente un mes.</p><span class="go-arrow" aria-hidden="true">↗</span></button></div><p class="prototype-note">Precios finales en pesos · Stock sujeto a disponibilidad.</p></section>'}
function clubInvite(){return '<section class="club-invite"><div><span class="eyebrow">La ruleta de La ONCE</span><h2>Probá tu suerte.</h2><p>Descuentos, envío gratis y una Mystery Box en juego. Girá gratis cada 3 días.</p></div><button class="btn" data-nav="ruleta">Ir a la ruleta ↗</button></section>'}
function requestShirt(){return '<section class="request-shirt"><div><h3>¿Tenés una camiseta en mente?</h3><p>Decinos el club, el año y el talle. La buscamos por vos.</p></div><button class="btn btn-ghost" id="customRequest">Pedir otro modelo ↗</button></section>'}
function catalogIntro(){var pre=sec==='pedido';return '<section class="catalog-intro"><span class="eyebrow">'+(pre?'Elegida por vos · Traída por nosotros':'La ONCE Kits')+'</span><h1>'+(pre?'Tu próxima camiseta puede esperar.':sec==='stock'?'La querés. La tenemos.':sec==='destacado'?'Las elegidas de La ONCE.':'Encontrá la tuya.')+'</h1><p>'+(pre?'Un catálogo más amplio, a un precio menor. Elegís el modelo y el talle; nosotros nos encargamos de traerlo. Aproximadamente un mes desde la confirmación.':sec==='stock'?'Modelos para coordinar envío o retiro sin esperar una importación.':'Buscá por club, época o talle. Cada modelo indica si está en stock o se trae por pedido.')+'</p>'+(pre?'<div class="pre-steps"><span><b>01</b> Elegís tu camiseta</span><span><b>02</b> Confirmamos y coordinamos el pago</span><span><b>03</b> La recibís en ≈ 30 días + entrega local</span></div>':'')+'<p class="prototype-note">'+(pre?'Modelos seleccionados de nuestros proveedores · Confirmamos disponibilidad antes del pago.':'Precios finales en pesos · Stock sujeto a disponibilidad.')+'</p></section>'}
function openCustomRequest(){var d=document.getElementById('dlg');d.innerHTML='<form class="custom-form"><button type="button" class="close" aria-label="Cerrar">×</button><span class="eyebrow">La buscamos por vos</span><h2>¿Cuál te falta?</h2><p>Sin compromiso. Primero confirmamos si se puede conseguir y cuánto cuesta.</p><label>Club o selección<input name="club" required maxlength="100" placeholder="Ej.: Racing"></label><label>Año, versión o detalles<input name="modelo" required maxlength="180" placeholder="Ej.: titular 2001, manga corta"></label><label>Talle<select name="talle">'+SIZES.map(function(s){return '<option>'+s+'</option>'}).join('')+'</select></label><label>Enlace de referencia (opcional)<input type="url" name="url" placeholder="https://…" maxlength="1000"></label><button class="btn btn-ink" type="submit">Consultar por WhatsApp</button><p class="hint" role="status"></p></form>';d.querySelector('.close').onclick=function(){d.close()};d.querySelector('form').onsubmit=function(e){e.preventDefault();var n=waNumber();if(!n){d.querySelector('[role=status]').textContent='Falta configurar el WhatsApp del negocio. Tu consulta todavía no se envió.';return}var f=new FormData(e.target),u=String(f.get('url')||'');if(u&&!/^https?:\/\//i.test(u)){d.querySelector('[role=status]').textContent='Usá un enlace que empiece con https://';return}window.open('https://wa.me/'+n+'?text='+encodeURIComponent('Hola, busco una camiseta por pedido.\nClub: '+f.get('club')+'\nModelo: '+f.get('modelo')+'\nTalle: '+f.get('talle')+(u?'\nReferencia: '+u:'')+'\nSé que la demora estimada es de un mes desde la confirmación.'),'_blank','noopener')};d.showModal()}

/* @include pagos.js */
/* @include ruleta.js */
co.aceptaEspera=false;delete co.dni;
go(decodeURIComponent(location.hash.slice(1))||'inicio',true);
payReturn();
loadSheet();
loadPayConfig();
})();
