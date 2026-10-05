const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'planilla', name), 'utf8').replace(/\r\n/g, '\n');
const content = '// Instalación: pegar este archivo completo en Apps Script de la planilla privada.\n' + read('codigo-apps-script.txt') + '\n' + read('editor.gs') + '\nvar PANEL_HTML = ' + JSON.stringify(read('Panel.html')) + ';\n';
const target = path.join(root, 'planilla', 'instalar.gs');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) throw Error('Ejecutá npm run build para actualizar instalar.gs.');
} else fs.writeFileSync(target, content);
