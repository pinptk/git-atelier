'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const host = process.argv.find(arg=>arg.startsWith('--host='))?.slice(7) || '127.0.0.1';
const allowed = new Set(['index.html','git-atelier.html','styles.css','app.js','git-engine.js']);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server = http.createServer((req,res)=>{
  const pathname = new URL(req.url,'http://localhost').pathname;
  const filename = pathname==='/'?'index.html':pathname.slice(1);
  if(!allowed.has(filename)){res.writeHead(404);res.end('Not found');return;}
  fs.readFile(path.join(__dirname,filename),(error,content)=>{
    if(error){res.writeHead(500);res.end('Unable to read file');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(filename)],'Cache-Control':'no-store'});res.end(content);
  });
});
server.on('error',error=>{console.error('Git Atelier:',error.message);process.exitCode=1;});
server.listen(5173,host,()=>{
  console.log('Git Atelier: http://'+(host==='0.0.0.0'?'127.0.0.1':host)+':5173/git-atelier.html');
  if(host==='0.0.0.0')for(const addresses of Object.values(os.networkInterfaces()))for(const address of addresses||[]){
    if(address.family==='IPv4'&&!address.internal)console.log('LAN: http://'+address.address+':5173/git-atelier.html');
  }
});
