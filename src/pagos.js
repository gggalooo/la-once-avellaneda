/* ---------- Pagos online con Mercado Pago (solo en la tienda publicada en Netlify) ----------
   La página nunca toca datos de tarjeta: usa el formulario seguro de Mercado Pago.
   Los precios, descuentos y premios los recalcula el servidor; el stock se descuenta cuando Mercado Pago acredita el pago. */
var PAYON=null, payView=null, payBusy=false, payPoll=null, cardCtl=null, mpSdk=null;
function offN(){return PAYON&&PAYON.pagos?'Mercado Pago':'transferencia'}
function offW(){return (PAYON&&PAYON.pagos?'con ':'por ')+offN()}
function loadPayConfig(){
  if(!/^https?:$/.test(location.protocol))return;
  fetch('/api/config',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){
    if(!j||typeof j!=='object'||!('pagos' in j))return;
    PAYON={pagos:!!(j.pagos&&j.publicKey),publicKey:String(j.publicKey||''),ruleta:!!j.ruleta};
    if(view!=='admin'&&!spinBusy&&!payView&&!(view==='checkout'&&document.activeElement&&app.contains(document.activeElement)&&/INPUT|TEXTAREA/.test(document.activeElement.tagName)))render();
  }).catch(function(){});
}
function payApi(path,body){
  return fetch(path,{method:body?'POST':'GET',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined}).then(function(r){
    return r.json().catch(function(){return {}}).then(function(j){if(!r.ok&&!j.estado)throw Error(j.error||'No pudimos conectarnos. Probá de nuevo en un momento.');return j});
  },function(){throw Error('No hay conexión. Revisá internet y probá de nuevo.')});
}
function savePend(p){try{if(p)localStorage.setItem('laonce-pago',JSON.stringify(p));else localStorage.removeItem('laonce-pago')}catch(e){}}
function loadPend(){try{return JSON.parse(localStorage.getItem('laonce-pago')||'null')}catch(e){return null}}

function payOptions(T,opt){
  return opt('pago','mercadopago','Mercado Pago',(T.d?'<b class="pay-tag">'+T.d+'% OFF</b> ':'')+'Pagás en la app con el dinero de tu cuenta')+
    opt('pago','tarjeta','Tarjeta de débito, crédito o prepaga','Visa, Mastercard, American Express y más')+
    (co.entrega==='retiro'?opt('pago','efectivo','Efectivo','Al retirar · te escribimos para coordinar'):'')+
    '<p class="pay-safe"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>Pago seguro procesado por Mercado Pago. Tus datos de tarjeta no pasan por nuestra página.</p>';
}
function payButton(){
  var on=PAYON&&PAYON.pagos&&co.pago!=='efectivo';
  var label=!on?'Confirmar pedido':co.pago==='tarjeta'?'Pagar con tarjeta':'Pagar con Mercado Pago';
  return (coErr.pay?'<p class="pay-err" role="alert">'+esc(coErr.pay)+'</p>':'')+
    '<button class="btn btn-ink co-confirm'+(on&&co.pago==='mercadopago'?' btn-mp':'')+'" id="coConfirm"'+(payBusy?' disabled':'')+'>'+(payBusy?'Preparando el pago…':label)+'</button>'+
    (on?'<p class="hint">'+(co.pago==='tarjeta'?'Cargás tu tarjeta en el formulario seguro de Mercado Pago y el pedido queda confirmado al instante.':'Te llevamos a Mercado Pago con el monto ya cargado. Cuando se acredita, tu pedido queda confirmado.')+' El envío se coordina aparte'+(coTotals().gratis?' (el tuyo es gratis)':'')+'.</p>':'');
}
function buyerData(){
  return {nombre:co.nombre.trim(),email:String(co.email).trim(),telefono:co.telefono,entrega:co.entrega,direccion:co.direccion,depto:co.depto,localidad:co.localidad,cp:co.cp,notas:co.notas||''};
}
function payOnline(T){
  if(payBusy)return;
  var r0=activeSpin(), metodo=co.pago==='tarjeta'?'tarjeta':'mercadopago';
  payBusy=true; delete coErr.pay;
  var btn=app.querySelector('#coConfirm'); if(btn){btn.disabled=true;btn.textContent='Preparando el pago…'}
  payApi('/api/pedido',{metodo:metodo,comprador:buyerData(),items:cart.map(function(l){return {id:l.id,talle:l.talle,cant:l.cant,pers:l.pers||null}}),premioToken:r0&&!r0.used&&r0.token?r0.token:null}).then(function(r){
    if(!r.codigo)throw Error(r.error||'No pudimos iniciar el pago.');
    savePend({codigo:r.codigo,total:r.total,metodo:metodo,premio:!!r.premio,pagoUrl:r.pagoUrl||'',at:Date.now()});
    recordOrder(r.codigo,r.total,metodo==='tarjeta'?'Tarjeta':'Mercado Pago','pendiente');
    var diff=Math.abs(r.total-Math.round(T.total))>1;
    if(metodo==='mercadopago'){
      if(!/^https:\/\/([a-z0-9-]+\.)*mercadopago\.com(\.ar)?\//.test(String(r.pagoUrl||'')))throw Error('No pudimos abrir Mercado Pago. Probá de nuevo.');
      if(r.avisoPremio||diff){payBusy=false;payNotice(r,function(){goMp(r.pagoUrl)});return}
      goMp(r.pagoUrl);
    }else{payBusy=false;renderCheckout();openCardPay(r)}
  }).catch(function(e){payBusy=false;coErr.pay=e.message;renderCheckout();var b=app.querySelector('.pay-err');if(b)b.scrollIntoView({block:'center'})});
}
function goMp(url){var b=app.querySelector('#coConfirm');if(b){b.disabled=true;b.textContent='Abriendo Mercado Pago…'}location.href=url;setTimeout(function(){payBusy=false;if(view==='checkout'&&!payView)renderCheckout()},8000)}
function payNotice(r,go){
  var d=document.getElementById('dlg');if(!d)return go();
  d.innerHTML='<div class="howto pay-note"><button class="close" aria-label="Cerrar">×</button><span class="eyebrow">Antes de pagar</span><h2>Total: '+money(r.total)+'</h2><p>'+(r.avisoPremio?esc(r.avisoPremio)+' ':'')+'Revisamos precios y descuentos y este es el total final de tu pedido.</p><button class="btn btn-ink btn-mp" id="payGo">Pagar '+money(r.total)+' con Mercado Pago</button></div>';
  d.onclick=function(e){if(e.target===d||e.target.closest('.close')){d.close();renderCheckout();return}if(e.target.closest('#payGo')){d.close();go()}};d.showModal();
}
function recordOrder(codigo,total,pagoTxt,estado){
  var u=me();if(!u)return;migrateAcc(u);u.pedidos=u.pedidos||[];
  var o=u.pedidos.find(function(x){return x.id===codigo})||(co.pendingId&&u.pedidos.find(function(x){return x.id===co.pendingId&&x.estado==='pendiente'}));
  var info={id:codigo,fecha:Date.now(),total:total,estado:estado,pago:pagoTxt,entrega:co.entrega==='envio'?'Envío a '+co.direccion+(co.depto?' (depto '+co.depto+')':'')+', '+co.localidad:'Retiro',items:cartSnapshot()};
  if(o)Object.assign(o,info);else u.pedidos.push(info);
  co.pendingId=codigo;saveCo();
  if(!u.telefono)u.telefono=co.telefono;
  if(co.entrega==='envio'&&!u.direcciones.some(function(a){return a.direccion===co.direccion}))u.direcciones.push({nombre:co.nombre,telefono:co.telefono,direccion:co.direccion,depto:co.depto,localidad:co.localidad,cp:co.cp});
  saveAccounts();
}

/* ----- Tarjeta: formulario seguro de Mercado Pago (Card Payment Brick) ----- */
function loadMpSdk(){
  if(window.MercadoPago)return Promise.resolve();
  if(mpSdk)return mpSdk;
  mpSdk=new Promise(function(ok,bad){var s=document.createElement('script');s.src='https://sdk.mercadopago.com/js/v2';s.onload=ok;s.onerror=function(){mpSdk=null;s.remove();bad(Error('No pudimos cargar el formulario de pago. Revisá tu conexión y probá de nuevo.'))};document.head.appendChild(s)});
  return mpSdk;
}
function openCardPay(r){
  var d=document.getElementById('payDlg');
  if(!d){d=document.createElement('dialog');d.id='payDlg';d.className='pay-dlg';document.body.appendChild(d)}
  d.innerHTML='<div class="pay-box"><button class="close" aria-label="Cerrar">×</button><span class="eyebrow">Pago con tarjeta</span><h2>'+money(r.total)+'</h2><p class="pay-sub">Pedido N° <b>'+esc(r.codigo)+'</b>'+(r.avisoPremio?'<br>'+esc(r.avisoPremio):'')+'</p><div id="cardBrick" class="card-brick"><p class="pay-loading"><span class="spin" aria-hidden="true"></span>Cargando formulario seguro…</p></div><p class="pay-msg" role="status" aria-live="polite"></p><p class="pay-safe"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>Procesado por Mercado Pago. Aceptamos Visa, Mastercard y otras, también prepagas.</p></div>';
  d.querySelector('.close').onclick=function(){closeCard(d,true)};
  d.oncancel=function(e){e.preventDefault();closeCard(d,true)};
  if(!d.open)d.showModal();
  mountCard(r,d);
}
function mountCard(r,d){
  var msg=d.querySelector('.pay-msg');
  if(cardCtl){try{cardCtl.unmount()}catch(e){}cardCtl=null}
  loadMpSdk().then(function(){
    if(!d.open)return null;
    var box=d.querySelector('#cardBrick');box.innerHTML='';
    var mp=new window.MercadoPago(PAYON.publicKey,{locale:'es-AR'}), cq=Number(data.config.cuotas)||0;
    return mp.bricks().create('cardPayment','cardBrick',{
      initialization:{amount:r.total,payer:{email:String(co.email).trim()}},
      customization:{paymentMethods:{maxInstallments:cq>1?cq:1}},
      callbacks:{
        onReady:function(){},
        onSubmit:function(cardData){
          msg.className='pay-msg';msg.textContent='Procesando el pago…';
          return payApi('/api/pagar-tarjeta',{codigo:r.codigo,card:cardData}).then(function(res){cardResult(res,r,d)},function(e){cardRetry(e.message,r,d)});
        },
        onError:function(err){if(err&&err.type==='critical'){msg.className='pay-msg err';msg.textContent='El formulario de pago tuvo un problema. Cerralo y probá de nuevo.'}}
      }
    });
  }).then(function(c){if(c){if(d.open)cardCtl=c;else{try{c.unmount()}catch(e){}}}}).catch(function(e){msg.className='pay-msg err';msg.textContent=e.message});
}
function cardResult(res,r,d){
  if(res.estado==='pagado'||res.estado==='revisar'){closeCard(d);paidDone(r.codigo,res.estado);return}
  if(res.estado==='pendiente'){closeCard(d);showPay(r.codigo,'pendiente');pollPay(r.codigo,0);return}
  cardRetry(res.motivo||res.error||'El pago fue rechazado.',r,d);
}
function cardRetry(t,r,d){
  var m=d.querySelector('.pay-msg');if(m){m.className='pay-msg err';m.textContent=t+' Podés probar de nuevo o con otra tarjeta.'}
  setTimeout(function(){if(d.open)mountCard(r,d)},60);
}
function closeCard(d,byUser){
  if(cardCtl){try{cardCtl.unmount()}catch(e){}cardCtl=null}
  if(d.open)d.close();
  if(byUser)toast('El pago quedó sin hacer. Podés intentarlo de nuevo cuando quieras.');
}

/* ----- Resultado del pago ----- */
function paidDone(codigo,estado){
  var p=loadPend();
  if(p&&p.codigo===codigo&&p.premio&&spinRecord){spinRecord.used=true;try{localStorage.setItem('laonce-ruleta-demo',JSON.stringify(spinRecord))}catch(e){}}
  var u=me();if(u&&u.pedidos){var o=u.pedidos.find(function(x){return x.id===codigo});if(o){o.estado='pagado';saveAccounts()}}
  if(p&&p.codigo===codigo){cart=[];saveCart();updateBadge(false);co.pendingId=null;saveCo();savePend(null)}
  showPay(codigo,estado);
}
function showPay(codigo,estado){var p=loadPend();payView={codigo:codigo,estado:estado,metodo:p&&p.codigo===codigo?p.metodo:'',pagoUrl:p&&p.codigo===codigo?p.pagoUrl:''};view='checkout';renderCheckout();scrollTo(0,0)}
function renderPayView(){
  var v=payView,u=me(),h,txt,btns='';
  var tel=co.telefono?' al WhatsApp <b>'+esc(co.telefono)+'</b>':'';
  if(v.estado==='pagado'){h='¡Pago aprobado!';txt='Tu pedido está confirmado. Te escribimos'+tel+' para coordinar la entrega.'}
  else if(v.estado==='revisar'){h='Recibimos tu pago';txt='Lo estamos verificando. Te escribimos'+tel+' para confirmar el pedido y coordinar la entrega.'}
  else if(v.estado==='rechazado'){h='El pago no se completó';txt='No se hizo ningún cobro. Podés intentarlo de nuevo con Mercado Pago o con tarjeta.';
    btns=(v.pagoUrl?'<a class="btn btn-ink btn-mp" href="'+esc(v.pagoUrl)+'">Reintentar con Mercado Pago</a>':'')+'<button class="btn '+(v.pagoUrl?'btn-ghost':'btn-ink')+'" id="payBack">Volver al checkout</button>'}
  else{h='Confirmando tu pago…';txt='Estamos esperando la confirmación de Mercado Pago. Puede tardar unos segundos. Si ya pagaste, no hace falta que vuelvas a pagar.';btns='<button class="btn btn-ghost" id="payCheck">Actualizar</button>'}
  var ok=v.estado==='pagado'||v.estado==='revisar', bad=v.estado==='rechazado';
  app.innerHTML=coHeader()+'<main class="wrap co-done pay-result"><div class="co-ok'+(bad?' bad':ok?'':' wait')+'">'+(ok?'✓':bad?'!':'<span class="spin" aria-hidden="true"></span>')+'</div><h1>'+h+'</h1><p class="co-code">Pedido N° <b>'+esc(v.codigo)+'</b></p><p>'+txt+'</p><div class="co-done-btns">'+btns+(ok&&u?'<button class="btn btn-ghost" id="goAccount">Ver mis pedidos</button>':'')+(bad?'':'<button class="btn '+(ok?'btn-ink':'btn-ghost')+'" id="payHome">Volver al inicio</button>')+'</div></main><div class="toast" id="toast"></div>';
  var b;
  if((b=app.querySelector('#payHome')))b.onclick=function(){clearTimeout(payPoll);payView=null;go('inicio')};
  if((b=app.querySelector('#payBack')))b.onclick=function(){clearTimeout(payPoll);payView=null;coDone=false;view='checkout';renderCheckout();scrollTo(0,0)};
  if((b=app.querySelector('#payCheck')))b.onclick=function(){pollPay(v.codigo,0)};
  if((b=app.querySelector('#goAccount')))b.addEventListener('click',function(){payView=null});
}
function pollPay(codigo,n,vuelta){
  clearTimeout(payPoll);
  payApi('/api/pedido-estado?codigo='+encodeURIComponent(codigo)).then(function(j){
    if(!payView||payView.codigo!==codigo)return;
    if(j.estado==='pagado'||j.estado==='revisar'){paidDone(codigo,j.estado);return}
    if(j.estado==='rechazado'||(vuelta==='error'&&j.estado==='esperando_pago'&&n>=1)){payView.estado='rechazado';renderCheckout();return}
    if(n<24)payPoll=setTimeout(function(){pollPay(codigo,n+1,vuelta)},n<8?2500:5000);
  }).catch(function(){if(payView&&payView.codigo===codigo&&n<24)payPoll=setTimeout(function(){pollPay(codigo,n+1,vuelta)},5000)});
}
/* Vuelta desde Mercado Pago: /?pedido=LO...&r=ok|pendiente|error */
function payReturn(){
  var q;try{q=new URLSearchParams(location.search)}catch(e){return}
  var codigo=q.get('pedido');if(!codigo||!/^LO\d{6}-[0-9A-F]{6}$/.test(codigo))return;
  var r=q.get('r')||'';
  try{history.replaceState(null,'',location.pathname)}catch(e){}
  showPay(codigo,'verificando');pollPay(codigo,0,r);
}
