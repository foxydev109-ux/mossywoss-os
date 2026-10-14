// Full game implementations for MossyWoss OS — compact but complete
(function(){
function reg(id,name,desc,icon,fn){MWO.registerApp({id:id,name:name,description:desc,icon:icon,category:'game',installed:false,launch:fn})}

// SNAKE
reg('snake','Serpent','Classic serpent game','🐍',function(){
var w=MWO.wm.create({id:'snake-'+Date.now(),title:'Serpent',icon:'🐍',width:360,height:420,x:120,y:40,resizable:false});
w.innerHTML="<div style='display:flex;flex-direction:column;height:100%;align-items:center;background:#0a0a1a;justify-content:center'><div style='font-size:.9em;color:#888;margin-bottom:8px'>Score: <span id='sns' style='color:#e94560;font-weight:700'>0</span></div><canvas id='snc' width='320' height='320' style='border:1px solid rgba(255,255,255,.1);border-radius:4px;cursor:pointer'></canvas><div style='font-size:.72em;color:#555;margin-top:8px'>Arrows/Swipe | Tap to start</div></div>";
var cv=w.querySelector('#snc'),cx=cv.getContext('2d'),se=w.querySelector('#sns');
var G=16,S=20,sn=[{x:8,y:8}],d={x:1,y:0},nd={x:1,y:0},f={x:5,y:5},sc=0,on=false,sp=150,lp=null;
function pf(){f.x=Math.floor(Math.random()*G);f.y=Math.floor(Math.random()*G)}
function dr(){cx.fillStyle='#0a0a1a';cx.fillRect(0,0,320,320);cx.fillStyle='#e94560';cx.beginPath();cx.arc(f.x*S+10,f.y*S+10,8,0,Math.PI*2);cx.fill();cx.fillStyle='#16a085';sn.forEach(function(s){cx.fillRect(s.x*S+1,s.y*S+1,S-2,S-2)})}
function st(){if(lp)clearInterval(lp);sn=[{x:8,y:8}];d={x:1,y:0};nd={x:1,y:0};sc=0;se.textContent='0';sp=150;pf();on=true;lp=setInterval(tk,sp);dr()}
function tk(){d=nd;var h={x:sn[0].x+d.x,y:sn[0].y+d.y};if(h.x<0||h.x>=G||h.y<0||h.y>=G||sn.some(function(s){return s.x===h.x&&s.y===h.y})){clearInterval(lp);on=false;cx.fillStyle='rgba(0,0,0,.7)';cx.fillRect(0,0,320,320);cx.fillStyle='#e94560';cx.font='18px sans-serif';cx.textAlign='center';cx.fillText('Game Over! '+sc,160,150);cx.fillText('Tap to restart',160,175);return}sn.unshift(h);if(h.x===f.x&&h.y===f.y){sc++;se.textContent=sc;pf();if(sp>70)sp-=3,clearInterval(lp),lp=setInterval(tk,sp)}else sn.pop();dr()}
document.addEventListener('keydown',function(e){if(!on&&e.key===' '){st();return}if(e.key==='ArrowUp'&&d.y===0)nd={x:0,y:-1};if(e.key==='ArrowDown'&&d.y===0)nd={x:0,y:1};if(e.key==='ArrowLeft'&&d.x===0)nd={x:-1,y:0};if(e.key==='ArrowRight'&&d.x===0)nd={x:1,y:0}});
var ts=null;cv.addEventListener('touchstart',function(e){e.preventDefault();if(!on){st();return}ts={x:e.touches[0].clientX,y:e.touches[0].clientY}},{passive:false});
cv.addEventListener('touchend',function(e){if(!ts)return;var dx=e.changedTouches[0].clientX-ts.x,dy=e.changedTouches[0].clientY-ts.y;if(Math.abs(dx)>Math.abs(dy)){if(dx>0&&d.x===0)nd={x:1,y:0};if(dx<0&&d.x===0)nd={x:-1,y:0}}else{if(dy>0&&d.y===0)nd={x:0,y:1};if(dy<0&&d.y===0)nd={x:0,y:-1}}ts=null},{passive:false});
cv.addEventListener('click',function(){if(!on)st()});
dr();cx.fillStyle='#888';cx.font='14px sans-serif';cx.textAlign='center';cx.fillText('Tap or Space to start',160,160)
});

// 2048
reg('game-2048','2048','Slide & merge numbers','🎲',function(){
var w=MWO.wm.create({id:'g2-'+Date.now(),title:'2048',icon:'🎲',width:340,height:420,x:100,y:30,resizable:false});
w.innerHTML="<div style='display:flex;flex-direction:column;height:100%;align-items:center;background:#0a0a1a;padding:10px'><div style='font-size:.85em;color:#888;margin-bottom:8px'>Score: <span id='g2s' style='color:#e94560;font-weight:700'>0</span></div><div id='g2g' style='display:grid;grid-template-columns:repeat(4,72px);gap:4px;background:rgba(255,255,255,.04);padding:6px;border-radius:8px'></div><div style='font-size:.72em;color:#555;margin-top:8px'>Arrows/Swipe to move</div></div>";
var ge=w.querySelector('#g2g'),se=w.querySelector('#g2s');
var b=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],sc=0;
var co={0:'#1a1a2e',2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e'};
function rd(){ge.innerHTML='';for(var r=0;r<4;r++)for(var c=0;c<4;c++){var v=b[r][c],t=document.createElement('div');t.style.cssText='width:72px;height:72px;display:flex;align-items:center;justify-content:center;border-radius:6px;font-weight:700;font-size:'+(v>100?'1em':v>0?'1.3em':'0')+';background:'+(co[v]||'#3c3a32')+';color:'+(v<=4?'#776e65':'#f9f6f2');t.textContent=v||'';ge.appendChild(t)}se.textContent=sc}
function ar(){var e=[];for(var r=0;r<4;r++)for(var c=0;c<4;c++)if(!b[r][c])e.push([r,c]);if(!e.length)return;var p=e[Math.floor(Math.random()*e.length)];b[p[0]][p[1]]=Math.random()<.9?2:4}
function sl(r){var a=r.filter(function(v){return v});for(var i=0;i<a.length-1;i++)if(a[i]===a[i+1])a[i]*=2,a[i+1]=0,sc+=a[i];a=a.filter(function(v){return v});while(a.length<4)a.push(0);return a}
function mv(d){var o=JSON.stringify(b);if(d==='left')b=b.map(sl);else if(d==='right')b=b.map(function(r){return sl(r.reverse()).reverse()});else if(d==='up'){for(var c=0;c<4;c++){var col=sl([b[0][c],b[1][c],b[2][c],b[3][c]]);for(var r=0;r<4;r++)b[r][c]=col[r]}}else if(d==='down'){for(var c=0;c<4;c++){var col=sl([b[3][c],b[2][c],b[1][c],b[0][c]]);for(var r=0;r<4;r++)b[3-r][c]=col[r]}}if(JSON.stringify(b)!==o){ar();rd()}}
document.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')mv('left');if(e.key==='ArrowRight')mv('right');if(e.key==='ArrowUp')mv('up');if(e.key==='ArrowDown')mv('down')});
var ts=null;w.addEventListener('touchstart',function(e){ts={x:e.touches[0].clientX,y:e.touches[0].clientY}},{passive:true});
w.addEventListener('touchend',function(e){if(!ts)return;var dx=e.changedTouches[0].clientX-ts.x,dy=e.changedTouches[0].clientY-ts.y;if(Math.abs(dx)>20)mv(dx>0?'right':'left');else if(Math.abs(dy)>20)mv(dy>0?'down':'up');ts=null},{passive:true});
ar();ar();rd()
});

// TIC-TAC-TOE
reg('tictactoe','Tic-Tac-Toe','Beat the unbeatable AI','⭕',function(){
var w=MWO.wm.create({id:'ttt-'+Date.now(),title:'Tic-Tac-Toe',icon:'⭕',width:300,height:360,x:150,y:40,resizable:false});
w.innerHTML="<div style='display:flex;flex-direction:column;height:100%;align-items:center;background:#0a0a1a;padding:10px'><div style='font-size:.82em;color:#888;margin-bottom:10px'>You ❌ vs AI ⭕ | Wins:<span id='tw' style='color:#16a085'>0</span> Losses:<span id='tl' style='color:#e94560'>0</span></div><div id='tg' style='display:grid;grid-template-columns:repeat(3,80px);gap:4px'></div><button class='mw-btn' id='tn' style='margin-top:12px;padding:8px 20px;font-size:.85em'>New Game</button></div>";
var g=w.querySelector('#tg'),we=w.querySelector('#tw'),le=w.querySelector('#tl');
var b=['','','','','','','','',''],wp=0,lp=0,ov=false;
var W=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function ck(p){return W.some(function(w){return b[w[0]]===p&&b[w[1]]===p&&b[w[2]]===p})}
function rd(){g.innerHTML='';b.forEach(function(v,i){var c=document.createElement('div');c.style.cssText='width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:2.5em;cursor:pointer;background:rgba(255,255,255,.04);border-radius:6px;color:'+(v==='❌'?'#16a085':v==='⭕'?'#e94560':'transparent');c.textContent=v||'';c.onclick=function(){if(b[i]||ov)return;b[i]='❌';rd();if(ck('❌')){ov=true;wp++;we.textContent=wp;MWO.notif.show('Tic-Tac-Toe','You win!');return}if(b.every(function(c){return c})){ov=true;MWO.notif.show('Tic-Tac-Toe','Draw!');return}setTimeout(ai,300)};g.appendChild(c)})}
function ai(){var bs=mm(b,'⭕');if(bs.idx>=0){b[bs.idx]='⭕';rd();if(ck('⭕')){ov=true;lp++;le.textContent=lp;MWO.notif.show('Tic-Tac-Toe','AI wins!')}}}
function mm(b,p){if(ck('❌'))return{score:-10};if(ck('⭕'))return{score:10};if(b.every(function(c){return c}))return{score:0};var bs=p==='⭕'?{score:-999}:{score:999};for(var i=0;i<9;i++){if(b[i])continue;b[i]=p;var s=mm(b,p==='⭕'?'❌':'⭕').score;b[i]='';if(p==='⭕'){if(s>bs.score)bs={idx:i,score:s}}else{if(s<bs.score)bs={idx:i,score:s}}}return bs}
w.querySelector('#tn').onclick=function(){b=['','','','','','','','',''];ov=false;rd()};rd()
});

// PONG
reg('pong','Paddle Duel','Classic paddle vs AI','🏓',function(){
var w=MWO.wm.create({id:'pong-'+Date.now(),title:'Paddle Duel',icon:'🏓',width:480,height:380,x:80,y:40,resizable:false});
w.innerHTML="<canvas id='pc' width='480' height='340' style='display:block;background:#000;cursor:none'></canvas><div style='font-size:.72em;color:#555;text-align:center;padding:4px'>Mouse/touch to move | First to 11</div>";
var cv=w.querySelector('#pc'),cx=cv.getContext('2d');
var py=170,ay=170,bx=240,by=170,bvx=4,bvy=3,ps=0,as=0,raf=null;
cv.addEventListener('mousemove',function(e){py=Math.max(30,Math.min(310,e.offsetY))});
cv.addEventListener('touchmove',function(e){e.preventDefault();py=Math.max(30,Math.min(310,e.touches[0].clientY-cv.getBoundingClientRect().top))},{passive:false});
function lp(){bx+=bvx;by+=bvy;if(by<5||by>335)bvy=-bvy;if(bx<30&&bx>20&&by>py-30&&by<py+30){bvx=Math.abs(bvx)*1.05;bvy+=(by-py)*.1}if(bx>450&&bx<460&&by>ay-30&&by<ay+30){bvx=-Math.abs(bvx)*1.05;bvy+=(by-ay)*.1}ay+=(by-ay)*.05;ay=Math.max(30,Math.min(310,ay));if(bx<0)as++,rs(1);if(bx>480)ps++,rs(-1);cx.fillStyle='#000';cx.fillRect(0,0,480,340);cx.fillStyle='#fff';cx.fillRect(235,0,2,340);cx.fillStyle='#16a085';cx.fillRect(20,py-30,8,60);cx.fillStyle='#e94560';cx.fillRect(452,ay-30,8,60);cx.fillStyle='#fff';cx.beginPath();cx.arc(bx,by,6,0,Math.PI*2);cx.fill();cx.font='24px monospace';cx.textAlign='center';cx.fillStyle='#16a085';cx.fillText(ps,160,30);cx.fillStyle='#e94560';cx.fillText(as,320,30);if(ps>=11||as>=11){cancelAnimationFrame(raf);cx.fillStyle='rgba(0,0,0,.7)';cx.fillRect(0,0,480,340);cx.fillStyle=ps>=11?'#16a085':'#e94560';cx.font='28px sans-serif';cx.fillText((ps>=11?'You':'AI')+' Win!',240,170);return}if(w.isConnected)raf=requestAnimationFrame(lp)}
function rs(d){bx=240;by=170;bvx=3*d;bvy=3*(Math.random()-.5)*2}
raf=requestAnimationFrame(lp)
});

// FOX FLIGHT
reg('flappyfox','Fox Flight','Tap to flap a fox!','🦊',function(){
var w=MWO.wm.create({id:'ff-'+Date.now(),title:'Fox Flight',icon:'🦊',width:340,height:480,x:100,y:30,resizable:false});
w.innerHTML="<canvas id='fc' width='320' height='440' style='display:block;background:linear-gradient(135deg,#0a0a1a,#0f3460);cursor:pointer'></canvas>";
var cv=w.querySelector('#fc'),cx=cv.getContext('2d');
var fy=220,fv=0,pp=[],sc=0,on=false,raf=null,sp=0;
function mk(){pp.push({x:320,y:Math.random()*200+80,gap:120});++sp};
function lp(){sp++;if(sp>90){sp=0;mk()}fv+=0.5;fy+=fv;pp.forEach(function(p){p.x-=3});pp=pp.filter(function(p){return p.x>-50});cx.fillStyle='#0a0a1a';cx.fillRect(0,0,320,440);pp.forEach(function(p){cx.fillStyle='#16a085';cx.fillRect(p.x,0,40,p.y);cx.fillRect(p.x,p.y+p.gap,40,440-p.y-p.gap)});cx.font='28px sans-serif';cx.fillText('🦊',140,fy);cx.fillStyle='#fff';cx.font='20px sans-serif';cx.textAlign='center';cx.fillText(sc,160,30);if(fy<0||fy>440||(pp.some(function(p){return 140>p.x&&140<p.x+40&&(fy<p.y||fy>p.y+p.gap)}))){cancelAnimationFrame(raf);on=false;cx.fillStyle='rgba(0,0,0,.7)';cx.fillRect(0,0,320,440);cx.fillStyle='#e94560';cx.font='24px sans-serif';cx.fillText('Score: '+sc,160,200);cx.fillText('Tap to restart',160,230);return}if(w.isConnected)raf=requestAnimationFrame(lp)}
function fl(){if(!on){fy=220;fv=0;pp=[];sc=0;sp=0;on=true;raf=requestAnimationFrame(lp)}fv=-8}
cv.addEventListener('click',fl);cv.addEventListener('touchstart',function(e){e.preventDefault();fl()},{passive:false});
cx.fillStyle='#fff';cx.font='16px sans-serif';cx.textAlign='center';cx.fillText('Tap to start',160,220)
});

// MINEFIELD
reg('minesweeper','Minefield','Classic mine puzzle','💣',function(){
var w=MWO.wm.create({id:'ms-'+Date.now(),title:'Minefield',icon:'💣',width:380,height:440,x:100,y:30,resizable:false});
w.innerHTML="<div style='display:flex;flex-direction:column;height:100%;align-items:center;background:#0a0a1a;padding:10px'><div style='font-size:.82em;color:#888;margin-bottom:8px'>💣 <span id='msm'>10</span> | ⏱️ <span id='mst'>0</span>s</div><div id='msg' style='display:grid;grid-template-columns:repeat(9,32px);gap:1px'></div></div>";
var g=w.querySelector('#msg'),me=w.querySelector('#msm'),te=w.querySelector('#mst');
var sz=9,mines=10,b=[],rv=[],fl=[],ov=false,t0=0,tc=null;
function init(){b=[];rv=[];fl=[];ov=false;t0=0;for(var i=0;i<sz*sz;i++){b.push(0);rv.push(false);fl.push(false)}var p=[];while(p.length<mines){var m=Math.floor(Math.random()*sz*sz);if(p.indexOf(m)<0)p.push(m)}p.forEach(function(m){b[m]=-1});for(var i=0;i<sz*sz;i++){if(b[i]===-1)continue;var r=Math.floor(i/sz),c=i%sz,n=0;for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){var nr=r+dr,nc=c+dc;if(nr>=0&&nr<sz&&nc>=0&&nc<sz&&b[nr*sz+nc]===-1)n++}b[i]=n}me.textContent=mines;clearInterval(tc);te.textContent='0';rd()}
function rd(){g.innerHTML='';for(var i=0;i<sz*sz;i++){var c=document.createElement('div');c.style.cssText='width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:.9em;cursor:pointer;user-select:none;background:'+(rv[i]?'#2a2a3e':'#1a1a2e')+';border:1px solid rgba(255,255,255,.06);color:'+(b[i]===-1?'#e94560':b[i]===0?'#888':['#4e4','#ec4','#e84','#a4f','#c4c','#e88','#48f','#f88'][b[i]-1]||'#888');c.textContent=rv[i]?(b[i]===-1?'💥':b[i]||''):(fl[i]?'🚩':'');if(!ov)(function(i){c.onclick=function(){if(fl[i])return;if(!t0){t0=Date.now();tc=setInterval(function(){te.textContent=Math.floor((Date.now()-t0)/1000)},500)}rv[i]=true;if(b[i]===-1){rv.forEach(function(v,j){rv[j]=true});ov=true;clearInterval(tc);rd();MWO.notif.show('Minefield','💥 BOOM!')}else if(b[i]===0)flood(i);rd()};c.oncontextmenu=function(e){e.preventDefault();fl[i]=!fl[i];var mc=mines-fl.filter(function(f){return f}).length;me.textContent=mc;rd()}})(i);g.appendChild(c)}}
function flood(i){rv[i]=true;var r=Math.floor(i/sz),c=i%sz;for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){var nr=r+dr,nc=c+dc,ni=nr*sz+nc;if(nr>=0&&nr<sz&&nc>=0&&nc<sz&&!rv[ni]&&b[ni]>=0){rv[ni]=true;if(b[ni]===0)flood(ni)}}}init()
});

// MEMORY MATCH
reg('memorymatch','Memory Match','Flip cards to find pairs','🃏',function(){
var w=MWO.wm.create({id:'mm-'+Date.now(),title:'Memory Match',icon:'🃏',width:380,height:420,x:100,y:30,resizable:false});
w.innerHTML="<div style='display:flex;flex-direction:column;height:100%;align-items:center;background:#0a0a1a;padding:10px'><div style='font-size:.82em;color:#888;margin-bottom:8px'>Moves: <span id='mmm' style='color:#e94560'>0</span> | Match: <span id='mmk' style='color:#16a085'>0</span>/8</div><div id='mmg' style='display:grid;grid-template-columns:repeat(4,72px);gap:6px'></div></div>";
var g=w.querySelector('#mmg'),me=w.querySelector('#mmm'),ke=w.querySelector('#mmk');
var em=['🦊','🐱','🐶','🦊','🐱','🐶','🐼','🦁','🐼','🦁','🐸','🦉','🐸','🦉','🐰','🐰'];
var cd=[],fc=[],mv=0,mt=0,ck=false;
function init(){em.sort(function(){return Math.random()-.5});cd=em.map(function(e,i){return{e:e,f:false,i:i}});fc=[];mv=0;mt=0;ke.textContent='0';me.textContent='0';rd()}
function rd(){g.innerHTML='';cd.forEach(function(c,i){var t=document.createElement('div');t.style.cssText='width:72px;height:72px;display:flex;align-items:center;justify-content:center;font-size:2em;cursor:pointer;background:rgba(255,255,255,.04);border-radius:8px';t.textContent=c.f?c.e:'❓';t.onclick=function(){if(c.f||ck)return;fc.push(i);c.f=true;rd();if(fc.length===2){mv++;me.textContent=mv;ck=true;var a=fc[0],b=fc[1];if(cd[a].e===cd[b].e){mt++;ke.textContent=mt;fc=[];ck=false;if(mt===8){setTimeout(function(){MWO.notif.show('Memory Match','You won in '+mv+' moves!')},200)}}else{setTimeout(function(){cd[a].f=false;cd[b].f=false;fc=[];ck=false;rd()},800)}}};g.appendChild(t)})}
init()
});

// BREAKOUT
reg('breakout','Breakout','Bounce ball break bricks','🧱',function(){
var w=MWO.wm.create({id:'bo-'+Date.now(),title:'Breakout',icon:'🧱',width:420,height:440,x:80,y:30,resizable:false});
w.innerHTML="<canvas id='bc' width='400' height='400' style='display:block;background:#0a0a1a'></canvas>";
var cv=w.querySelector('#bc'),cx=cv.getContext('2d');
var px=160,bx=200,by=350,bvx=3,bvy=-3,br=[],sc=0,lv=3,raf=null;
for(var r=0;r<5;r++)for(var c=0;c<10;c++)br.push({x:c*38+10,y:r*20+20,w:36,h:16,a:true,co:['#e94560','#f59563','#edcf72','#16a085','#0f3460'][r]});
cv.addEventListener('mousemove',function(e){px=Math.max(0,Math.min(330,e.offsetX-35))});
cv.addEventListener('touchmove',function(e){e.preventDefault();px=Math.max(0,Math.min(330,e.touches[0].clientX-cv.getBoundingClientRect().left-35))},{passive:false});
function lp(){bx+=bvx;by+=bvy;if(bx<5||bx>395)bvx=-bvx;if(by<5)bvy=-bvy;if(by>395){if(--lv<=0){cancelAnimationFrame(raf);cx.fillStyle='rgba(0,0,0,.7)';cx.fillRect(0,0,400,400);cx.fillStyle='#e94560';cx.font='24px sans-serif';cx.textAlign='center';cx.fillText('Game Over! '+sc,200,200);return}by=350;bx=200;bvx=3;bvy=-3}if(by>385&&bx>px&&bx<px+70)bvy=-Math.abs(bvy);br.forEach(function(b){if(b.a&&bx>b.x&&bx<b.x+b.w&&by>b.y&&by<b.y+b.h){b.a=false;bvy=-bvy;sc+=10}});cx.fillStyle='#0a0a1a';cx.fillRect(0,0,400,400);br.forEach(function(b){if(b.a){cx.fillStyle=b.co;cx.fillRect(b.x,b.y,b.w,b.h)}});cx.fillStyle='#16a085';cx.fillRect(px,395,70,5);cx.fillStyle='#fff';cx.beginPath();cx.arc(bx,by,5,0,Math.PI*2);cx.fill();cx.fillStyle='#888';cx.font='14px monospace';cx.fillText('Score:'+sc+' Lives:'+lv,5,15);if(br.every(function(b){return!b.a})){cancelAnimationFrame(raf);cx.fillStyle='#16a085';cx.font='24px sans-serif';cx.textAlign='center';cx.fillText('You Win! '+sc,200,200);return}if(w.isConnected)raf=requestAnimationFrame(lp)}
raf=requestAnimationFrame(lp)
});

// SUDOKU
reg('sudoku','Sudoku','Number placement puzzle','🔢',function(){
var w=MWO.wm.create({id:'sd-'+Date.now(),title:'Sudoku',icon:'🔢',width:380,height:460,x:80,y:30,resizable:false});
w.innerHTML="<div style='display:flex;flex-direction:column;height:100%;align-items:center;background:#0a0a1a;padding:10px'><div style='font-size:.82em;color:#888;margin-bottom:8px'>Sudoku</div><div id='sdg' style='display:grid;grid-template-columns:repeat(9,34px);gap:1px;background:rgba(255,255,255,.06)'></div><div style='display:flex;gap:4px;margin-top:10px'><button class='mw-btn' onclick='MWO.apps.sudoku.launch()' style='font-size:.8em;padding:6px 12px'>New</button><button class='mw-btn' onclick='document.dispatchEvent(new KeyboardEvent(\"keydown\",{key:\"Check\"}))' style='font-size:.8em;padding:6px 12px'>Check</button></div></div>";
var g=w.querySelector('#sdg');var b=[],o=[],sel=-1;
function gen(){var s=[5,3,0,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,4,2,8,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9];b=s.slice();o=s.map(function(v){return v!==0});rd()}
function rd(){g.innerHTML='';for(var i=0;i<81;i++){var r=Math.floor(i/9),c=i%9;var t=document.createElement('div');t.style.cssText='width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:.9em;cursor:pointer;background:'+(sel===i?'rgba(233,69,96,.2)':r%3===2&&c%3===2&&r<8&&c<8?'rgba(255,255,255,.02)':'transparent')+';border:'+(r%3===0?'1px solid rgba(255,255,255,.1)':'1px solid rgba(255,255,255,.03)')+';color:'+(o[i]?'#888':'#e94560');t.textContent=b[i]||'';(function(i){t.onclick=function(){sel=i;rd();var pn='';for(var n=1;n<=9;n++)pn+='<button class=\"mw-btn\" data-n=\"'+n+'\" style=\"padding:4px 8px;font-size:.8em;margin:2px\">'+n+'</button><button class=\"mw-btn\" data-n=\"0\" style=\"padding:4px 8px;font-size:.8em;margin:2px;color:#888\">✕</button>';var p=document.createElement('div');p.style.cssText='position:fixed;bottom:60px;left:50%;transform:translateX(-50%);display:flex;gap:2px;z-index:1000;background:rgba(22,33,62,.95);padding:8px;border-radius:8px;flex-wrap:wrap;max-width:300px;justify-content:center';p.innerHTML=pn;p.querySelectorAll('button').forEach(function(bt){bt.onclick=function(){if(!o[sel])b[sel]=parseInt(bt.dataset.n)||0;p.remove();rd()}});document.body.appendChild(p);}})(i);g.appendChild(t)}}
gen()
});

// BLOCKFALL
reg('tetris','Blockfall','Classic falling blocks','🟦',function(){
var w=MWO.wm.create({id:'ts-'+Date.now(),title:'Blockfall',icon:'🟦',width:340,height:500,x:100,y:30,resizable:false});
w.innerHTML="<div style='display:flex;height:100%;background:#0a0a1a;padding:10px;gap:10px'><canvas id='tsc' width='200' height='400' style='border:1px solid rgba(255,255,255,.1)'></canvas><div style='display:flex;flex-direction:column;gap:8px'><div style='font-size:.82em;color:#888'>Score:<br><span id='tss' style='color:#e94560;font-size:1.3em;font-weight:700'>0</span></div><div style='font-size:.82em;color:#888'>Level:<br><span id='tsl' style='color:#16a085;font-size:1.3em'>1</span></div><div style='font-size:.7em;color:#555'>←→ Move<br>↓ Drop<br>↑ Rotate<br>Space Hard drop</div></div></div>";
var cv=w.querySelector('#tsc'),cx=cv.getContext('2d'),se=w.querySelector('#tss'),le=w.querySelector('#tsl');
var W=10,H=20,S=20,bd=[],pc,px,py,pr,sc=0,lv=1,lp,timer=null;
var P=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[1,1,0],[0,1,1]],[[0,1,1],[1,1,0]]];
var co=['#16a085','#e94560','#f59563','#edcf72','#8a2be2','#0f3460','#e04890'];
for(var i=0;i<H;i++)bd.push(new Array(W).fill(-1));
function np(){pc=Math.floor(Math.random()*7);px=4;py=0;pr=0;if(coll()){sc=0;se.textContent=0;for(var r=0;r<H;r++)for(var c=0;c<W;c++)bd[r][c]=-1;lv=1;le.textContent=1;lp=1000;MWO.notif.show('Blockfall','Game Over!')}}
function sh(){return P[pc]}
function coll(){var s=sh();for(var r=0;r<s.length;r++)for(var c=0;c<s[r].length;c++){if(s[r][c]){var x=px+c,y=py+r;if(x<0||x>=W||y>=H)return true;if(y>=0&&bd[y][x]>=0)return true}}return false}
function lock(){var s=sh();for(var r=0;r<s.length;r++)for(var c=0;c<s[r].length;c++)if(s[r][c]&&py+r>=0)bd[py+r][px+c]=pc;var cl=[];for(var r=H-1;r>=0;r--){if(bd[r].every(function(v){return v>=0})){cl.push(r)}}cl.forEach(function(r){bd.splice(r,1);bd.unshift(new Array(W).fill(-1));sc+=100});se.textContent=sc;if(cl.length>0){lv=Math.floor(sc/1000)+1;le.textContent=lv;lp=Math.max(100,1000-(lv-1)*100)}np()}
function dr(){cx.fillStyle='#0a0a1a';cx.fillRect(0,0,200,400);for(var r=0;r<H;r++)for(var c=0;c<W;c++)if(bd[r][c]>=0){cx.fillStyle=co[bd[r][c]];cx.fillRect(c*S,r*S,S-1,S-1)}var s=sh();cx.fillStyle=co[pc];for(var r=0;r<s.length;r++)for(var c=0;c<s[r].length;c++)if(s[r][c])cx.fillRect((px+c)*S,(py+r)*S,S-1,S-1)}
function rot(){var s=sh(),n=[];for(var c=0;c<s[0].length;c++){var row=[];for(var r=s.length-1;r>=0;r--)row.push(s[r][c]);n.push(row)}P[pc]=n;PX=px;if(coll()){var ops=P[pc];P[pc]=n.map(function(r){return r});}}
function mv(dx){px+=dx;if(coll())px-=dx}
function drp(){py++;if(coll()){py--;lock()}dr()}
function hrd(){while(!coll())py++;py--;lock();dr()}
document.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')mv(-1);if(e.key==='ArrowRight')mv(1);if(e.key==='ArrowDown')drp();if(e.key==='ArrowUp')rot();if(e.key===' ')hrd();dr()});
var ts=null,tx=0;w.addEventListener('touchstart',function(e){ts=e.touches[0].clientX},{passive:true});
w.addEventListener('touchend',function(e){if(!ts)return;var dx=e.changedTouches[0].clientX-ts;if(Math.abs(dx)>30){mv(dx>0?1:-1)}else{rot()}dr();ts=null},{passive:true});
lp=1000;np();dr();
(function tl(){setTimeout(function(){drp();dr();tl()},lp)},lp)
});

// Voxely 3D registers itself in voxely3d.js — no fallback placeholder app

})();
