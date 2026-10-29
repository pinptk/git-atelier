'use strict';
// Bundle a fully offline, portable HTML. Source files remain easy to edit.
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const css=read('styles.css').replace(/^@import[^\r\n]*(?:\r?\n|$)/,'');
const script=name=>'<script>\n'+read(name).replace(/<\/script/gi,'<\\/script')+'\n</script>';
const html=read('index.html')
  .replace('  <link rel="stylesheet" href="styles.css">',()=>'  <style>\n'+css+'\n</style>')
  .replace('  <script src="git-engine.js" defer></script>\n','')
  .replace('  <script src="app.js" defer></script>\n','')
  .replace('</body>',()=>script('git-engine.js')+'\n'+script('app.js')+'\n</body>');
fs.writeFileSync(path.join(__dirname,'git-atelier.html'),html,'utf8');
console.log('Created git-atelier.html — self-contained and offline.');
