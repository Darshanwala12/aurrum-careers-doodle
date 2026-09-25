import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STATES } from '../../data/states.js';

/**
 * Michelle (mrdoob/three.js official examples, MIT) as the live 3D avatar.
 *
 * Honest limitation, stated up front: this model has no facial morph
 * targets and only two animation clips ("TPose", "SambaDance") — there is
 * no real lip-sync or expression system possible here, unlike the 2D
 * CareerCounsellorAvatar it replaces (which has viseme-driven mouth shapes,
 * blinking, and per-state brows/gestures). What this component CAN honestly
 * do: crossfade into "SambaDance" while she's speaking (movement reads as
 * "animated/engaged") and settle back to a still idle pose otherwise, driven
 * by the same STATES vocabulary the chatbot already emits.
 */
const MODEL_URL = '/avatars/michelle.glb';
const ACTIVE_STATES = new Set([
  STATES.SPEAKING, STATES.EXPLAINING, STATES.EXCITED, STATES.HAPPY,
  STATES.CELEBRATING, STATES.SUCCESS, STATES.ENCOURAGING, STATES.GREETING, STATES.WAVING,
]);

export default function MichelleAvatar({ state = STATES.IDLE, speaking = false, onReady, onError }) {
  const nodeRef = useRef(null);
  const mixerRef = useRef(null);
  const actionsRef = useRef({});
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
        gltf.animations.forEach((clip) => { actionsRef.current[clip.name] = mixer.clipAction(clip); });
        const idle = actionsRef.current.TPose;
        idle?.play();
        idle?.setEffectiveTimeScale(0); // hold as a still pose — there's no real idle clip to loop

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
      actionsRef.current = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Crossfade to the dance clip while "active" (speaking/explaining/happy/…),
  // back to the still TPose hold otherwise — the only honest mapping two
  // clips and no morph targets allow.
  useEffect(() => {
    if (!ready) return;
    const dance = actionsRef.current.SambaDance;
    const idle = actionsRef.current.TPose;
    if (!dance || !idle) return;
    const active = speaking || ACTIVE_STATES.has(state);
    if (active) {
      idle.setEffectiveTimeScale(0);
      dance.reset().setEffectiveTimeScale(1).fadeIn(0.4).play();
    } else {
      dance.fadeOut(0.4);
      idle.setEffectiveTimeScale(0).play();
    }
  }, [state, speaking, ready]);

  return <div ref={nodeRef} className="aurrum-ai-character__3d" aria-hidden="true" />;
}
