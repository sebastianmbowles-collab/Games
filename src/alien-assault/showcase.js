// Model viewer: shows one model on a turntable. models.html?m=bruteclaw&a=0.6
import { THREE } from './engine.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeTextures } from './textures.js';
import * as MD from './models.js';
import * as J from './models2.js';

const LIST = {
  unit07: ['UNIT-07', MD.makeUnit07], arms: ['UNIT-07 ARMS', MD.makeFPArms], patch: ['PATCH', MD.makePatch],
  zippit: ['ZIPPIT', MD.makeZippit], bruteclaw: ['BRUTECLAW', MD.makeBruteclaw], voidfly: ['VOIDFLY', MD.makeVoidfly],
  riftstalker: ['RIFTSTALKER', MD.makeRiftstalker], vrax: ['GENERAL VRAX', MD.makeVrax], emperor: ['NULL EMPEROR', MD.makeEmperor],
  plant: ['ALIEN PLANT', J.makePlant], bug: ['GIANT BUG', J.makeBug], soldier: ['JUNGLE SOLDIER', () => J.makeSoldier(MD.makeZippit)],
  swamp: ['SWAMP MONSTER', J.makeSwamp], mutant: ['HUMAN MUTANT', J.makeMutant], patient: ['PATIENT ZERO', J.makePatientZero],
  nova: ['COMMANDER NOVA', J.makeNova], cart: ['RAIL CART', J.makeCart], tree: ['JUNGLE TREE', J.makeTree],
};
const q = new URLSearchParams(location.search), id = q.get('m') || 'unit07', ang = +(q.get('a') ?? 0.5);
const canvas = document.getElementById('gl');
const R = new THREE.WebGLRenderer({ canvas, antialias: true });
R.setPixelRatio(1); R.setSize(innerWidth, innerHeight, false);
R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = 1.1;
R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
makeTextures();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f18);
scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;
scene.add(new THREE.HemisphereLight(0x9ab8ff, 0x201a28, 0.8));
const key = new THREE.DirectionalLight(0xfff0e0, 2.4); key.position.set(4, 8, 6); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); scene.add(key);
const rim = new THREE.DirectionalLight(0x66aaff, 1.6); rim.position.set(-5, 4, -6); scene.add(rim);

Math.random = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const [name, make] = LIST[id];
const m = make();
m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
m.rotation.y = ang;
scene.add(m);
const bb = new THREE.Box3().setFromObject(m), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
const floor = new THREE.Mesh(new THREE.CircleGeometry(Math.max(size.x, size.z) * 1.2 + 1, 64), new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.8 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = bb.min.y - 0.001; floor.receiveShadow = true; scene.add(floor);
const r = Math.max(size.y, size.x * 0.9, size.z * 0.6);
key.shadow.camera.left = key.shadow.camera.bottom = -r * 1.5; key.shadow.camera.right = key.shadow.camera.top = r * 1.5;
key.target.position.copy(c); scene.add(key.target);
const cam = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 2000);
cam.position.set(c.x, c.y + size.y * 0.15, c.z + r * 2.0); cam.lookAt(c);
const comp = new EffectComposer(R, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }));
comp.addPass(new RenderPass(scene, cam));
comp.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.4, 0.93));
comp.addPass(new OutputPass());
document.getElementById('lbl').textContent = name;
let t = 0;
function frame() {
  t += 1 / 60;
  if (q.get('spin')) m.rotation.y = ang + t * 0.5;
  comp.render();
  window.__ready = true;
  requestAnimationFrame(frame);
}
frame();
window.__LIST = Object.keys(LIST);
