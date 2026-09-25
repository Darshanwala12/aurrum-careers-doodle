// Original geometry only: no third-party character, mesh, texture or animation.
import fs from 'node:fs/promises';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MORPHS, POSES } from '../src/avatar/character/config.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(v => { this.result = v; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(v => { this.result = `data:application/octet-stream;base64,${Buffer.from(v).toString('base64')}`; this.onloadend?.(); }); }
};
const root = new T.Group(); root.name = 'ElenaOriginal';
root.userData = { author: 'Aurrum original procedural character', version: 1, height: 2.65, forward: '+Z', units: 'meters' };
const bones = [], byName = {}, locations = {};
function bone(name, parent, pos) {
  const b = new T.Bone(); b.name = name;
  const origin = locations[parent] ?? [0, 0, 0];
  b.position.set(...pos.map((v, i) => v - origin[i]));
  (byName[parent] ?? root).add(b); byName[name] = b; locations[name] = pos; bones.push(b); return b;
}
bone('Hips', null, [0, 1.05, 0]); bone('Spine', 'Hips', [0, 1.27, 0]);
bone('Chest', 'Spine', [0, 1.57, 0]); bone('Neck', 'Chest', [0, 1.83, 0]);
bone('Head', 'Neck', [0, 2.06, 0]);
for (const [side, s] of [['Left', 1], ['Right', -1]]) {
  bone(`${side}Eye`, 'Head', [s * .145, 2.24, .31]);
  bone(`${side}Shoulder`, 'Chest', [s * .24, 1.7, 0]);
  bone(`${side}UpperArm`, `${side}Shoulder`, [s * .34, 1.65, 0]);
  bone(`${side}LowerArm`, `${side}UpperArm`, [s * .43, 1.32, .015]);
  bone(`${side}Hand`, `${side}LowerArm`, [s * .45, 1.03, .02]);
  for (let f = 0; f < 5; f++) for (let j = 0; j < 3; j++) {
    const n = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'][f];
    bone(`${side}${n}${j + 1}`, j ? `${side}${n}${j}` : `${side}Hand`,
      [s * (.39 + f * .029 + (f === 0 ? -.018 * j : 0)), .956 - j * .035 + (f === 0 ? .045 : 0), .045]);
  }
  bone(`${side}UpperLeg`, 'Hips', [s * .135, 1.02, 0]);
  bone(`${side}LowerLeg`, `${side}UpperLeg`, [s * .14, .58, 0]);
  bone(`${side}Foot`, `${side}LowerLeg`, [s * .14, .15, .03]);
  bone(`${side}Toes`, `${side}Foot`, [s * .14, .08, .19]);
}
const palettes = {
  skin: ['#DCA27F', .65], navy: ['#0B1F3A', .72], white: ['#FFFFFF', .65],
  blue: ['#174A7E', .65], teal: ['#14B8A6', .32], gold: ['#C9A227', .28, .75],
  hair: ['#302035', .38], hairLight: ['#513344', .45], eyeWhite: ['#FFFFFF', .23],
  iris: ['#277C78', .25], dark: ['#201728', .4], lips: ['#A94F5B', .55], blush: ['#DE897E', .75],
};
const buckets = {};
function add(geometry, material, joint, tag = '') {
  const count = geometry.attributes.position.count;
  geometry.deleteAttribute('uv');
  const idx = bones.indexOf(byName[joint]);
  geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(Array.from({ length: count }, () => [idx, 0, 0, 0]).flat(), 4));
  geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(Array.from({ length: count }, () => [1, 0, 0, 0]).flat(), 4));
  // Same topology for all blendshapes, authored in bind space.
  if (['skin', 'eyeWhite', 'iris', 'dark', 'lips', 'blush'].includes(material)) {
    geometry.morphTargetsRelative = true;
    geometry.morphAttributes.position = MORPHS.map(name => {
      const p = geometry.attributes.position, values = [];
      for (let i = 0; i < count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i); let dx = 0, dy = 0, dz = 0;
        const mouth = tag === 'mouth' || tag === 'lip' || tag === 'teeth';
        if (name === 'blink' && tag === 'eye') dy = (2.24 - y) * .96;
        if (name === 'blink' && tag === 'brow') dy = -.018;
        if (name === 'smile' && mouth) { dx = x * .2; dy = Math.abs(x) * .25; }
        if (name === 'browUp' && tag === 'brow') dy = .055;
        if (name === 'browConcern' && tag === 'brow') dy = (.16 - Math.abs(x)) * .5;
        if (name === 'cheekRaise' && tag === 'cheek') dy = .025;
        const shape = { surprise: [.62, 2.9], viseme_aa: [.9, 3.1], viseme_E: [1.2, 1.65], viseme_O: [.55, 2.5], viseme_U: [.4, 1.7], viseme_PP: [1, .15], viseme_FF: [.95, .7], viseme_nn: [.95, 1.3] }[name];
        if (shape && mouth) { dx = x * (shape[0] - 1); dy = (y - 2.065) * (shape[1] - 1); }
        if (shape && tag === 'teeth') dy *= .3;
        // The jaw region deforms alongside the visible lips.
        if (shape && tag === 'face' && y < 2.09 && z > .05) dy = -.022 * Math.max(0, shape[1] - 1) * (1 - Math.min(1, Math.abs(x) / .3));
        values.push(dx, dy, dz);
      }
      const a = new T.Float32BufferAttribute(values, 3); a.name = name; return a;
    });
  }
  (buckets[material] ??= []).push(geometry);
}
function ell(name, pos, size, mat, joint, tag = '', rot = 0, segments = 20) {
  const g = new T.SphereGeometry(1, segments, 14); g.scale(...size); g.rotateZ(rot); g.translate(...pos); add(g, mat, joint, tag);
}
function tube(points, radius, mat, joint, tag = '') {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
  add(new T.TubeGeometry(curve, 16, radius, 6, false), mat, joint, tag);
}
function tapered(points, depth, material, joint) {
  const g = new T.LatheGeometry(points.map(([r, y]) => new T.Vector2(r, y)), 24);
  g.scale(1, 1, depth); add(g, material, joint);
}
function limb(a, b, r1, r2, mat, joint, depth = 1) {
  const start = new T.Vector3(...a), end = new T.Vector3(...b), delta = end.clone().sub(start);
  const g = new T.CylinderGeometry(r1, r2, delta.length(), 16, 4);
  g.scale(1, 1, depth);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), start.clone().sub(end).normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); add(g, mat, joint);
}
// Master design: softly squared bob, side sweep, almond teal eyes, tailored
// navy jacket over a white blouse, tapered trousers and white trainers.
tapered([[0,1.10],[.25,1.10],[.255,1.16],[.225,1.35],[.265,1.58],[.29,1.68],[.22,1.75],[.10,1.79],[0,1.79]], .62, 'navy', 'Chest');
ell('hips', [0, 1.06, 0], [.255, .17, .16], 'navy', 'Hips');
ell('blouse', [0, 1.59, .143], [.14, .22, .04], 'white', 'Chest');
for (const s of [-1, 1]) {
  ell('lapel', [s * .125, 1.6, .163], [.046, .195, .021], 'blue', 'Chest', '', s * -.37);
  ell('pocket', [s * .19, 1.32, .155], [.06, .011, .015], 'blue', 'Chest');
}
ell('neck', [0, 1.86, 0], [.09, .14, .09], 'skin', 'Neck');
ell('face', [0, 2.23, .02], [.345, .365, .295], 'skin', 'Head', 'face', 0, 32);
ell('bob-back', [0, 2.26, -.115], [.37, .39, .25], 'hair', 'Head', '', 0, 28);
ell('crown', [0, 2.49, -.02], [.35, .18, .27], 'hair', 'Head');
for (const s of [-1, 1]) {
  ell('bob-side', [s * .305, 2.21, -.035], [.09, .30, .19], 'hair', 'Head', '', s * -.08);
  ell('ear', [s * .337, 2.18, .012], [.052, .085, .054], 'skin', 'Head');
  ell('earring', [s * .35, 2.10, .04], [.025, .034, .023], 'gold', 'Head');
  ell('eye', [s * .145, 2.24, .276], [.108, .084, .054], 'eyeWhite', `${s === 1 ? 'Left' : 'Right'}Eye`, 'eye', s * -.07);
  ell('iris', [s * .145, 2.238, .324], [.052, .061, .018], 'iris', `${s === 1 ? 'Left' : 'Right'}Eye`, 'eye');
  ell('pupil', [s * .145, 2.237, .34], [.026, .037, .009], 'dark', `${s === 1 ? 'Left' : 'Right'}Eye`, 'eye');
  ell('catchlight', [s * .145 - .015, 2.26, .349], [.012, .016, .006], 'eyeWhite', `${s === 1 ? 'Left' : 'Right'}Eye`, 'eye');
  tube([[s * .06, 2.35, .275], [s * .14, 2.375, .295], [s * .235, 2.35, .251]], .015, 'dark', 'Head', 'brow');
  tube([[s * .045, 2.26, .302], [s * .14, 2.319, .31], [s * .247, 2.27, .278]], .009, 'dark', 'Head', 'eye');
  ell('cheek', [s * .22, 2.137, .254], [.056, .025, .009], 'blush', 'Head', 'cheek');
}
// Asymmetric swoop makes the silhouette recognizable from all four views.
ell('fringe', [-.12, 2.49, .203], [.235, .09, .095], 'hair', 'Head', '', .30);
ell('fringe-tip', [-.285, 2.395, .16], [.075, .14, .10], 'hair', 'Head', '', -.18);
for (let i = 0; i < 3; i++) tube([[-.30 + i * .025, 2.42, .25], [-.18, 2.55 + i * .012, .249], [.10, 2.59, .13]], .006, 'hairLight', 'Head');
ell('nose', [0, 2.17, .303], [.045, .058, .065], 'skin', 'Head');
ell('mouth', [0, 2.065, .277], [.10, .025, .014], 'dark', 'Head', 'mouth');
tube([[-.10, 2.073, .28], [0, 2.034, .292], [.10, 2.073, .28]], .010, 'lips', 'Head', 'lip');
ell('teeth', [0, 2.072, .29], [.074, .008, .006], 'eyeWhite', 'Head', 'teeth');
ell('pin', [.19, 1.68, .185], [.027, .027, .012], 'gold', 'Chest');
ell('pin-core', [.19, 1.68, .2], [.011, .011, .006], 'teal', 'Chest');
for (const [side, s] of [['Left', 1], ['Right', -1]]) {
  ell('shoulder', [s * .325, 1.66, 0], [.105, .105, .105], 'navy', `${side}UpperArm`);
  limb([s*.33,1.67,0], [s*.43,1.32,.015], .098,.078,'navy',`${side}UpperArm`);
  ell('elbow', [s*.43,1.32,.015], [.078,.079,.078], 'navy', `${side}LowerArm`);
  limb([s*.43,1.32,.015], [s*.45,1.075,.02], .078,.068,'navy',`${side}LowerArm`);
  ell('cuff', [s * .45, 1.075, .02], [.076, .036, .079], 'white', `${side}LowerArm`);
  ell('palm', [s * .45, .991, .02], [.075, .073, .039], 'skin', `${side}Hand`);
  for (let f = 0; f < 5; f++) for (let j = 0; j < 3; j++) {
    const name = `${side}${['Thumb', 'Index', 'Middle', 'Ring', 'Little'][f]}${j + 1}`;
    const p = [...locations[name]]; p[1] -= .015;
    ell('finger', p, [.014, .028, .016], 'skin', name, '', f === 0 ? s * -.4 : 0, 8);
  }
  limb([s*.135,1.08,0],[s*.14,.58,0],.124,.095,'navy',`${side}UpperLeg`,1.1);
  ell('knee', [s*.14,.58,0], [.095,.10,.104], 'navy', `${side}LowerLeg`);
  limb([s*.14,.58,0],[s*.14,.15,0],.095,.072,'navy',`${side}LowerLeg`,1.1);
  ell('shoe', [s * .14, .10, .087], [.12, .084, .205], 'white', `${side}Foot`);
  ell('sole', [s * .14, .05, .095], [.123, .031, .21], 'blue', `${side}Foot`);
  ell('shoe-accent', [s * .14, .14, .23], [.08, .009, .018], 'teal', `${side}Foot`);
}
root.updateMatrixWorld(true);
const skeleton = new T.Skeleton(bones); skeleton.calculateInverses();
for (const [name, geometries] of Object.entries(buckets)) {
  const g = mergeGeometries(geometries);
  // mergeGeometries checks this flag but does not copy it onto the result.
  // Preserve delta coordinates or export subtracts the bind pose twice.
  g.morphTargetsRelative = true;
  const [color, roughness, metalness = 0] = palettes[name];
  const material = new T.MeshStandardMaterial({ color, roughness, metalness }); material.name = name;
  const mesh = new T.SkinnedMesh(g, material); mesh.name = `Elena_${name}`;
  mesh.bind(skeleton, new T.Matrix4()); mesh.frustumCulled = false;
  if (g.morphAttributes.position) { mesh.morphTargetDictionary = Object.fromEntries(MORPHS.map((n, i) => [n, i])); mesh.morphTargetInfluences = MORPHS.map(() => 0); }
  root.add(mesh);
}
const animated = ['Hips', 'Spine', 'Chest', 'Head', 'LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand', ...bones.filter(b => /(?:Thumb|Index|Middle|Ring|Little)\d/.test(b.name)).map(b => b.name)];
const clips = Object.entries(POSES).map(([name, pose]) => {
  const duration = name === 'blink' ? .18 : name === 'idle' ? 4 : 2;
  const times = [0, duration * .25, duration * .5, duration * .75, duration];
  const tracks = animated.map(n => {
    const values = times.flatMap((t, i) => {
      const r = [...(pose[n] ?? [0, 0, 0])];
      if (n === 'Spine') r[0] += Math.sin(t / duration * Math.PI * 2) * .014;
      if (n === 'Head' && name === 'idle') r[1] += Math.sin(t / duration * Math.PI * 2) * .025;
      if (n === 'Hips') r[2] += Math.sin(t / duration * Math.PI * 2) * .006;
      if (n === 'Head' && ['talking', 'explaining', 'encouraging'].includes(name)) r[0] += Math.sin(t / duration * Math.PI * 2) * .045;
      if (n === 'RightHand' && name === 'greeting') r[2] += (i % 2 ? .3 : -.2);
      if (/(?:Middle|Ring|Little)\d/.test(n) && name === 'pointing') r[0] = -.9;
      return new T.Quaternion().setFromEuler(new T.Euler(...r)).toArray();
    }); return new T.QuaternionKeyframeTrack(`${n}.quaternion`, times, values);
  });
  if (name === 'blink') for (const mesh of root.children.filter(o => o.morphTargetInfluences)) {
    tracks.push(new T.NumberKeyframeTrack(`${mesh.name}.morphTargetInfluences`, times, times.flatMap((_, i) => MORPHS.map(m => m === 'blink' ? [0, .6, 1, .6, 0][i] : 0))));
  }
  return new T.AnimationClip(name, duration, tracks);
});
const data = await new GLTFExporter().parseAsync(root, { binary: true, animations: clips, onlyVisible: true });
await fs.mkdir('public/avatars', { recursive: true });
await fs.writeFile('public/avatars/elena-original.glb', Buffer.from(data));
console.log(`Elena: ${bones.length} bones, ${Object.keys(buckets).length} material meshes, ${MORPHS.length} morphs, ${clips.length} clips, ${(data.byteLength / 1024).toFixed(0)} KiB`);
