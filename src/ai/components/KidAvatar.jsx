import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STATES } from '../../data/states.js';

/**
 * Candidate 1 (user-provided glb.glb) as the live 3D avatar.
 *
 * Honest limitation, stated up front: this is a child character (mesh
 * named "kid_mesh"), not an adult professional woman — a deliberate
 * choice made by the user despite that mismatch being flagged. It also
 * has only one animation clip and no facial morph targets, so — same as
 * MichelleAvatar — there's no real lip-sync or per-state expression here,
 * just a timescale crossfade between "held still" and "playing" driven by
 * the same STATES vocabulary the chatbot already emits.
 */
const MODEL_URL = '/avatars/kid.glb';
const ACTIVE_STATES = new Set([
  STATES.SPEAKING, STATES.EXPLAINING, STATES.EXCITED, STATES.HAPPY,
  STATES.CELEBRATING, STATES.SUCCESS, STATES.ENCOURAGING, STATES.GREETING, STATES.WAVING,
]);

export default function KidAvatar({ state = STATES.IDLE, speaking = false, onReady, onError }) {
  const nodeRef = useRef(null);
  const mixerRef = useRef(null);
  const actionRef = useRef(null);
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

    const clock = new THREE.Clock();
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

        const mixer = new THREE.AnimationMixer(gltf.scene);
        mixerRef.current = mixer;
        const clip = gltf.animations[0];
        if (clip) {
          const action = mixer.clipAction(clip);
          action.play();
          action.setEffectiveTimeScale(0); // hold as a still pose until "active"
          actionRef.current = action;
        }

        setReady(true);
        onReady?.();
      },
      undefined,
      (err) => { if (!disposed) onError?.(err); },
    );

    const tick = () => {
      raf = requestAnimationFrame(tick);
      mixerRef.current?.update(clock.getDelta());
      if (node.clientWidth && node.clientHeight) {
        renderer.setSize(node.clientWidth, node.clientHeight, false);
        camera.aspect = node.clientWidth / node.clientHeight;
        camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
    };
    tick();

    resizeObs = new ResizeObserver(() => {});
    resizeObs.observe(node);
    intersectObs = new IntersectionObserver(([e]) => { if (!e.isIntersecting) cancelAnimationFrame(raf); else tick(); });
    intersectObs.observe(node);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObs.disconnect();
      intersectObs.disconnect();
      renderer.dispose();
      node.replaceChildren();
      mixerRef.current = null;
      actionRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || !actionRef.current) return;
    const active = speaking || ACTIVE_STATES.has(state);
    actionRef.current.setEffectiveTimeScale(active ? 1 : 0);
  }, [state, speaking, ready]);

  return <div ref={nodeRef} className="aurrum-ai-character__3d" aria-hidden="true" />;
}
