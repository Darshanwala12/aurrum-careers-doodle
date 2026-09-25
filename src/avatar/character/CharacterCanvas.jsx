import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CharacterController } from './CharacterController.js';
import { MODEL_URL } from './config.js';
import { getActiveSpeech, speechEvents } from '../../ai/voiceAdapter.js';
import './character.css';

function disposeModel(root) {
  root?.traverse(o => {
    o.geometry?.dispose();
    if (o.material) for (const m of [o.material].flat()) m.dispose();
    if (o.isSkinnedMesh) o.skeleton.dispose();
  });
}
export default function CharacterCanvas({ character = {}, halfBody = false, reducedMotion = false, paused = false, view = 0, modelUrl = MODEL_URL, onReady, onError }) {
  const host = useRef(null), controller = useRef(null), latest = useRef({});
  useEffect(() => { latest.current = { character, halfBody, reducedMotion, paused, view, onReady, onError }; });
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    const node = host.current;
    let dead = false, renderer, model, raf = 0, observer, intersection, visible = true, last = 0;
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(32, 1, .05, 30);
    const cleanupModel = () => { controller.current?.dispose(); controller.current = null; disposeModel(model); };
    const fail = e => { if (!dead) { setStatus('error'); latest.current.onError?.(e); } };
    const contextLost = e => { e.preventDefault(); cancelAnimationFrame(raf); fail(new Error('WebGL context lost')); };
    const fit = () => {
      if (!renderer || !node.clientWidth || !node.clientHeight) return;
      renderer.setSize(node.clientWidth, node.clientHeight, false);
      camera.aspect = node.clientWidth / node.clientHeight;
      const half = latest.current.halfBody, height = half ? 1.45 : 2.95;
      const distance = Math.max(height / 2, (half ? .48 : .85) / camera.aspect) / Math.tan(T.MathUtils.degToRad(16));
      camera.position.set(0, half ? 2.02 : 1.34, distance);
      camera.lookAt(0, half ? 2.02 : 1.34, 0); camera.updateProjectionMatrix();
    };
    let frames = 0, reportAt = 0, lastHalf;
    const tick = now => {
      raf = 0;
      if (dead || !visible || document.hidden) return;
      const dt = last ? (now - last) / 1000 : 0; last = now;
      const p = latest.current;
      if (p.halfBody !== lastHalf) { lastHalf = p.halfBody; fit(); }
      if (controller.current) {
        controller.current.setState(p.character, p); controller.current.update(dt);
        model.rotation.y = p.view;
      }
      renderer.render(scene, camera);
      if (import.meta.env.DEV && ++frames >= 60) {
        node.dataset.fps = String(Math.round(60000 / (now - reportAt))); reportAt = now; frames = 0;
        node.dataset.drawCalls = String(renderer.info.render.calls); node.dataset.triangles = String(renderer.info.render.triangles);
        node.dataset.animation = controller.current?.animation ?? 'loading';
      }
      raf = requestAnimationFrame(tick);
    };
    const resume = () => { cancelAnimationFrame(raf); raf = 0; last = 0; if (visible && !document.hidden && !dead) raf = requestAnimationFrame(tick); };
    const start = e => controller.current?.startSpeech(e.detail);
    const boundary = e => controller.current?.boundary(e.detail);
    const end = () => controller.current?.endSpeech();
    try {
      renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
      renderer.domElement.addEventListener('webglcontextlost', contextLost);
      node.appendChild(renderer.domElement);
      scene.add(new T.HemisphereLight(0xf1f9ff, 0x686070, 2.4));
      const key = new T.DirectionalLight(0xfff3df, 3); key.position.set(-3, 5, 5); scene.add(key);
      const rim = new T.DirectionalLight(0x83eee2, 1.8); rim.position.set(3, 3, -2); scene.add(rim);
      observer = new ResizeObserver(fit); observer.observe(node); fit();
      intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); }); intersection.observe(node);
      document.addEventListener('visibilitychange', resume);
      for (const [event, handler] of [['start', start], ['boundary', boundary], ['end', end]]) speechEvents.addEventListener(event, handler);
      new GLTFLoader().load(modelUrl, gltf => {
        if (dead) { disposeModel(gltf.scene); return; }
        model = gltf.scene; scene.add(model); controller.current = new CharacterController(model, gltf.animations);
        controller.current.setState(latest.current.character, latest.current);
        if (getActiveSpeech()) controller.current.startSpeech(getActiveSpeech());
        setStatus('ready'); latest.current.onReady?.(); resume();
      }, undefined, fail);
    } catch (e) { fail(e); }
    return () => {
      dead = true; cancelAnimationFrame(raf); observer?.disconnect(); intersection?.disconnect();
      document.removeEventListener('visibilitychange', resume);
      for (const [event, handler] of [['start', start], ['boundary', boundary], ['end', end]]) speechEvents.removeEventListener(event, handler);
      cleanupModel(); renderer?.domElement.removeEventListener('webglcontextlost', contextLost); renderer?.dispose(); node.replaceChildren();
    };
  }, [modelUrl]);
  return <div className={`character-canvas character-canvas--${status}`} role="img" aria-label="Elena, your animated 3D career counsellor" data-character-status={status}>
    <div className="character-canvas__surface" ref={host} />
    {status !== 'ready' && <span className="character-canvas__fallback" role="status">{status === 'error' ? 'Elena is available in chat' : 'Preparing Elena…'}</span>}
  </div>;
}
