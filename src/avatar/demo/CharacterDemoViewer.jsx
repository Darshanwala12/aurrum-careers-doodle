import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Plain three.js viewer (no React Three Fiber — the project already ships
 * `three` for RealisticAvatar.jsx, so this reuses it instead of adding a new
 * dependency). Loads one GLB, lists its animation clips, and lets you play
 * each one — enough to evaluate a candidate model's rig/animation quality
 * before deciding whether it's worth wiring into the real chatbot.
 */
export default function CharacterDemoViewer({ url, label }) {
  const mountRef = useRef(null);
  const [clips, setClips] = useState([]);
  const [activeClip, setActiveClip] = useState(null);
  const [status, setStatus] = useState('loading');
  const [meta, setMeta] = useState(null);
  const mixerRef = useRef(null);
  const actionsRef = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let disposed = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe4dfd3);
    const camera = new THREE.PerspectiveCamera(35, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 1.4, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.8);
    dir.position.set(2, 4, 3);
    scene.add(dir);
    const grid = new THREE.GridHelper(4, 8, 0xbbbbbb, 0xdddddd);
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;

    const clock = new THREE.Clock();
    let mixer;
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (disposed) return;
        scene.add(gltf.scene);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.x -= center.x;
        gltf.scene.position.z -= center.z;
        gltf.scene.position.y -= box.min.y;
        controls.target.set(0, size.y * 0.5, 0);
        camera.position.set(0, size.y * 0.6, size.y * 1.8);

        mixer = new THREE.AnimationMixer(gltf.scene);
        mixerRef.current = mixer;
        const names = gltf.animations.map((c) => c.name);
        actionsRef.current = Object.fromEntries(
          gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
        );
        setClips(names);
        if (names.length) {
          actionsRef.current[names[0]].play();
          setActiveClip(names[0]);
        }
        let materials = 0, verts = 0;
        gltf.scene.traverse((o) => { if (o.isMesh) { materials += 1; verts += o.geometry?.attributes?.position?.count ?? 0; } });
        setMeta({ meshes: materials, verts, animCount: names.length });
        setStatus('ready');
      },
      undefined,
      (err) => { if (!disposed) { console.error(`[CharacterDemo:${label}]`, err); setStatus('error'); } },
    );

    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      mixerRef.current?.update(clock.getDelta());
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [url, label]);

  const playClip = (name) => {
    Object.values(actionsRef.current).forEach((a) => a.stop());
    actionsRef.current[name]?.reset().play();
    setActiveClip(name);
  };

  return (
    <div style={{ border: '1px solid #d8d2c4', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '0.6rem 0.9rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{label}</strong>
        <span style={{ fontSize: 12, color: status === 'error' ? '#bd2b28' : '#5f5d5b' }}>
          {status === 'loading' ? 'Loading…' : status === 'error' ? 'Failed to load' : `${meta?.meshes ?? 0} mesh · ${meta?.animCount ?? 0} clip${meta?.animCount === 1 ? '' : 's'}`}
        </span>
      </div>
      <div ref={mountRef} style={{ width: '100%', height: 320 }} />
      {clips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0.6rem 0.9rem' }}>
          {clips.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => playClip(name)}
              style={{
                padding: '0.3rem 0.7rem', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                border: activeClip === name ? '1px solid #bd2b28' : '1px solid #ccc',
                background: activeClip === name ? 'rgba(189,43,40,0.08)' : '#fff',
                color: activeClip === name ? '#bd2b28' : '#333',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
