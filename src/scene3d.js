import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PATH, TYPES } from './game.js';

const CREATURES = {
  scout: { body:'#657447', armor:'#a79760', horn:'#dbc087' },
  brute: { body:'#883f37', armor:'#ce7752', horn:'#e7b377' },
  runner: { body:'#855340', armor:'#d09a55', horn:'#f0cc83' },
  shield: { body:'#454c79', armor:'#9a8fc0', horn:'#d8c1e9' },
};
const WEAPON_COLORS = { pulse:'#75e6c0', rail:'#a998ff', frost:'#65c8f2', gatling:'#f4c96b', mortar:'#f28d76', artillery:'#ff806d' };
const UP = new THREE.Vector3(0, 1, 0);
const MAP_PLANE = new THREE.Plane(UP, 0);
const MATERIAL = (color, roughness=.75, metalness=.06) => new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading:true });

function writeInstance(attribute,index,x,y,z,scale,yaw=0) {
  const a=attribute.array,o=index*16,c=Math.cos(yaw)*scale,s=Math.sin(yaw)*scale;
  a[o]=c;a[o+1]=0;a[o+2]=-s;a[o+3]=0;
  a[o+4]=0;a[o+5]=scale;a[o+6]=0;a[o+7]=0;
  a[o+8]=s;a[o+9]=0;a[o+10]=c;a[o+11]=0;
  a[o+12]=x;a[o+13]=y;a[o+14]=z;a[o+15]=1;
}

function addLimb(parts, a, b, radiusA, radiusB=radiusA) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), axis = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(radiusB, radiusA, axis.length(), 4, 1);
  geometry.translate(0, axis.length()/2, 0);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, axis.normalize()));
  geometry.translate(...start.toArray());
  parts.push(geometry);
}

function addSphere(parts, radius, position, scale=[1,1,1], segments=4) {
  const geometry = new THREE.SphereGeometry(radius, segments, 2);
  geometry.scale(...scale);
  geometry.translate(...position);
  parts.push(geometry);
}

function addCone(parts, radius, height, position, rotation=0) {
  const geometry = new THREE.ConeGeometry(radius, height, 4);
  geometry.rotateZ(rotation);
  geometry.translate(...position);
  parts.push(geometry);
}

function characterGeometry(type, pose) {
  const phase = pose * Math.PI / 2;
  const legSwing = Math.sin(phase) * 4;
  const armSwing = Math.sin(phase + Math.PI) * 2;
  const parts = [];
  addSphere(parts, 5, [0,15,0], [1,1.5,.68]);
  addSphere(parts, 5.1, [0,26,0], [.9,1,.75]);
  addLimb(parts, [-2,11,0], [-3+legSwing,4,0], 2.4,1.6);
  addLimb(parts, [-3+legSwing,4,0], [-4+legSwing,1,1], 1.6,1.5);
  addLimb(parts, [2,11,0], [3-legSwing,4,0], 2.4,1.6);
  addLimb(parts, [3-legSwing,4,0], [4-legSwing,1,1], 1.6,1.5);
  addLimb(parts, [-3,19,0], [-7+armSwing,14,1], 1.9,1.4);
  addLimb(parts, [-7+armSwing,14,1], [-5+armSwing,12,2], 1.4,1.2);
  addLimb(parts, [3,19,0], [8-armSwing,15,1], 1.9,1.4);
  addLimb(parts, [8-armSwing,15,1], [11-armSwing,18,2], 1.4,1.2);
  addSphere(parts, 2.5, [0,28,0], [1.2,.8,.8], 6);
  addCone(parts, 1.8, 6, [-3,30,1], -.38);
  addCone(parts, 1.8, 6, [3,30,1], .38);
  addLimb(parts, [12-armSwing,18,2], [15-armSwing,39,2], .7,.55);
  addCone(parts, 1.2, 5, [15-armSwing,42,2]);
  if (type === 'shield') {
    const shield = new THREE.Shape().moveTo(-10,24).lineTo(-17,21).lineTo(-16,11).lineTo(-11,7).lineTo(-6,12).lineTo(-6,21).closePath();
    const geometry = new THREE.ShapeGeometry(shield);
    geometry.translate(0,0,2.5);
    parts.push(geometry);
  }
  if (type === 'brute') {
    addSphere(parts, 6, [0,16,-.5], [1.35,1.2,.8]);
    addSphere(parts, 3, [0,19,2], [1,.35,.2], 6);
  }
  return mergeGeometries(parts, false);
}

function makePathCurve(width, height) {
  const points = PATH.map(point => new THREE.Vector3(point.x*width, 0, -point.y*height));
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', .14);
}

function roadRibbon(curve, width, y, offset=0) {
  const points = curve.getSpacedPoints(220);
  const positions = [], indices = [];
  for (let i=0;i<points.length;i++) {
    const previous = points[Math.max(0,i-1)], next = points[Math.min(points.length-1,i+1)];
    const dx = next.x-previous.x, dz = next.z-previous.z, length = Math.hypot(dx,dz) || 1;
    const sideX = -dz/length, sideZ = dx/length;
    const centerX = points[i].x + sideX*offset, centerZ = points[i].z + sideZ*offset;
    positions.push(centerX+sideX*width/2,y,centerZ+sideZ*width/2, centerX-sideX*width/2,y,centerZ-sideZ*width/2);
    if (i < points.length-1) {
      const a=i*2, b=a+1, c=a+2, d=a+3;
      indices.push(a,c,b,b,c,d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addTunnel(scene, width, height) {
  const start = PATH[0], x=start.x*width+22, z=-start.y*height;
  const stone = MATERIAL('#4b4a42',1), highlight = MATERIAL('#77715f',.95), shadow = MATERIAL('#111719',1);
  const portalShape = new THREE.Shape();
  portalShape.moveTo(-27,0); portalShape.lineTo(-27,22); portalShape.quadraticCurveTo(-27,50,0,50); portalShape.quadraticCurveTo(27,50,27,22); portalShape.lineTo(27,0); portalShape.closePath();
  const portal = new THREE.Mesh(new THREE.ShapeGeometry(portalShape), shadow);
  portal.position.set(x,1,z+4); scene.add(portal);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(29,7,7,18,Math.PI), highlight);
  arch.position.set(x,25,z+5); scene.add(arch);
  const back = new THREE.Mesh(new THREE.BoxGeometry(70,52,5),stone);
  back.position.set(x,26,z-3); scene.add(back);
  const opening = new THREE.Mesh(new THREE.ShapeGeometry(portalShape), shadow);
  opening.position.set(x,1,z+.1); scene.add(opening);
  for (const [dx,dy,scale] of [[-31,8,.9],[31,8,.95],[-23,45,.85],[22,47,1.05],[-9,53,.75],[9,53,.8]]) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(12,0), dy>40?highlight:stone);
    rock.position.set(x+dx,dy,z+7);
    rock.scale.set(scale,scale*1.1,.65);
    scene.add(rock);
  }
}

function addScenery(scene, width, height) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width,height), MATERIAL('#3d5840',.98));
  floor.rotation.x = -Math.PI/2;
  floor.position.set(width/2,-2,-height/2);
  scene.add(floor);

  const curve = makePathCurve(width,height);
  const shoulder = new THREE.Mesh(roadRibbon(curve,64,.05), MATERIAL('#a29572',.98));
  const curb = new THREE.Mesh(roadRibbon(curve,60,.16), MATERIAL('#777970',.95));
  const asphalt = new THREE.Mesh(roadRibbon(curve,52,.3), MATERIAL('#414849',.92,.04));
  const worn = new THREE.Mesh(roadRibbon(curve,46,.38), MATERIAL('#4b5251',.95));
  scene.add(shoulder,curb,asphalt,worn);

  const lanePaint = MATERIAL('#ddc985',.82);
  const length = curve.getLength();
  for (let distance=17;distance<length-14;distance+=35) {
    const t=distance/length, p=curve.getPointAt(t), tangent=curve.getTangentAt(t);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(15,.45,2.2),lanePaint);
    dash.position.set(p.x,.62,p.z);
    dash.rotation.y=Math.atan2(-tangent.z,tangent.x);
    scene.add(dash);
  }

  const edgePaint = MATERIAL('#c8c7b7',.82);
  scene.add(new THREE.Mesh(roadRibbon(curve,1.5,.58,25),edgePaint));
  scene.add(new THREE.Mesh(roadRibbon(curve,1.5,.58,-25),edgePaint));

  const rocks = MATERIAL('#526248',1), grass = MATERIAL('#77865b',1);
  for (let i=0;i<58;i++) {
    const sx=((i*163.37+31)%width), sy=((i*91.13+17)%height);
    const z=-sy, near=curve.getPoints(100).some(p=>Math.hypot(p.x-sx,p.z-z)<47);
    if (near || (sx<width*.09 && sy>height*.58) || (sx>width*.83 && sy<height*.52)) continue;
    const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(7+(i%4)*1.5,0),i%3===0?grass:rocks);
    rock.position.set(sx,2,z); rock.scale.set(1.35,.62,.92); rock.rotation.y=i*1.21; scene.add(rock);
  }
  addTunnel(scene,width,height);
  return curve;
}

function buildHome(level) {
  const group=new THREE.Group();
  const stone=MATERIAL('#777363',.9), walls=MATERIAL(level>=4?'#b1a17a':level>=2?'#a28b63':'#806d50',.88), roof=MATERIAL(level>=5?'#577d62':'#493e38',.8), wood=MATERIAL('#574335',.86), glass=new THREE.MeshStandardMaterial({color:'#f5cf79',emissive:'#dca94f',emissiveIntensity:.55,roughness:.3});
  const add=(geo,mat,x,y,z)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
  add(new THREE.BoxGeometry(62,7,52),stone,0,3.5,0);
  add(new THREE.BoxGeometry(48,34,40),walls,0,24,0);
  const roofCap=add(new THREE.ConeGeometry(39,30,4),roof,0,54,0); roofCap.rotation.y=Math.PI/4;
  add(new THREE.BoxGeometry(8,18,2),wood,0,16,21);
  for(const x of [-15,15]) { add(new THREE.BoxGeometry(8,9,2),glass,x,28,21); add(new THREE.BoxGeometry(9,1.5,2.5),wood,x,28,22); }
  add(new THREE.BoxGeometry(5,16,6),stone,17,42,-12);
  if(level>=2) for(const x of [-25,25]) add(new THREE.BoxGeometry(3,38,3),wood,x,23,0);
  if(level>=3) { const beacon=add(new THREE.OctahedronGeometry(6,0),new THREE.MeshStandardMaterial({color:'#85edc2',emissive:'#42d89b',emissiveIntensity:1.3}),0,75,0); beacon.rotation.y=Math.PI/4; }
  if(level>=4) for(const x of [-19,19]) add(new THREE.BoxGeometry(3,2,8),stone,x,46,23);
  if(level>=5) { const flag=add(new THREE.BoxGeometry(2,19,2),wood,0,80,0); add(new THREE.BoxGeometry(13,7,1),glass,6,85,0); }
  group.userData.materials=[stone,walls,roof,wood,glass,...group.children.map(o=>o.material).filter(m=>! [stone,walls,roof,wood,glass].includes(m))];
  return group;
}

function buildOutpost(type) {
  const group=new THREE.Group(), supply=type==='supply';
  const walls=MATERIAL(supply?'#8c7655':'#64705b',.9), roof=MATERIAL(supply?'#70513a':'#394b40',.82), trim=MATERIAL('#b8a57a',.82);
  const body=new THREE.Mesh(new THREE.BoxGeometry(30,23,26),walls); body.position.y=12; group.add(body);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(23,17,4),roof); cap.position.y=31; cap.rotation.y=Math.PI/4; group.add(cap);
  const door=new THREE.Mesh(new THREE.BoxGeometry(6,13,2),trim); door.position.set(0,7,14); group.add(door);
  if(supply) { const crateMat=MATERIAL('#ad8553',.95); for(let i=0;i<2;i++){const crate=new THREE.Mesh(new THREE.BoxGeometry(9,8,9),crateMat);crate.position.set(i?20:-20,4,6);group.add(crate);} }
  else { const lamp=new THREE.Mesh(new THREE.OctahedronGeometry(5,0),new THREE.MeshStandardMaterial({color:'#83eabd',emissive:'#45d99b',emissiveIntensity:1.2}));lamp.position.set(0,35,0);group.add(lamp); }
  group.userData.materials=[walls,roof,trim,...group.children.map(o=>o.material).filter(m=>m!==walls&&m!==roof&&m!==trim)];
  return group;
}

function releaseObject(root) {
  root.traverse(object=>{
    object.geometry?.dispose();
    if(Array.isArray(object.material)) object.material.forEach(m=>m.dispose());
    else object.material?.dispose();
  });
}

function makeGun(type) {
  const d=TYPES[type],group=new THREE.Group(),base=MATERIAL('#343e3e',.58,.42),steel=MATERIAL('#76817e',.43,.54),dark=MATERIAL('#202a2c',.62,.5),glow=MATERIAL(d.color,.28,.27),siege=type==='artillery';
  const add=(geo,mat,x,y,z)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
  const frame=add(new THREE.BoxGeometry(siege?32:23,siege?9:7,siege?24:15),base,0,4,0);
  const housing=add(new THREE.BoxGeometry(siege?25:type==='mortar'?15:18,siege?19:12,siege?20:13),steel,0,siege?14:12,0);
  const barrel=add(new THREE.CylinderGeometry(type==='mortar'?3:siege?4.2:1.9,type==='mortar'?4:siege?5.4:2.6,type==='mortar'?20:siege?36:26,8),dark,siege?20:15,siege?16:13,0);
  barrel.rotation.z=-Math.PI/2;
  const muzzle=add(new THREE.CylinderGeometry(type==='mortar'?4:siege?6:3,type==='mortar'?4:siege?6:3,3,8),glow,siege?39:29,siege?16:13,0); muzzle.rotation.z=-Math.PI/2;
  let rotor=null;
  if(type==='gatling') { rotor=new THREE.Group();rotor.position.set(15,12,0);for(let i=0;i<4;i++){const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.65,.9,26,5),dark);pipe.rotation.z=-Math.PI/2;pipe.position.set(0,Math.cos(i*Math.PI/2)*2.2,Math.sin(i*Math.PI/2)*2.2);rotor.add(pipe);}group.add(rotor); }
  if(type==='rail') for(let i=0;i<3;i++){const coil=add(new THREE.TorusGeometry(4,.8,5,10),glow,7+i*5,13,0);coil.rotation.y=Math.PI/2;}
  if(type==='frost') for(let i=0;i<2;i++){const tank=add(new THREE.CylinderGeometry(2.2,2.2,10,6),glow,-3+i*6,7,-6);tank.rotation.z=Math.PI/2;}
  if(type==='mortar'){barrel.rotation.z=-Math.PI/2.5;barrel.position.set(10,16,0);muzzle.rotation.z=-Math.PI/2.5;muzzle.position.set(20,20,0);}
  const range=new THREE.Mesh(new THREE.RingGeometry(d.range-1,d.range,48),new THREE.MeshBasicMaterial({color:d.color,transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false}));
  range.rotation.x=-Math.PI/2;range.position.y=.7;range.visible=false;group.add(range);
  group.userData={range,type,rotor,materials:[base,steel,dark,glow,range.material]};
  return group;
}

function gunGeometry(type) {
  const siege=type==='artillery',mortar=type==='mortar';
  const parts=[new THREE.BoxGeometry(siege?32:23,siege?9:7,siege?24:15),new THREE.BoxGeometry(siege?25:mortar?15:18,siege?19:12,siege?20:mortar?14:13)];
  parts[0].translate(0,4,0);parts[1].translate(0,siege?14:12,0);
  const barrel=new THREE.CylinderGeometry(mortar?3:siege?4.2:1.9,mortar?4:siege?5.4:2.6,mortar?20:siege?36:26,6);
  barrel.rotateZ(mortar?-Math.PI/2.5:-Math.PI/2);barrel.translate(mortar?10:siege?20:15,mortar?16:siege?16:13,0);parts.push(barrel);
  const muzzle=new THREE.CylinderGeometry(mortar?4:siege?6:3,mortar?4:siege?6:3,3,6);
  muzzle.rotateZ(mortar?-Math.PI/2.5:-Math.PI/2);muzzle.translate(mortar?20:siege?39:29,mortar?20:siege?16:13,0);parts.push(muzzle);
  if(type==='gatling')for(let i=0;i<4;i++){const pipe=new THREE.CylinderGeometry(.65,.9,26,4);pipe.rotateZ(-Math.PI/2);pipe.translate(15,12+Math.cos(i*Math.PI/2)*2.2,Math.sin(i*Math.PI/2)*2.2);parts.push(pipe);}
  if(type==='rail')for(let i=0;i<3;i++){const coil=new THREE.TorusGeometry(4,.8,4,8);coil.rotateY(Math.PI/2);coil.translate(7+i*5,13,0);parts.push(coil);}
  return mergeGeometries(parts,false);
}

export function createBattlefield(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
  const readoutCanvas=document.createElement('canvas');readoutCanvas.className='enemy-readouts';readoutCanvas.setAttribute('aria-hidden','true');canvas.parentElement?.insertBefore(readoutCanvas,canvas.nextSibling);
  const readout=readoutCanvas.getContext('2d');
  renderer.setPixelRatio(1); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1; renderer.setClearColor('#263a34');
  const scene=new THREE.Scene(), camera=new THREE.OrthographicCamera(-500,500,300,-300,.1,5000);
  scene.add(new THREE.HemisphereLight('#e2e5d0','#23312b',2.1));
  const sun=new THREE.DirectionalLight('#ffe5b5',2.5); sun.position.set(-280,620,440); scene.add(sun);
  let width=0,height=0,world=new THREE.Group(),curve=makePathCurve(1,1),settlement=new THREE.Group(),settlementKey='';
  scene.add(world,settlement);
  const walkers=[];
  let activePixelRatio=1;
  const walkerCounters=new Uint16Array(4),walkerColors={};
  for(const [type,creature] of Object.entries(CREATURES))walkerColors[type]=new THREE.Color(creature.body);
  for(let pose=0;pose<4;pose++) {
    // Four pose batches share geometry and tint each instance by enemy archetype.
    // 5k instances are split evenly across these batches in the stress fixture.
    const mesh=new THREE.InstancedMesh(characterGeometry('scout',pose),new THREE.MeshLambertMaterial({color:'#ffffff',flatShading:true}),5000);
    mesh.setColorAt(0,walkerColors.scout);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
    walkers.push({pose,mesh});
  }
  const towerTypes=Object.keys(TYPES),towerBatches=towerTypes.map(type=>{
    const material=new THREE.MeshStandardMaterial({color:'#75817c',roughness:.52,metalness:.38,flatShading:true});
    const mesh=new THREE.InstancedMesh(gunGeometry(type),material,100);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);return {type,mesh};
  });
  const towerCounts=new Uint16Array(towerBatches.length),towerTypeIndex=new Map(towerTypes.map((type,index)=>[type,index]));
  const selectedRange=new THREE.Mesh(new THREE.RingGeometry(0,1,40),new THREE.MeshBasicMaterial({color:'#75e6c0',transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));selectedRange.rotation.x=-Math.PI/2;selectedRange.visible=false;scene.add(selectedRange);
  const projectileGroups=Object.entries(WEAPON_COLORS).map(([type,color])=>{
    const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.8,roughness:.2});
    const mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(2.4,6,5),material,1200);
    mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);return {type,color,mesh};
  });
  const projectileColorIndex=new Map(projectileGroups.map((group,index)=>[group.color,index]));
  const projectileCounts=new Uint16Array(projectileGroups.length);
  const dummy=new THREE.Object3D(), raycaster=new THREE.Raycaster(), ndc=new THREE.Vector2(), hit=new THREE.Vector3(), frustum=new THREE.Frustum(), viewMatrix=new THREE.Matrix4(), viewSphere=new THREE.Sphere(new THREE.Vector3(),46), viewPoint=new THREE.Vector3(),labelPoint=new THREE.Vector3();

  function drawEnemyValues(s,w,h) {
    if(readoutCanvas.width!==w||readoutCanvas.height!==h){readoutCanvas.width=w;readoutCanvas.height=h;}
    readout.clearRect(0,0,w,h);
    if(s.stress)return;
    readout.font='700 9px ui-monospace, monospace';readout.textAlign='center';readout.textBaseline='middle';
    for(const enemy of s.enemies){
      if(enemy.alive===false)continue;
      labelPoint.set(enemy.x,53,-enemy.y).project(camera);if(labelPoint.z<-1||labelPoint.z>1||Math.abs(labelPoint.x)>1.04||Math.abs(labelPoint.y)>1.04)continue;
      const x=(labelPoint.x+1)*w*.5,y=(1-labelPoint.y)*h*.5,ratio=Math.max(0,Math.min(1,enemy.hp/(enemy.maxHp||1))),top=y-4;
      readout.fillStyle='rgba(8,13,13,.8)';readout.fillRect(x-12,top,24,2.5);readout.fillStyle='#70e3a2';readout.fillRect(x-12,top,24*ratio,2.5);
    }
  }

  function setCamera(w,h) {
    const centerZ=-h/2, offset=Math.max(w,h)*1.45, frameHeight=h*Math.SQRT1_2+110;
    camera.left=-w/2;camera.right=w/2;camera.top=frameHeight/2;camera.bottom=-frameHeight/2;
    camera.position.set(w/2,offset*Math.SQRT1_2,centerZ+offset*Math.SQRT1_2);
    camera.lookAt(w/2,0,centerZ);camera.up.set(0,1,0);camera.updateProjectionMatrix();
  }

  function positionSettlement(s) {
    const key=`${width}x${height}:h${s.houseLevel}:w${s.outposts?.watch||0}:s${s.outposts?.supply||0}`;
    if(key===settlementKey)return;
    scene.remove(settlement);releaseObject(settlement);settlement=new THREE.Group();scene.add(settlement);settlementKey=key;
    const end=PATH[PATH.length-1],home=buildHome(s.houseLevel||1);
    home.position.set(end.x*width-24,0,-end.y*height-22);settlement.add(home);
    const countWatch=s.outposts?.watch||0,countSupply=s.outposts?.supply||0;
    for(let i=0;i<countWatch;i++){const post=buildOutpost('watch');post.position.set(home.position.x-54-i*22,0,home.position.z+33+i*25);settlement.add(post);}
    for(let i=0;i<countSupply;i++){const post=buildOutpost('supply');post.position.set(home.position.x-70-i*22,0,home.position.z-34-i*25);settlement.add(post);}
  }

  function resize(w,h) {
    w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
    if(w!==width||h!==height){
      scene.remove(world);releaseObject(world);world=new THREE.Group();scene.add(world);
      curve=addScenery(world,w,h);width=w;height=h;settlementKey='';
    }
    renderer.setSize(w,h,true);renderer.setViewport(0,0,w,h);renderer.setScissorTest(false);setCamera(w,h);readoutCanvas.width=w;readoutCanvas.height=h;
  }

  function render(s,w,h) {
    if(width!==w||height!==h)resize(w,h);
    const desiredPixelRatio=s.stress?.58:1;
    if(desiredPixelRatio!==activePixelRatio){activePixelRatio=desiredPixelRatio;renderer.setPixelRatio(activePixelRatio);renderer.setSize(width,height,false);}
    positionSettlement(s);
    camera.updateMatrixWorld();viewMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(viewMatrix);
    walkerCounters.fill(0);
    for(const group of walkers)group.mesh.count=0;
    for(const enemy of s.enemies){
      viewSphere.center.set(enemy.x,18,-enemy.y);if(!frustum.intersectsSphere(viewSphere))continue;
      const pose=Math.floor((s.clock*6+(enemy.poseSeed??enemy.id%4))%4),group=walkers[pose],instance=walkerCounters[pose]++;
      const a=PATH[Math.min(enemy.progress,PATH.length-2)],b=PATH[Math.min(enemy.progress+1,PATH.length-1)];
      const yaw=Math.atan2(b.y-a.y,b.x-a.x);
      const scale=(enemy.type==='brute'?1.18:enemy.type==='runner'?.9:enemy.type==='shield'?1.03:1)*(enemy.boss?1.5:1);
      writeInstance(group.mesh.instanceMatrix,instance,enemy.x,0,-enemy.y,scale,yaw);
      group.mesh.setColorAt(instance,walkerColors[enemy.type]||walkerColors.scout);
    }
    for(let i=0;i<walkers.length;i++){const mesh=walkers[i].mesh,n=walkerCounters[i];mesh.count=n;if(n){mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,n*16);mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.addUpdateRange(0,n*3);mesh.instanceColor.needsUpdate=true;}}

    towerCounts.fill(0);selectedRange.visible=false;
    for(const tower of s.towers){
      const index=towerTypeIndex.get(tower.type),batch=towerBatches[index],n=towerCounts[index];if(n>=batch.mesh.instanceMatrix.count)continue;
      writeInstance(batch.mesh.instanceMatrix,n,tower.x,0,-tower.y,1,tower.aimAngle||0);towerCounts[index]++;
      if(tower.id===s.selected){selectedRange.position.set(tower.x,.72,-tower.y);selectedRange.scale.setScalar(TYPES[tower.type].range*(1+(tower.level-1)*.12));selectedRange.visible=true;}
    }
    for(let i=0;i<towerBatches.length;i++){const mesh=towerBatches[i].mesh,n=towerCounts[i];mesh.count=n;if(n){mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,n*16);mesh.instanceMatrix.needsUpdate=true;}}
    projectileCounts.fill(0);
    for(const shot of s.shots){
      const index=projectileColorIndex.get(shot.color);if(index===undefined)continue;
      const group=projectileGroups[index],n=projectileCounts[index];
      viewPoint.set(shot.x+(shot.tx-shot.x)*.14,9,-(shot.y+(shot.ty-shot.y)*.14));if(!frustum.containsPoint(viewPoint)||n>=group.mesh.instanceMatrix.count)continue;
      writeInstance(group.mesh.instanceMatrix,n,viewPoint.x,viewPoint.y,viewPoint.z,group.type==='artillery'?2.2:group.type==='mortar'?1.6:1);projectileCounts[index]++;
    }
    for(let i=0;i<projectileGroups.length;i++){const mesh=projectileGroups[i].mesh,n=projectileCounts[i];mesh.count=n;if(n){mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,n*16);mesh.instanceMatrix.needsUpdate=true;}}
    renderer.render(scene,camera);drawEnemyValues(s,w,h);
  }

  function point(clientX,clientY) {
    const rect=canvas.getBoundingClientRect();ndc.set(((clientX-rect.left)/rect.width)*2-1,-((clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(ndc,camera);
    const intersection=raycaster.ray.intersectPlane(MAP_PLANE,hit);
    return intersection?{x:intersection.x,y:-intersection.z}:{x:0,y:0};
  }

  function dispose() {
    renderer.dispose();readoutCanvas.remove();for(const batch of towerBatches){scene.remove(batch.mesh);batch.mesh.geometry.dispose();batch.mesh.material.dispose();}scene.remove(selectedRange);selectedRange.geometry.dispose();selectedRange.material.dispose();
    scene.remove(settlement);releaseObject(settlement);scene.remove(world);releaseObject(world);
    for(const group of walkers){group.mesh.geometry.dispose();group.mesh.material.dispose();}
    for(const group of projectileGroups){group.mesh.geometry.dispose();group.mesh.material.dispose();}
  }

  return {resize,render,point,dispose};
}
