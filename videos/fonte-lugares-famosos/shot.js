const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=__dirname;
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));
 fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'text/html'});r.end(d);});}).listen(8125);
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('console',m=>console.log('LOG',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto('http://localhost:8125/index.html');await p.waitForFunction('window.ready',null,{timeout:120000});
 const mode=process.argv[2];
 if(mode==='preview'){for(const t of process.argv.slice(3)){await p.evaluate(t=>renderAt(+t),t);await p.screenshot({path:`prev_${t}.jpg`,quality:80});}}
 else{const fps=30,TOT=await p.evaluate(()=>TOTAL),N=Math.round(TOT*fps);fs.mkdirSync('frames',{recursive:true});const t0=Date.now();
  for(let i=0;i<N;i++){await p.evaluate(t=>renderAt(t),i/fps);await p.screenshot({path:`frames/f${String(i).padStart(5,'0')}.jpg`,type:'jpeg',quality:92});
   if(i%150==0)console.log(i,((Date.now()-t0)/1000).toFixed(0)+'s');}}
 await b.close();srv.close();})();
