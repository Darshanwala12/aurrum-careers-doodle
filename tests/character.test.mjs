import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ANIMATIONS, MORPHS, characterState, normalizeResponse } from '../src/avatar/character/config.js';
import { CharacterController } from '../src/avatar/character/CharacterController.js';
import { createBrowserVoice, getActiveSpeech } from '../src/ai/voiceAdapter.js';
const bytes = await fs.readFile(new URL('../public/avatars/elena-original.glb', import.meta.url));
const load = () => new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
test('GLB has a complete skin, finger chains, expressions and all requested clips', async () => {
  const gltf = await load(); const meshes = [];
  gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 13);
  assert.ok(meshes.every(m => m.isSkinnedMesh));
  assert.equal(meshes[0].skeleton.bones.length, 53);
  for (const side of ['Left', 'Right']) for (const finger of ['Thumb', 'Index', 'Middle', 'Ring', 'Little']) for (let i = 1; i <= 3; i++) assert.ok(gltf.scene.getObjectByName(`${side}${finger}${i}`));
  assert.deepEqual(gltf.animations.map(a => a.name).sort(), [...ANIMATIONS].sort());
  for (const name of MORPHS) assert.ok(meshes.some(m => name in (m.morphTargetDictionary ?? {})), name);
  for (const m of meshes) {
    const weights = m.geometry.attributes.skinWeight;
    for (let i = 0; i < weights.count; i++) assert.ok(Math.abs(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i) - 1) < .001);
    for (const morph of m.geometry.morphAttributes.position ?? []) {
      assert.equal(morph.count, m.geometry.attributes.position.count);
      for (const delta of morph.array) assert.ok(Math.abs(delta) < .2, 'facial delta must not collapse the bind-space model');
    }
  }
  assert.ok(bytes.length < 4 * 1024 * 1024);
});
test('untrusted response states are normalized; thinking overrides old responses', () => {
  assert.deepEqual(normalizeResponse({ message: 'Hello', emotion: '__proto__', animation: 'unknown' }), { message: 'Hello', answer: 'Hello', emotion: 'neutral', animation: 'explaining' });
  assert.equal(characterState({ status: 'thinking', response: { emotion: 'happy' } }).animation, 'thinking');
  assert.equal(characterState({ status: 'idle', response: { animation: 'success' }, speaking: false }).animation, 'idle');
  assert.equal(characterState({ speaking: true, response: { message: 'Hi', emotion: 'encouraging', animation: 'explaining' } }).emotion, 'encouraging');
});
test('one-shot gestures return to idle without replaying on every render', async () => {
  const gltf = await load(), c = new CharacterController(gltf.scene, gltf.animations);
  const state = { emotion: 'happy', animation: 'greeting' };
  for (let i = 0; i < 100; i++) { c.setState(state); c.update(.05); }
  assert.equal(c.animation, 'idle');
  c.setState({ emotion: 'thinking', animation: 'thinking' }); c.update(.05);
  assert.equal(c.animation, 'thinking'); c.dispose();
});
test('audio clock controls mouth; pause, end and interruption close it', async () => {
  const gltf = await load(), c = new CharacterController(gltf.scene, gltf.animations);
  const mouth = gltf.scene.getObjectByName('Elena_lips');
  const audio = { currentTime: .3, paused: false, ended: false };
  c.startSpeech({ text: 'Hello', audio, visemes: [{ start: .1, end: .6, value: 'aa' }] });
  for (let i = 0; i < 8; i++) c.update(.05);
  assert.ok(mouth.morphTargetInfluences[mouth.morphTargetDictionary.viseme_aa] > .8);
  audio.paused = true; for (let i = 0; i < 8; i++) c.update(.05);
  assert.ok(mouth.morphTargetInfluences[mouth.morphTargetDictionary.viseme_aa] < .01);
  audio.paused = false; audio.currentTime = .8; c.update(.05);
  c.endSpeech(); for (let i = 0; i < 8; i++) c.update(.05);
  assert.equal(c.speech, null); c.dispose();
});
test('reduced motion freezes skeleton but preserves speech morphs', async () => {
  const gltf = await load(), c = new CharacterController(gltf.scene, gltf.animations);
  c.setState({ emotion: 'encouraging', animation: 'success' }, { reducedMotion: true });
  const head = gltf.scene.getObjectByName('Head').quaternion.clone();
  c.startSpeech({ text: 'aaa' }); c.update(.05);
  assert.equal(c.animation, 'idle'); assert.ok(head.equals(gltf.scene.getObjectByName('Head').quaternion)); c.dispose();
});
test('stale speech callbacks and narration cleanup cannot cancel a newer answer', () => {
  let current, cancellations = 0, completed = 0;
  globalThis.window = { speechSynthesis: { cancel() { cancellations++; }, getVoices: () => [], speak(u) { current = u; } } };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  const narration = createBrowserVoice(), answer = createBrowserVoice();
  narration.speak('Old narration', { onEnd: () => completed++ });
  const old = current; old.onstart();
  answer.speak('New answer', { onEnd: () => completed++ }); current.onstart();
  const count = cancellations; narration.stop(); old.onend();
  assert.equal(cancellations, count); assert.equal(completed, 0);
  assert.equal(getActiveSpeech().text, 'New answer');
  current.onend(); assert.equal(completed, 1); assert.equal(getActiveSpeech(), null);
  delete globalThis.window; delete globalThis.SpeechSynthesisUtterance;
});
