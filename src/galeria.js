/* Fotos del producto: portada compatible con `foto`, hasta seis vistas en `fotos`. */
function safePhoto(value){
 var s=String(value||'').trim();
 return /^(https:\/\/[^\s]+|data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+|assets\/[a-z0-9._/-]+\.(?:png|jpe?g|webp))$/i.test(s)?s:'';
}
function productPhotos(p){
 return [p.foto].concat(Array.isArray(p.fotos)?p.fotos:[]).map(safePhoto).filter(function(s,i,a){return s&&a.indexOf(s)===i}).slice(0,6);
}
function setProductPhotos(p,photos){p.fotos=photos.slice(0,6);p.foto=p.fotos[0]||null}
function productGallery(p,index){
 var photos=productPhotos(p);if(!photos.length)return '<div class="product-gallery" aria-label="Imagen de prueba de '+esc(p.club)+'"><div class="gallery-stage gallery-placeholder"><div class="art">'+art(p)+'</div><span class="gallery-zoom-label">Imagen de prueba · Foto pendiente</span></div></div>';
 index=Math.min(index,photos.length-1);
 var name=p.club+' '+p.titulo;
 return '<div class="product-gallery" aria-label="Fotos de '+esc(name)+'">'+
 '<button type="button" class="gallery-stage" data-gallery-zoom aria-pressed="false" aria-label="Ampliar foto '+(index+1)+' de '+esc(name)+'"><img src="'+esc(photos[index])+'" alt="'+esc(name)+' · Foto '+(index+1)+'" decoding="async"><span class="gallery-zoom-label">＋ Ampliar</span></button>'+
 (photos.length>1?'<div class="gallery-controls"><button type="button" data-gallery-step="-1" aria-label="Foto anterior">‹</button><span aria-live="polite">Foto '+(index+1)+' de '+photos.length+'</span><button type="button" data-gallery-step="1" aria-label="Foto siguiente">›</button></div><div class="gallery-thumbs" aria-label="Elegir foto">'+photos.map(function(src,i){return '<button type="button" data-gallery-index="'+i+'" aria-label="Ver foto '+(i+1)+'" aria-pressed="'+(i===index)+'"><img src="'+esc(src)+'" alt="" loading="lazy"></button>'}).join('')+'</div>':'')+'</div>';
}
function editorPhotos(p,i){
 var photos=productPhotos(p);
 return '<div class="editor-photos">'+photos.map(function(src,n){return '<div><img src="'+esc(src)+'" alt="Foto '+(n+1)+'"><div><button type="button" data-photo-cover="'+i+':'+n+'" '+(n===0?'disabled':'')+' aria-label="Usar foto '+(n+1)+' como portada">'+(n===0?'Portada':'Portada ↑')+'</button><button type="button" data-photo-remove="'+i+':'+n+'" aria-label="Quitar foto '+(n+1)+'">×</button></div></div>'}).join('')+
 (photos.length<6?'<label class="photo-upload">＋ Fotos<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-photo="'+i+'"></label>':'')+'<small>'+photos.length+'/6 fotos</small></div>';
}
function readProductPhoto(file){
 return new Promise(function(resolve,reject){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)){reject(Error('Elegí fotos JPG, PNG o WebP.'));return}
  if(file.size>12*1024*1024){reject(Error('Cada foto puede pesar hasta 12 MB.'));return}
  var url=URL.createObjectURL(file),img=new Image();
  img.onload=function(){
   try{var s=Math.min(1,1400/Math.max(img.width,img.height)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(img.width*s));cv.height=Math.max(1,Math.round(img.height*s));cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);resolve(cv.toDataURL('image/webp',.9))}catch(e){reject(Error('No pudimos preparar la foto.'))}finally{URL.revokeObjectURL(url)}
  };
  img.onerror=function(){URL.revokeObjectURL(url);reject(Error('No se pudo abrir una de las fotos.'))};img.src=url;
 });
}
