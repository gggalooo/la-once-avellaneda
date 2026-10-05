const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const gallery = vm.createContext({});
vm.runInContext(read('src/galeria.js'), gallery);
assert.equal(gallery.safePhoto('javascript:alert(1)'), '');
assert.equal(gallery.safePhoto('data:image/svg+xml;base64,AAAA'), '');
assert.equal(gallery.productPhotos({foto:'https://example.com/a.jpg',fotos:['https://example.com/a.jpg','https://example.com/b.jpg']}).length, 2);
assert.equal(gallery.productPhotos({fotos:Array.from({length:9},(_,i)=>'https://example.com/'+i+'.jpg')}).length, 6);
let product={foto:'https://example.com/old.jpg'};
gallery.setProductPhotos(product,['https://example.com/new.jpg']);
assert.equal(product.foto,'https://example.com/new.jpg');
gallery.setProductPhotos(product,[]); assert.equal(product.foto,null);
let email='';
const editor=vm.createContext({
 Session:{getActiveUser:()=>({getEmail:()=>email})},
 SpreadsheetApp:{getActiveSpreadsheet:()=>({getOwner:()=>({getEmail:()=> 'owner@example.com'})})},
 PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='SOCIOS'?'["partner@example.com"]':null})},
 Utilities:{base64Decode:value=>Array.from(Buffer.from(value,'base64'))},
 TALLES:['S','M','L','XL','XXL']
});
vm.runInContext(read('planilla/editor.gs'),editor);
assert.throws(()=>editor.getEditorProducts(),/iniciá sesión/);
email='stranger@example.com';
assert.throws(()=>editor.saveEditorProduct({}),/no tiene acceso/);
email='owner@example.com';assert.equal(editor.autorizar_().owner,true);
email='partner@example.com';assert.equal(editor.autorizar_().owner,false);
const valid={club:'River',titulo:'Retro',modalidad:'stock',categoria:'Sudamérica',epoca:'Retro',precio:100,fotos:[],activo:true};
assert.equal(editor.validarProducto_(valid).precio,100);
assert.throws(()=>editor.validarProducto_({...valid,precio:-1}),/precio/);
assert.throws(()=>editor.validarProducto_({...valid,fotos:['javascript:alert(1)']}),/Foto/);
assert.throws(()=>editor.validarProducto_({...valid,fotos:[{data:'data:image/png;base64,YWJj'}]}),/foto válida/);
editor.leerProductos_=()=>[{id:'a',activo:'SI',club:'River',_revision:'private',_fila:2,email:'private'},{id:'b',activo:'NO'}];
const publicRows=editor.catalogoPublico_();
assert.equal(publicRows.length,1);assert.equal(publicRows[0]._revision,undefined);assert.equal(publicRows[0].email,undefined);
new vm.Script(read('planilla/instalar.gs'));
const panel=read('planilla/Panel.html').match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(panel);
console.log('OK: galería, límites, acceso privado, validación de fotos y catálogo público.');
