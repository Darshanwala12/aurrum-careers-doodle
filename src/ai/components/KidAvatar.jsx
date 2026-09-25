import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STATES } from '../../data/states.js';
import { resolveState } from '../../avatar/stateMap.js';

/**
 * Candidate 1 (user-provided glb.glb), driven procedurally instead of just
 * timescaling its one baked clip. Honest limitation unchanged: no facial
 * morph targets, so no real lip-sync/blinking/expressions — but the model
 * DOES have a full finger-rigged Mixamo skeleton (arms, hands, spine, head,
 * hips), so everything skeletal that DoodleCompanion/CareerCounsellorAvatar
 * does with SVG bones, this does with real 3D bones: continuous idle
 * breathing + weight shift, a head tilt/nod that responds to
 * listening/thinking/speaking, and the same {expression, arm} pose table
 * from stateMap.js — reused as-is, just aimed at bone rotations instead of
 * SVG transforms — for gesture states (wave, point, explain, thumb, chin).
 */
const MODEL_URL = '/avatars/kid.glb';

// arm pose name -> right-arm bone rotation (radians); mirrored onto the
// left arm for point-left. Matches the vocabulary stateMap.js already
// produces from STATES.*, so no new state list to maintain.
// Bind pose is a T-pose (arms horizontal, rotation.z ≈ 0). ~1.45 rad of Z
// brings the arm down to a natural side-hang — every other pose is defined
// as an absolute target from that same T-pose baseline, not incrementally,
// so switching states can never accumulate drift.
const DOWN = 1.45;
const ARM_POSE = {
  wave:          { shoulder: [0, 0, 0.25], arm: [0.1, 0.1, 2.75], fore: [1.3, 0, 0.1] },
  'point-right': { shoulder: [0, 0, 0.1],  arm: [0.15, 0.55, 1.05], fore: [0.1, 0, 0.05] },
  'point-left':  { shoulder: [0, 0, 0.1],  arm: [0.15, 0.55, 1.05], fore: [0.1, 0, 0.05] },
  'point-up':    { shoulder: [0, 0, 0.2],  arm: [0, 0, 2.95], fore: [0.05, 0, 0.05] },
  'point-down':  { shoulder: [0, 0, -0.05],arm: [0.2, 0.1, 1.15], fore: [0.55, 0, 0.05] },
  explain:       { shoulder: [0, 0, 0.15], arm: [0.15, -0.35, 1.05], fore: [0.55, 0, 0.35] },
  thumb:         { shoulder: [0, 0, 0.15], arm: [0.15, 0.15, 1.55], fore: [1.75, 0, 0.15] },
  chin:          { shoulder: [0, 0, 0.2],  arm: [0.35, 0.65, 1.45], fore: [2.15, 0, 0.25] },
  none:          { shoulder: [0, 0, 0],    arm: [0, 0, DOWN],  fore: [0.12, 0, 0.05] },
};

export default function KidAvatar({ state = STATES.IDLE, speaking = false, onReady, onError }) {
  const nodeRef = useRef(null);
  const bonesRef = useRef({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = nodeRef.current;
    let disposed = false;
    let renderer, raf, resizeObs, intersectObs;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 2.4));
    const dir = new THREE.DirectionalLight(0xfff1e6, 2.2);
    dir.position.set(1.5, 3, 2.5);
    scene.add(dir);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    node.appendChild(renderer.domElement);

    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        scene.add(gltf.scene);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.x -= center.x;
        gltf.scene.position.z -= center.z;
        gltf.scene.position.y -= box.min.y;
        camera.position.set(0, size.y * 0.55, size.y * 1.55);
        camera.lookAt(0, size.y * 0.55, 0);

        // GLTFLoader strips the colon from "mixamorig:Hips" -> "mixamorigHips".
        const bones = {};
        gltf.scene.traverse((o) => {
          if (o.name && o.name.startsWith('mixamorig')) bones[o.name.slice('mixamorig'.length)] = o;
        });
        bonesRef.current = bones;

        // Bring both arms down from the Mixamo bind T-pose to a natural
        // side-hang immediately, before the first paint — the gesture
        // effect below re-poses from here once `state` is known.
        ['LeftArm', 'RightArm'].forEach((n) => {
          if (bones[n]) bones[n].rotation.z = n === 'LeftArm' ? -DOWN : DOWN;
        });
        ['LeftForeArm', 'RightForeArm'].forEach((n) => { if (bones[n]) bones[n].rotation.x = 0.12; });

        setReady(true);
        onReady?.();
      },
      undefined,
      (err) => { if (!disposed) onError?.(err); },
    );

    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (node.clientWidth && node.clientHeight) {
        renderer.setSize(node.clientWidth, node.clientHeight, false);
        camera.aspect = node.clientWidth / node.clientHeight;
        camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
    };
    tick();
    void clock;

    resizeObs = new ResizeObserver(() => {});
    resizeObs.observe(node);
    intersectObs = new IntersectionObserver(([e]) => { if (!e.isIntersecting) cancelAnimationFrame(raf); else tick(); });
    intersectObs.observe(node);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObs.disconnect();
      intersectObs.disconnect();
      gsap.killTweensOf(Object.values(bonesRef.current).map((b) => b.rotation));
      renderer.dispose();
      node.replaceChildren();
      bonesRef.current = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Continuous idle: breathing (spine), gentle weight-shift sway (hips),
  // subtle head drift — always running, exactly like DoodleCompanion's
  // idle breathing/sway loop.
  useEffect(() => {
    if (!ready) return undefined;
    const { Spine1, Spine2, Hips, Head } = bonesRef.current;
    const tweens = [];
    if (Spine1) tweens.push(gsap.to(Spine1.rotation, { x: 0.035, duration: 2.1, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    if (Spine2) tweens.push(gsap.to(Spine2.rotation, { x: 0.025, duration: 2.1, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.1 }));
    if (Hips) tweens.push(gsap.to(Hips.rotation, { z: 0.02, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    if (Head) tweens.push(gsap.to(Head.rotation, { y: 0.06, duration: 4.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.3 }));
    return () => tweens.forEach((t) => t.kill());
  }, [ready]);

  // Head reacts to listening/thinking/speaking, same intent as
  // CareerCounsellorAvatar's head/brow effect.
  useEffect(() => {
    if (!ready) return;
    const { Head, Neck } = bonesRef.current;
    if (!Head || !Neck) return;
    if (state === STATES.THINKING) {
      gsap.to(Head.rotation, { z: -0.28, x: -0.08, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      return;
    }
    if (state === STATES.LISTENING) {
      gsap.to(Head.rotation, { z: -0.1, x: -0.12, duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
      return;
    }
    gsap.to(Head.rotation, { z: 0, x: 0, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
    if (speaking) {
      const nod = gsap.to(Neck.rotation, { x: 0.09, duration: 0.55, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      return () => nod.kill();
    }
    return undefined;
  }, [state, speaking, ready]);

  // Gesture arms — reuses stateMap.js's {expression, arm} table verbatim,
  // aimed at bone rotations instead of SVG transforms.
  useEffect(() => {
    if (!ready) return undefined;
    const { arm } = resolveState(state);
    const useLeft = arm === 'point-left';
    const side = useLeft ? 'Left' : 'Right';
    const pose = ARM_POSE[arm] ?? ARM_POSE.none;
    const b = bonesRef.current;
    const shoulder = b[`${side}Shoulder`], upper = b[`${side}Arm`], fore = b[`${side}ForeArm`];
    const mirror = useLeft ? -1 : 1;
    const tweens = [];
    if (shoulder) tweens.push(gsap.to(shoulder.rotation, { x: pose.shoulder[0], y: pose.shoulder[1] * mirror, z: pose.shoulder[2] * mirror, duration: 0.55, ease: 'back.out(1.6)' }));
    if (upper) tweens.push(gsap.to(upper.rotation, { x: pose.arm[0], y: pose.arm[1] * mirror, z: pose.arm[2] * mirror, duration: 0.55, ease: 'back.out(1.6)' }));
    if (fore) tweens.push(gsap.to(fore.rotation, { x: pose.fore[0], y: pose.fore[1] * mirror, z: pose.fore[2] * mirror, duration: 0.55, ease: 'back.out(1.6)' }));

    let wave;
    if (arm === 'wave' && upper) {
      wave = gsap.to(upper.rotation, { z: (pose.arm[2] - 0.35) * mirror, duration: 0.22, yoyo: true, repeat: 7, ease: 'sine.inOut', delay: 0.45 });
    }
    // Rest the other arm.
    const restSide = useLeft ? 'Right' : 'Left';
    const restUpper = b[`${restSide}Arm`], restShoulder = b[`${restSide}Shoulder`], restFore = b[`${restSide}ForeArm`];
    const restMirror = useLeft ? 1 : -1;
    if (restShoulder) tweens.push(gsap.to(restShoulder.rotation, { x: 0, y: 0, z: 0, duration: 0.4, ease: 'power2.in' }));
    if (restUpper) tweens.push(gsap.to(restUpper.rotation, { x: 0, y: 0, z: DOWN * restMirror, duration: 0.4, ease: 'power2.in' }));
    if (restFore) tweens.push(gsap.to(restFore.rotation, { x: 0.12, y: 0, z: 0, duration: 0.4, ease: 'power2.in' }));

    return () => { wave?.kill(); tweens.forEach((t) => t.kill()); };
  }, [state, ready]);

  return <div ref={nodeRef} className="aurrum-ai-character__3d" aria-hidden="true" />;
}
