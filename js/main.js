/* ============================================================
   NETSEC//3D — main.js
   Logika 3D, tema otomatis biru/merah, interaksi drag & klik
============================================================ */

/* ---------- ERROR HANDLING (tidak lagi hitam diam-diam) ---------- */
function fatal(msg){
  const e=document.getElementById('err');
  e.style.display='block';
  e.innerHTML='[ NETSEC//3D — ERROR ]\n\n'+String(msg).replace(/</g,'&lt;')+
    '\n\nTips: tutup sebagian tab browser (memori penuh), lalu reload.\n<button onclick="location.reload()">RELOAD HALAMAN</button>';
}
window.addEventListener('error',ev=>{ if(!window.__BOOTED) fatal(ev.message); });
window.addEventListener('unhandledrejection',ev=>{ if(!window.__BOOTED) fatal((ev.reason&&ev.reason.message)||ev.reason); });

/* ---------- LOAD THREE.JS DENGAN 3 CDN CADANGAN ---------- */
async function loadThree(){
  const urls=[
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    'https://esm.sh/three@0.160.0'
  ];
  let lastErr;
  for(const u of urls){
    try{ return await import(u); }catch(e){ lastErr=e; }
  }
  throw lastErr||new Error('CDN tidak terjangkau');
}
let THREE;
try{ THREE=await loadThree(); }
catch(e){ fatal('Three.js gagal dimuat dari semua CDN (cek koneksi internet).\n'+e.message); throw e; }

try{

/* ================= CORE ================= */
const isMobile=matchMedia('(pointer:coarse)').matches;
const canvas=document.getElementById('canvas3d');
{
  const t=document.createElement('canvas');
  if(!(t.getContext('webgl2')||t.getContext('webgl'))){
    fatal('Perangkat/browser ini tidak mendukung WebGL.'); throw new Error('no webgl');
  }
}
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,isMobile?1.5:2));
renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fatal('WebGL context hilang (memori/tab terlalu banyak). Reload halaman.');});

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x02060f,.024);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,200);
camera.position.set(0,0,14);

scene.add(new THREE.AmbientLight(0x334466,1.1));
const keyLight=new THREE.PointLight(0x00e5ff,55,60); keyLight.position.set(6,8,10); scene.add(keyLight);
const fillLight=new THREE.PointLight(0x3355ff,35,60); fillLight.position.set(-8,-4,6); scene.add(fillLight);

const starMat=new THREE.PointsMaterial({color:0x3a6a8a,size:.12,transparent:true,opacity:.8});
{
  const g=new THREE.BufferGeometry(),N=isMobile?700:1400,pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*120;pos[i*3+1]=(Math.random()-.5)*120;pos[i*3+2]=(Math.random()-.5)*120;}
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  scene.add(new THREE.Points(g,starMat));
}
const grid=new THREE.GridHelper(120,60,0x0a3550,0x062033); grid.position.y=-9; scene.add(grid);

/* ---------- GLOW ADDITIVE (pengganti bloom: ringan & aman mobile) ---------- */
const GLOW_TEX=(()=>{
  const cv=document.createElement('canvas');cv.width=cv.height=128;
  const c=cv.getContext('2d');
  const g=c.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(.25,'rgba(255,255,255,.55)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(cv);
})();
function makeGlow(color,size,opacity=.5){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color,transparent:true,opacity,
    blending:THREE.AdditiveBlending,depthWrite:false}));
  s.scale.setScalar(size);
  return s;
}

/* ================= THEME ENGINE (biru <-> merah otomatis) ================= */
const THEME={
  sec:{fog:new THREE.Color(0x02060f),key:new THREE.Color(0x00e5ff),fill:new THREE.Color(0x3355ff),
       grid:new THREE.Color(0x0a3550),star:new THREE.Color(0x3a6a8a)},
  atk:{fog:new THREE.Color(0x0d0207),key:new THREE.Color(0xff2d55),fill:new THREE.Color(0x991133),
       grid:new THREE.Color(0x4a0a1e),star:new THREE.Color(0x8a3a4a)},
};
let themeTarget=THEME.sec;
function setTheme(name){
  themeTarget=THEME[name];
  document.body.classList.toggle('atk',name==='atk');
  document.getElementById('modeLabel').textContent=name==='atk'?'⚠ UNDER ATTACK':'DEFENSE';
}
function updateTheme(dt){
  const k=Math.min(dt*2.5,1);
  scene.fog.color.lerp(themeTarget.fog,k);
  keyLight.color.lerp(themeTarget.key,k);
  fillLight.color.lerp(themeTarget.fill,k);
  grid.material.color.lerp(themeTarget.grid,k);
  starMat.color.lerp(themeTarget.star,k);
}

/* ================= GROUPS SCENE ================= */
const groups=[],clickHandlers=[],updaters=[],pickMaps=[];
for(let i=0;i<10;i++){
  const g=new THREE.Group();
  g.scale.setScalar(i===0?1:.0001);
  scene.add(g); groups.push(g);
}
const CYAN=0x00e5ff,PURPLE=0x7c4dff,RED=0xff2d55,GREEN=0x00ff9d,YELLOW=0xffcc00;
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();

/* ============ S0 — GLOBE JARINGAN ============ */
{
  const g=groups[0];
  const globe=new THREE.Mesh(new THREE.IcosahedronGeometry(3.4,3),
    new THREE.MeshBasicMaterial({color:0x0a5a7a,wireframe:true,transparent:true,opacity:.5}));
  g.add(globe);
  g.add(makeGlow(CYAN,10,.28));
  const nodeMat=new THREE.MeshStandardMaterial({color:CYAN,emissive:CYAN,emissiveIntensity:2});
  const pts=[];
  for(let i=0;i<46;i++){
    const p=new THREE.Vector3().randomDirection().multiplyScalar(3.42);pts.push(p);
    const n=new THREE.Mesh(new THREE.SphereGeometry(.07,8,8),nodeMat);
    n.position.copy(p);g.add(n);
  }
  const curves=[];
  for(let i=0;i<26;i++){
    const a=pts[(Math.random()*pts.length)|0],b=pts[(Math.random()*pts.length)|0];
    if(a===b)continue;
    const mid=a.clone().add(b).multiplyScalar(.5).normalize().multiplyScalar(a.distanceTo(b)*.55+3.6);
    const c=new THREE.QuadraticBezierCurve3(a,mid,b);curves.push(c);
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(28)),
      new THREE.LineBasicMaterial({color:0x1e7fa8,transparent:true,opacity:.55})));
  }
  const packets=curves.map(c=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(.1,10,10),new THREE.MeshBasicMaterial({color:0xffffff}));
    g.add(m);return{mesh:m,curve:c,t:Math.random(),speed:.004+Math.random()*.006};
  });
  const pulse=new THREE.Mesh(new THREE.SphereGeometry(3.4,32,32),
    new THREE.MeshBasicMaterial({color:CYAN,transparent:true,opacity:0,side:THREE.BackSide}));
  g.add(pulse);let pulseT=-1;
  clickHandlers[0]=()=>{pulseT=0;toast('Pulsa data terkirim — trafik mengalir antar node jaringan');};
  pickMaps[0]=[globe];
  updaters[0]=(dt)=>{
    globe.rotation.y+=dt*.12;
    packets.forEach(p=>{p.t=(p.t+p.speed)%1;p.mesh.position.copy(p.curve.getPoint(p.t));});
    if(pulseT>=0){pulseT+=dt*1.6;pulse.scale.setScalar(1+pulseT*.7);
      pulse.material.opacity=Math.max(0,.55*(1-pulseT));if(pulseT>1)pulseT=-1;}
  };
}

/* ============ S1 — SERVER + PERISAI ============ */
{
  const g=groups[1];
  const rack=new THREE.Group();
  for(let i=0;i<5;i++){
    const s=new THREE.Mesh(new THREE.BoxGeometry(2.6,.7,1.6),
      new THREE.MeshStandardMaterial({color:0x0a1a2e,emissive:CYAN,emissiveIntensity:.3,metalness:.8,roughness:.3}));
    s.position.y=1.6-i*.9;rack.add(s);
    for(let j=0;j<3;j++){
      const led=new THREE.Mesh(new THREE.SphereGeometry(.05,8,8),new THREE.MeshBasicMaterial({color:j===2?RED:GREEN}));
      led.position.set(-.9+j*.25,1.6-i*.9,.82);rack.add(led);
    }
  }
  g.add(rack);
  const shield=new THREE.Mesh(new THREE.SphereGeometry(3.6,32,32),
    new THREE.MeshPhysicalMaterial({color:CYAN,transparent:true,opacity:.1,emissive:CYAN,emissiveIntensity:.2,side:THREE.DoubleSide}));
  g.add(shield);
  const threats=[];
  for(let i=0;i<18;i++){
    const m=new THREE.Mesh(new THREE.TetrahedronGeometry(.14),new THREE.MeshBasicMaterial({color:RED}));
    const dir=new THREE.Vector3().randomDirection();
    m.position.copy(dir.clone().multiplyScalar(7));
    m.userData={dir:dir.negate(),speed:1+Math.random()*1.5};
    g.add(m);threats.push(m);
  }
  clickHandlers[1]=()=>toast('Server + data dilindungi: ancaman (merah) yang menyentuh perisai langsung terpental');
  pickMaps[1]=[shield];
  updaters[1]=(dt,t)=>{
    rack.rotation.y=Math.sin(t*.4)*.3;
    shield.material.opacity=.08+Math.sin(t*2)*.04;
    threats.forEach(m=>{
      let d=m.position.length();
      if(d<.001){m.position.set(4,0,0);d=4;}
      m.position.addScaledVector(m.userData.dir,dt*m.userData.speed);
      if(d<3.9){m.userData.dir.reflect(m.position.clone().normalize());m.position.normalize().multiplyScalar(4);}
      if(d>9)m.userData.dir.negate();
      m.rotation.x+=dt*4;
    });
  };
}

/* ============ S2 — PIRAMIDA CIA TRIAD ============ */
{
  const g=groups[2];
  const pyr=new THREE.Mesh(new THREE.TetrahedronGeometry(2.8),
    new THREE.MeshBasicMaterial({color:CYAN,wireframe:true,transparent:true,opacity:.5}));
  pyr.position.y=.4;g.add(pyr);
  const pyrSolid=new THREE.Mesh(new THREE.TetrahedronGeometry(2.75),
    new THREE.MeshPhysicalMaterial({color:0x06203a,transparent:true,opacity:.3,emissive:PURPLE,emissiveIntensity:.15,side:THREE.DoubleSide}));
  pyrSolid.position.y=.4;g.add(pyrSolid);
  const verts=[
    {pos:new THREE.Vector3(0,3.3,.4),color:CYAN,desc:'CONFIDENTIALITY — kerahasiaan data: enkripsi, password kuat, autentikasi 2 faktor'},
    {pos:new THREE.Vector3(-2.7,-1.7,1.7),color:GREEN,desc:'INTEGRITY — data tidak diubah ilegal: hash, checksum, digital signature'},
    {pos:new THREE.Vector3(2.7,-1.7,1.7),color:YELLOW,desc:'AVAILABILITY — layanan selalu tersedia: backup, anti-DDoS, redundancy'},
  ];
  const spheres=[];
  verts.forEach(v=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(.45,24,24),
      new THREE.MeshStandardMaterial({color:v.color,emissive:v.color,emissiveIntensity:1.4}));
    m.position.copy(v.pos);m.userData=v;g.add(m);spheres.push(m);
    const halo=new THREE.Mesh(new THREE.SphereGeometry(.6,20,20),
      new THREE.MeshBasicMaterial({color:v.color,transparent:true,opacity:.18,side:THREE.BackSide}));
    m.add(halo);
  });
  clickHandlers[2]=(hit)=>{
    const s=hit&&spheres.includes(hit.object)?hit.object:null;
    toast(s?s.userData.desc:'CIA Triad: klik bola C / I / A untuk penjelasan tiap pilar');
  };
  pickMaps[2]=[...spheres,pyrSolid];
  updaters[2]=(dt,t)=>{
    pyr.rotation.y+=dt*.4;pyrSolid.rotation.y+=dt*.4;
    spheres.forEach((s,i)=>{s.material.emissiveIntensity=1.2+Math.sin(t*3+i*2)*.6;});
  };
}

/* ============ S3 — DEFENSE IN DEPTH (LAPISAN) ============ */
{
  const g=groups[3];
  const layerInfo=[
    {r:4.4,color:0x4466aa,desc:'LAPIS 1 FISIK — CCTV, kunci ruang server, access card'},
    {r:3.6,color:CYAN,desc:'LAPIS 2 JARINGAN — firewall, segmentasi, IDS/IPS'},
    {r:2.8,color:PURPLE,desc:'LAPIS 3 ENDPOINT — antivirus, patch OS, device control'},
    {r:2.0,color:YELLOW,desc:'LAPIS 4 APLIKASI — validasi input, secure coding, patch'},
    {r:1.2,color:GREEN,desc:'LAPIS 5 DATA — enkripsi, backup, klasifikasi (inti!)'},
  ];
  const shells=[];
  layerInfo.forEach((L,i)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(L.r,36,36),
      new THREE.MeshPhysicalMaterial({color:L.color,transparent:true,opacity:.13,emissive:L.color,emissiveIntensity:.2,side:THREE.DoubleSide,depthWrite:false}));
    m.userData={...L,idx:i};g.add(m);shells.push(m);
    const w=new THREE.Mesh(new THREE.SphereGeometry(L.r+.01,14,14),
      new THREE.MeshBasicMaterial({color:L.color,wireframe:true,transparent:true,opacity:.08,depthWrite:false}));
    m.add(w);
  });
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.5),
    new THREE.MeshStandardMaterial({color:0xffffff,emissive:CYAN,emissiveIntensity:2}));
  g.add(core);
  g.add(makeGlow(CYAN,4,.4));
  let activeShell=-1;
  clickHandlers[3]=(hit)=>{
    const s=hit&&shells.includes(hit.object)?hit.object:null;
    if(s){activeShell=s.userData.idx;toast(s.userData.desc);}
    else toast('Defense in Depth: klik tiap lapisan untuk penjelasannya');
  };
  pickMaps[3]=shells;
  updaters[3]=(dt,t)=>{
    g.rotation.y+=dt*.15;
    core.rotation.x+=dt;core.rotation.y+=dt*1.4;
    core.material.emissiveIntensity=1.6+Math.sin(t*4)*.8;
    shells.forEach((s,i)=>{
      const target=i===activeShell?.34:.13;
      s.material.opacity+=(target-s.material.opacity)*dt*4;
      s.material.emissiveIntensity=i===activeShell?.7:.2;
      s.rotation.y+=dt*(.05+i*.02);
    });
  };
}

/* ============ S4 HACK — DDOS (box server dipisah dari light = anti crash) ============ */
{
  const g=groups[4];
  const server=new THREE.Group();
  const serverBoxes=[];
  for(let i=0;i<4;i++){
    const s=new THREE.Mesh(new THREE.BoxGeometry(1.8,1,1.8),
      new THREE.MeshStandardMaterial({color:0x1a0a14,emissive:RED,emissiveIntensity:.4,metalness:.7,roughness:.3}));
    s.position.y=-1.5+i*1.15;server.add(s);serverBoxes.push(s);
  }
  g.add(server);
  const serverLight=new THREE.PointLight(RED,15,12);server.add(serverLight);
  g.add(makeGlow(RED,7,.35));
  const drones=[],bullets=[];
  const DN=isMobile?24:40;
  for(let i=0;i<DN;i++){
    const d=new THREE.Mesh(new THREE.TetrahedronGeometry(.22),
      new THREE.MeshStandardMaterial({color:RED,emissive:RED,emissiveIntensity:1.6,flatShading:true}));
    const dir=new THREE.Vector3().randomDirection();
    d.position.copy(dir.multiplyScalar(7+Math.random()*4));
    d.userData={home:d.position.clone(),phase:Math.random()*10};
    g.add(d);drones.push(d);
  }
  let heat=0,shootTimer=0;
  function shoot(d){
    const b=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),new THREE.MeshBasicMaterial({color:0xff7799}));
    b.position.copy(d.position);
    b.userData={vel:d.position.clone().negate().normalize().multiplyScalar(9+Math.random()*6),life:2};
    g.add(b);bullets.push(b);
  }
  clickHandlers[4]=()=>{heat=1;toast('INTENSITAS SERANGAN 200% — server kelebihan beban, port dibanjiri request palsu!');};
  pickMaps[4]=serverBoxes;
  updaters[4]=(dt,t)=>{
    heat=Math.max(0,heat-dt*.25);
    shootTimer+=dt;
    if(shootTimer>.14-heat*.11){
      shootTimer=0;
      shoot(drones[(Math.random()*drones.length)|0]);
      if(heat>.3)shoot(drones[(Math.random()*drones.length)|0]);
    }
    drones.forEach(d=>{
      d.position.copy(d.userData.home).add(new THREE.Vector3(Math.sin(t*2+d.userData.phase)*.3,Math.cos(t*1.5+d.userData.phase)*.3,0));
      d.rotation.x+=dt*3;d.rotation.y+=dt*2;
    });
    for(let i=bullets.length-1;i>=0;i--){
      const b=bullets[i];
      b.position.addScaledVector(b.userData.vel,dt);
      b.userData.life-=dt;
      if(b.position.length()<1.4||b.userData.life<=0){
        if(b.position.length()<1.4)serverLight.intensity=20+heat*60;
        g.remove(b);bullets.splice(i,1);
      }
    }
    server.position.x=Math.sin(t*40)*heat*.06;
    server.position.y=Math.cos(t*33)*heat*.06;
    serverLight.intensity+=(15-serverLight.intensity)*dt*3;
    serverBoxes.forEach((s,i)=>{
      s.material.emissiveIntensity=.3+heat*1.2+Math.sin(t*8+i)*.15*heat;
    });
  };
}

/* ============ S5 — FIREWALL ============ */
{
  const g=groups[5];
  const COLS=11,ROWS=7,S=.72,GAP=.16;
  const blocks=[],blockGeo=new THREE.BoxGeometry(S,S,S);
  for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++){
    const mat=new THREE.MeshStandardMaterial({color:0x06304a,emissive:CYAN,emissiveIntensity:.5,metalness:.6,roughness:.3});
    const m=new THREE.Mesh(blockGeo,mat);
    m.position.set((x-(COLS-1)/2)*(S+GAP),(y-(ROWS-1)/2)*(S+GAP),0);
    m.userData={on:true,flash:0};g.add(m);blocks.push(m);
  }
  const threats=[];
  function resetThreat(tr,rand){tr.mesh.position.set((Math.random()-.5)*8.4,(Math.random()-.5)*5.2,rand?6+Math.random()*10:12);}
  for(let i=0;i<7;i++){
    const m=new THREE.Mesh(new THREE.OctahedronGeometry(.3),
      new THREE.MeshStandardMaterial({color:RED,emissive:RED,emissiveIntensity:2}));
    const tr={mesh:m,speed:2.4+Math.random()*2.2};
    resetThreat(tr,true);g.add(m);threats.push(tr);
  }
  const sparks=[];
  function explode(pos){
    for(let i=0;i<14;i++){
      const s=new THREE.Mesh(new THREE.SphereGeometry(.06,6,6),
        new THREE.MeshBasicMaterial({color:0xffaa55,transparent:true}));
      s.position.copy(pos);
      s.userData={v:new THREE.Vector3().randomDirection().multiplyScalar(2+Math.random()*3),life:1};
      g.add(s);sparks.push(s);
    }
  }
  clickHandlers[5]=(hit)=>{
    const obj=hit&&hit.object;
    if(obj&&blocks.includes(obj)){
      obj.userData.on=!obj.userData.on;
      obj.material.emissive.setHex(obj.userData.on?CYAN:RED);
      toast(obj.userData.on?'Rule diperbarui: celah DITUTUP, port diblokir kembali':'CELAH DIBUKA — lihat, ancaman merah bisa lolos masuk!');
    }else toast('Firewall menyaring paket: aman lewat, berbahaya diblokir & diledakkan');
  };
  pickMaps[5]=blocks;
  updaters[5]=(dt,t)=>{
    threats.forEach(tr=>{
      tr.mesh.position.z-=dt*tr.speed;
      tr.mesh.rotation.x+=dt*3;tr.mesh.rotation.y+=dt*2;
      const z=tr.mesh.position.z;
      if(z<.2&&z>-.6){
        const bx=blocks.find(b=>b.userData.on&&
          Math.abs(b.position.x-tr.mesh.position.x)<S*.75&&
          Math.abs(b.position.y-tr.mesh.position.y)<S*.75);
        if(bx){bx.userData.flash=1;explode(tr.mesh.position.clone());resetThreat(tr,false);}
      }
      if(z<-6)resetThreat(tr,false);
    });
    blocks.forEach(b=>{
      if(b.userData.flash>0){
        b.userData.flash-=dt*3;
        b.material.emissiveIntensity=.5+b.userData.flash*4;
        b.scale.setScalar(1+b.userData.flash*.25);
      }else{
        b.material.emissiveIntensity=b.userData.on?.5+Math.sin(t*2+b.position.x)*.2:.9;
        b.scale.setScalar(1);
      }
      b.position.z=b.userData.on?0:-.3;
    });
    for(let i=sparks.length-1;i>=0;i--){
      const s=sparks[i];s.userData.life-=dt*2.2;
      s.position.addScaledVector(s.userData.v,dt);
      s.material.opacity=Math.max(0,s.userData.life);
      s.scale.setScalar(Math.max(.01,s.userData.life));
      if(s.userData.life<=0){g.remove(s);sparks.splice(i,1);}
    }
  };
}

/* ============ S6 HACK — WORM MALWARE ============ */
{
  const g=groups[6];
  const nodes=[];
  const SIZE=4,SP=1.9;
  for(let x=0;x<SIZE;x++)for(let y=0;y<SIZE;y++)for(let z=0;z<2;z++){
    const mat=new THREE.MeshStandardMaterial({color:0x0a2a44,emissive:CYAN,emissiveIntensity:1});
    const m=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.5),mat);
    m.position.set((x-(SIZE-1)/2)*SP,(y-(SIZE-1)/2)*SP,(z-.5)*SP-1);
    m.userData={infected:false,mat};
    g.add(m);nodes.push(m);
  }
  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){
      if(nodes[i].position.distanceTo(nodes[j].position)<SP*1.05){
        g.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([nodes[i].position,nodes[j].position]),
          new THREE.LineBasicMaterial({color:0x1e5f7a,transparent:true,opacity:.4})));
      }
    }
  }
  const worm=[];
  for(let i=0;i<10;i++){
    const s=new THREE.Mesh(new THREE.SphereGeometry(i===0?.24:.16,12,12),
      new THREE.MeshStandardMaterial({color:RED,emissive:RED,emissiveIntensity:2}));
    g.add(s);worm.push(s);
  }
  let infecting=false,pathIdx=0;
  const path=[...nodes].sort(()=>Math.random()-.5);
  function infect(n){
    if(n.userData.infected)return;
    n.userData.infected=true;
    n.userData.mat.emissive.setHex(RED);
    n.userData.mat.color.setHex(0x2a0a14);
    n.scale.setScalar(1.4);
  }
  function clean(){
    nodes.forEach(n=>{
      n.userData.infected=false;
      n.userData.mat.emissive.setHex(CYAN);
      n.userData.mat.color.setHex(0x0a2a44);
      n.scale.setScalar(1);
    });
    pathIdx=0;
  }
  clickHandlers[6]=()=>{
    infecting=!infecting;
    if(infecting)toast('WORM DILEPASKAN — infeksi menyebar otomatis dari node ke node!');
    else{clean();toast('Incident response: semua node dibersihkan & dipulihkan (patch + EDR)');}
  };
  pickMaps[6]=nodes;
  const wormPos=[];for(let i=0;i<10;i++)wormPos.push(new THREE.Vector3(0,0,6));
  updaters[6]=(dt,t)=>{
    g.rotation.y+=dt*.08;
    if(infecting&&pathIdx<nodes.length){
      const target=path[pathIdx].position;
      wormPos[0].lerp(target,dt*2.2);
      if(wormPos[0].distanceTo(target)<.4){infect(path[pathIdx]);pathIdx++;}
    }
    for(let i=wormPos.length-1;i>0;i--)wormPos[i].lerp(wormPos[i-1],dt*10);
    worm.forEach((s,i)=>{s.position.copy(wormPos[i]);s.scale.setScalar(infecting?1+Math.sin(t*8+i)*.2:.4);});
    nodes.forEach((n,i)=>{
      if(n.userData.infected){
        n.rotation.y+=dt*3;
        n.userData.mat.emissiveIntensity=1+Math.sin(t*6+i)*.7;
      }else{
        n.rotation.y+=dt*.5;
        n.userData.mat.emissiveIntensity=.8+Math.sin(t*2+i)*.3;
      }
    });
  };
}

/* ============ S7 — IDS/IPS ============ */
{
  const g=groups[7];
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.5,1),
    new THREE.MeshStandardMaterial({color:0x0a2a44,emissive:GREEN,emissiveIntensity:1.2,metalness:.8,roughness:.2,flatShading:true}));
  g.add(core);
  g.add(makeGlow(GREEN,5,.35));
  const shieldMat=new THREE.MeshPhysicalMaterial({color:CYAN,transparent:true,opacity:.14,side:THREE.DoubleSide,emissive:CYAN,emissiveIntensity:.25});
  const shield=new THREE.Mesh(new THREE.SphereGeometry(3.2,40,40),shieldMat);g.add(shield);
  const shieldWire=new THREE.Mesh(new THREE.SphereGeometry(3.22,20,20),
    new THREE.MeshBasicMaterial({color:CYAN,wireframe:true,transparent:true,opacity:.15}));g.add(shieldWire);
  const viruses=[];
  function makeVirus(){
    const v=new THREE.Group();
    const b=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,0),
      new THREE.MeshStandardMaterial({color:0x551122,emissive:RED,emissiveIntensity:1.4,flatShading:true}));
    v.add(b);
    for(let i=0;i<8;i++){
      const sp=new THREE.Mesh(new THREE.ConeGeometry(.06,.4,6),
        new THREE.MeshStandardMaterial({color:RED,emissive:RED,emissiveIntensity:1}));
      sp.position.copy(new THREE.Vector3().randomDirection().multiplyScalar(.42));
      sp.lookAt(sp.position.clone().multiplyScalar(2));sp.rotateX(Math.PI/2);
      v.add(sp);
    }
    return v;
  }
  for(let i=0;i<14;i++){
    const v=makeVirus();
    const dir=new THREE.Vector3().randomDirection();
    v.position.copy(dir.clone().multiplyScalar(8+Math.random()*4));
    v.userData={vel:dir.negate().multiplyScalar(.7+Math.random()*.9),dead:false};
    g.add(v);viruses.push(v);
  }
  const wave=new THREE.Mesh(new THREE.RingGeometry(.5,.62,64),
    new THREE.MeshBasicMaterial({color:GREEN,transparent:true,opacity:0,side:THREE.DoubleSide}));
  g.add(wave);let waveT=-1;
  function killVirus(v){v.userData.dead=true;v.children.forEach(c=>c.material.emissive.setHex(GREEN));}
  function respawnVirus(v){
    v.userData.dead=false;v.scale.setScalar(1);
    const dir=new THREE.Vector3().randomDirection();
    v.position.copy(dir.clone().multiplyScalar(9+Math.random()*3));
    v.userData.vel=dir.negate().multiplyScalar(.7+Math.random()*.9);
    v.children.forEach(c=>c.material.emissive.setHex(RED));
  }
  clickHandlers[7]=()=>{waveT=0;toast('SCAN IDS/IPS DIPICU — gelombang mendeteksi & mengkarantina semua malware');};
  pickMaps[7]=[shield];
  updaters[7]=(dt,t)=>{
    core.rotation.x+=dt*.4;core.rotation.y+=dt*.6;
    core.material.emissiveIntensity=1+Math.sin(t*5)*.4;
    shieldMat.opacity=.12+Math.sin(t*2)*.05;
    shieldWire.rotation.y-=dt*.2;
    if(waveT>=0){
      waveT+=dt*1.4;
      wave.scale.setScalar(1+waveT*14);
      wave.material.opacity=Math.max(0,.9*(1-waveT));
      wave.lookAt(camera.position);
      viruses.forEach(v=>{if(!v.userData.dead&&v.position.length()<waveT*14)killVirus(v);});
      if(waveT>1)waveT=-1;
    }
    viruses.forEach(v=>{
      if(v.userData.dead){
        v.scale.multiplyScalar(1-dt*4);v.rotation.y+=dt*10;
        if(v.scale.x<.02)respawnVirus(v);
        return;
      }
      v.position.addScaledVector(v.userData.vel,dt);
      v.rotation.x+=dt*2;v.rotation.z+=dt*1.5;
      let d=v.position.length();
      if(d<.001){v.position.set(5,0,0);d=5;}
      if(d<3.4){
        v.userData.vel.reflect(v.position.clone().normalize()).multiplyScalar(1.02);
        v.position.normalize().multiplyScalar(3.45);
        shieldMat.opacity=.5;
      }
      if(d>15)v.userData.vel.negate();
    });
  };
}

/* ============ S8 HACK — MAN IN THE MIDDLE ============ */
{
  const g=groups[8];
  function makeEndpoint(x,color){
    const grp=new THREE.Group();
    const base=new THREE.Mesh(new THREE.BoxGeometry(1.6,.14,1.1),
      new THREE.MeshStandardMaterial({color:0x0a1a2e,emissive:color,emissiveIntensity:.5,metalness:.8}));
    grp.add(base);
    const screen=new THREE.Mesh(new THREE.BoxGeometry(1.4,1,.08),
      new THREE.MeshStandardMaterial({color:0x0a1a2e,emissive:color,emissiveIntensity:.8,metalness:.6}));
    screen.position.set(0,.6,-.45);screen.rotation.x=-.25;grp.add(screen);
    grp.position.set(x,-1,0);
    return grp;
  }
  g.add(makeEndpoint(-5,CYAN),makeEndpoint(5,CYAN));
  const attacker=new THREE.Group();
  const cloak=new THREE.Mesh(new THREE.ConeGeometry(.9,2,6),
    new THREE.MeshStandardMaterial({color:0x1a0510,emissive:RED,emissiveIntensity:.9,flatShading:true}));
  attacker.add(cloak);
  const eyeMatL=new THREE.MeshBasicMaterial({color:RED});
  const eyeMatR=new THREE.MeshBasicMaterial({color:RED});
  const eyeL=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),eyeMatL);
  eyeL.position.set(-.22,.7,.55);attacker.add(eyeL);
  const eyeR=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),eyeMatR);
  eyeR.position.set(.22,.7,.55);attacker.add(eyeR);
  attacker.position.set(0,1.8,0);
  g.add(attacker);
  g.add(makeGlow(RED,4,.3));
  const curveAB=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5,-.3,0),new THREE.Vector3(-2,1.2,0),new THREE.Vector3(0,1.8,0),
    new THREE.Vector3(2,1.2,0),new THREE.Vector3(5,-.3,0)
  ]);
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curveAB.getPoints(50)),
    new THREE.LineBasicMaterial({color:RED,transparent:true,opacity:.5})));
  const pkts=[];
  for(let i=0;i<4;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(.26,.26,.26),
      new THREE.MeshStandardMaterial({color:CYAN,emissive:CYAN,emissiveIntensity:1.6}));
    g.add(m);pkts.push({mesh:m,t:i/4,speed:.14});
  }
  const ghosts=[];
  let sniffFlash=0;
  function spawnGhost(pos){
    const m=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2),
      new THREE.MeshBasicMaterial({color:RED,transparent:true,opacity:.9,wireframe:true}));
    m.position.copy(pos);
    m.userData={vel:new THREE.Vector3((Math.random()-.5)*1.5,-2.5,(Math.random()-.5)*1.5),life:2.5};
    g.add(m);ghosts.push(m);
  }
  clickHandlers[8]=()=>{
    sniffFlash=1;
    for(let i=0;i<6;i++)setTimeout(()=>spawnGhost(attacker.position.clone()),i*90);
    toast('PENYADAPAN! Attacker menyalin setiap paket yang lewat — data korban bocor tanpa disadari');
  };
  pickMaps[8]=[cloak];
  updaters[8]=(dt,t)=>{
    attacker.position.y=1.8+Math.sin(t*2)*.25;
    attacker.rotation.y=Math.sin(t*.8)*.4;
    cloak.material.emissiveIntensity=.9+sniffFlash*3+Math.sin(t*5)*.2;
    sniffFlash=Math.max(0,sniffFlash-dt*1.5);
    const ec=sniffFlash>.3?0xffffff:RED;
    eyeMatL.color.setHex(ec);eyeMatR.color.setHex(ec);
    pkts.forEach(p=>{
      p.t=(p.t+dt*p.speed)%1;
      const pos=curveAB.getPoint(p.t),tan=curveAB.getTangent(p.t);
      p.mesh.position.copy(pos);p.mesh.lookAt(pos.clone().add(tan));
      p.mesh.rotation.z+=dt*3;
    });
    for(let i=ghosts.length-1;i>=0;i--){
      const gh=ghosts[i];
      gh.position.addScaledVector(gh.userData.vel,dt);
      gh.userData.life-=dt;gh.rotation.x+=dt*5;
      gh.material.opacity=Math.max(0,gh.userData.life/2.5);
      if(gh.userData.life<=0||gh.position.y<-5){g.remove(gh);ghosts.splice(i,1);}
    }
  };
}

/* ============ S9 — VPN TUNNEL ============ */
{
  const g=groups[9];
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-7,-2,0),new THREE.Vector3(-3,2,-2),new THREE.Vector3(0,-1,1),
    new THREE.Vector3(3,2,-1),new THREE.Vector3(7,-2,0)
  ]);
  const tunnel=new THREE.Mesh(new THREE.TubeGeometry(curve,120,1.5,24,false),
    new THREE.MeshPhysicalMaterial({color:PURPLE,emissive:PURPLE,emissiveIntensity:.35,transparent:true,opacity:.22,side:THREE.DoubleSide,roughness:.1}));
  g.add(tunnel);
  g.add(makeGlow(PURPLE,7,.25));
  const wire=new THREE.Mesh(new THREE.TubeGeometry(curve,60,1.52,12,false),
    new THREE.MeshBasicMaterial({color:CYAN,wireframe:true,transparent:true,opacity:.2}));
  g.add(wire);
  for(let i=0;i<22;i++){
    const t=i/21,p=curve.getPoint(t),tan=curve.getTangent(t);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.55,.045,10,50),
      new THREE.MeshBasicMaterial({color:i%2?CYAN:PURPLE,transparent:true,opacity:.75}));
    ring.position.copy(p);ring.lookAt(p.clone().add(tan));g.add(ring);
  }
  const pkts=[];
  for(let i=0;i<9;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(.34,.34,.34),
      new THREE.MeshStandardMaterial({color:GREEN,emissive:GREEN,emissiveIntensity:1.8}));
    g.add(m);pkts.push({mesh:m,t:i/9,speed:.09});
  }
  const sniffer=new THREE.Mesh(new THREE.ConeGeometry(.4,1.2,4),
    new THREE.MeshStandardMaterial({color:RED,emissive:RED,emissiveIntensity:1.2,wireframe:true}));
  sniffer.position.set(0,3.4,0);g.add(sniffer);
  let boost=0;
  clickHandlers[9]=()=>{boost=1;toast('VPN BOOST — trafik dienkripsi penuh; penyadap di luar tunnel tetap buta');};
  pickMaps[9]=[tunnel];
  updaters[9]=(dt,t)=>{
    boost=Math.max(0,boost-dt*.5);
    const sp=1+boost*5;
    pkts.forEach(p=>{
      p.t=(p.t+dt*p.speed*sp)%1;
      const pos=curve.getPoint(p.t),tan=curve.getTangent(p.t);
      p.mesh.position.copy(pos);p.mesh.lookAt(pos.clone().add(tan));
      p.mesh.rotation.z+=dt*4;p.mesh.scale.setScalar(1+boost*.4);
    });
    tunnel.material.emissiveIntensity=.35+boost*.9+Math.sin(t*3)*.1;
    wire.material.opacity=.2+boost*.5;
    sniffer.rotation.y+=dt*2;sniffer.position.y=3.4+Math.sin(t*2)*.3;
    g.rotation.z=Math.sin(t*.3)*.08;
  };
}

/* ================= SCROLL + TEMA OTOMATIS ================= */
let current=0;
const sections=[...document.querySelectorAll('section')];
const dotsBox=document.getElementById('dots');
sections.forEach((s,i)=>{
  const d=document.createElement('div');
  d.className='dot'+(i===0?' active':'')+(s.dataset.theme==='atk'?' atkdot':'');
  d.onclick=()=>s.scrollIntoView({behavior:'smooth'});
  dotsBox.appendChild(d);
});
const dots=[...document.querySelectorAll('.dot')];
const navlinks=[...document.querySelectorAll('.navlink')];
function setActive(idx){
  if(idx===current)return;
  current=idx;
  dots.forEach((d,i)=>d.classList.toggle('active',i===idx));
  navlinks.forEach((a,i)=>a.classList.toggle('active',i===idx));
  document.getElementById('scrollIcon').style.opacity=idx===0?1:0;
  setTheme(sections[idx].dataset.theme);
}
const io=new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(e.isIntersecting){
      sections.forEach(s=>s.classList.remove('visible'));
      e.target.classList.add('visible');
      setActive(sections.indexOf(e.target));
    }
  });
},{threshold:.3});
sections.forEach(s=>io.observe(s));
addEventListener('scroll',()=>{
  const max=document.body.scrollHeight-innerHeight;
  document.getElementById('progress').style.width=(scrollY/max*100)+'%';
},{passive:true});
setInterval(()=>{const c=document.getElementById('cursor');c.style.opacity=c.style.opacity==='0'?'1':'0';},600);

/* ================= DRAG + KLIK (aman mobile: scroll vertikal tetap jalan) ================= */
let dragging=false,px=0,py=0,moved=0,dragVY=0;
canvas.addEventListener('pointerdown',e=>{dragging=true;moved=0;px=e.clientX;py=e.clientY;});
addEventListener('pointermove',e=>{
  if(!dragging)return;
  const dx=e.clientX-px,dy=e.clientY-py;moved+=Math.abs(dx)+Math.abs(dy);
  dragVY=dx*.005;
  groups[current].rotation.y+=dragVY;
  groups[current].rotation.x=THREE.MathUtils.clamp(groups[current].rotation.x+dy*.005,-1,1);
  px=e.clientX;py=e.clientY;
},{passive:true});
addEventListener('pointercancel',()=>{dragging=false;moved=999;});
addEventListener('pointerup',e=>{
  if(!dragging)return;
  dragging=false;
  if(moved<8){
    mouse.x=(e.clientX/innerWidth)*2-1;
    mouse.y=-(e.clientY/innerHeight)*2+1;
    raycaster.setFromCamera(mouse,camera);
    const targets=pickMaps[current]||groups[current].children;
    const hits=raycaster.intersectObjects(targets,true);
    if(clickHandlers[current])clickHandlers[current](hits[0]);
  }
});

let toastTimer;
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg;el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3600);
}

/* ================= LOOP UTAMA + ANIMASI SWAP ================= */
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
  updateTheme(dt);
  groups.forEach((g,i)=>{
    const isActive=i===current;
    const s=g.scale.x;
    const ns=isActive?THREE.MathUtils.lerp(s,1,dt*4):THREE.MathUtils.lerp(s,.0001,dt*6);
    g.scale.setScalar(Math.max(ns,.0001));
    if(!isActive){g.rotation.y+=dt*2.5;}
    else{
      if(!dragging){g.rotation.y+=dragVY;dragVY*=.94;}
      if(updaters[i])updaters[i](dt,t);
    }
  });
  const max=document.body.scrollHeight-innerHeight||1;
  const p=scrollY/max;
  camera.position.x=Math.sin(p*Math.PI*2)*1.2;
  camera.position.y=Math.cos(p*Math.PI)*.6;
  camera.lookAt(0,0,0);
  keyLight.position.x=Math.sin(t*.5)*8;
  fillLight.position.y=Math.cos(t*.4)*6;
  renderer.render(scene,camera);
}
animate();
window.__BOOTED=true;

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

}catch(err){ fatal(err.message+'\n'+(err.stack||'')); }
