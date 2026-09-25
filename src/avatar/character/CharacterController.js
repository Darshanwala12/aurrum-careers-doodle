import { AnimationMixer, LoopOnce, LoopRepeat, MathUtils } from 'three';
import { EMOTIONS, VISEMES } from './config.js';

// Approximate grapheme-to-viseme fallback. Real audio adapters can supply
// timestamped phonemes instead; those always take precedence.
export function wordVisemes(word) {
  return [...word.toLowerCase().replace(/[^a-z]/g, '')].map(c =>
    'bmp'.includes(c) ? 'PP' : 'fv'.includes(c) ? 'FF' : 'a'.includes(c) ? 'aa'
      : 'eiy'.includes(c) ? 'E' : c === 'o' ? 'O' : 'uwq'.includes(c) ? 'U' : 'nn');
}
export class CharacterController {
  constructor(root, clips, { random = Math.random } = {}) {
    this.root = root; this.mixer = new AnimationMixer(root); this.random = random;
    this.actions = Object.fromEntries(clips.map(c => [c.name, this.mixer.clipAction(c)]));
    this.meshes = []; root.traverse(o => { if (o.morphTargetDictionary) this.meshes.push(o); });
    this.emotion = 'neutral'; this.time = 0; this.nextBlink = 2; this.blinkAt = -10;
    this.speech = null; this.word = []; this.wordAt = 0; this.eyeTarget = 0; this.nextLook = 1;
    this.onFinished = e => { if (e.action === this.active) this.play('idle'); };
    this.mixer.addEventListener('finished', this.onFinished); this.play('idle');
  }
  setState({ emotion = 'neutral', animation = 'idle' }, { reducedMotion = false, paused = false } = {}) {
    this.emotion = Object.hasOwn(EMOTIONS, emotion) ? emotion : 'neutral';
    this.reducedMotion = reducedMotion; this.paused = paused;
    const requested = paused || reducedMotion ? 'idle' : animation;
    if (requested !== this.requested) { this.requested = requested; this.play(requested); }
  }
  play(name) {
    const next = this.actions[name] ?? this.actions.idle;
    if (!next || next === this.active) return;
    const once = ['greeting', 'success', 'surprised', 'blink'].includes(name);
    next.reset(); next.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    if (name === 'blink') this.blinkAt = this.time;
    next.clampWhenFinished = true; next.enabled = true; next.setEffectiveWeight(1).play();
    if (this.active) { this.active.fadeOut(.3); next.fadeIn(.3); }
    this.active = next; this.animation = name;
  }
  startSpeech({ text = '', visemes, audio } = {}) {
    this.speech = { text, at: this.time, visemes, audio }; this.boundary({ text, charIndex: 0 });
  }
  boundary({ text = this.speech?.text ?? '', charIndex = 0 } = {}) {
    if (!this.speech) return;
    this.word = wordVisemes(text.slice(charIndex).split(/\s/)[0]); this.wordAt = this.time;
    this.speech.boundaryAt = this.time;
  }
  endSpeech() { this.speech = null; this.word = []; }
  update(dt) {
    dt = Math.min(dt, .05); this.time += dt;
    if (!this.paused) this.mixer.update(this.reducedMotion ? 0 : dt);
    let blink = 0;
    if (!this.paused && !this.reducedMotion) {
      if (this.time > this.nextBlink) { this.blinkAt = this.time; this.nextBlink = this.time + 2.5 + this.random() * 3; }
      blink = Math.max(0, 1 - Math.abs(this.time - this.blinkAt - .085) / .085);
    }
    let viseme = 'sil';
    if (this.speech && !this.paused) {
      const { audio, visemes } = this.speech;
      if (audio && visemes) {
        if (!audio.paused && !audio.ended) viseme = visemes.find(v => audio.currentTime >= v.start && audio.currentTime < v.end)?.value ?? 'sil';
      } else {
        const elapsed = this.time - this.wordAt;
        // Stay aligned with actual word-boundary events. Voices without
        // boundary support get estimated text timing, only while audible.
        if (this.time - this.speech.boundaryAt > .8) {
          const chars = wordVisemes(this.speech.text);
          viseme = chars[Math.floor((this.time - this.speech.at) * 12) % Math.max(chars.length, 1)] ?? 'sil';
        } else viseme = this.word[Math.floor(elapsed / .075)] ?? 'sil';
      }
    }
    const targets = { ...EMOTIONS[this.emotion], blink };
    if (VISEMES.includes(viseme) && viseme !== 'sil') targets[`viseme_${viseme}`] = .85;
    for (const mesh of this.meshes) for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
      mesh.morphTargetInfluences[index] = MathUtils.damp(mesh.morphTargetInfluences[index], targets[name] ?? 0, name === 'blink' ? 45 : 22, dt);
    }
    if (!this.paused && !this.reducedMotion) {
      if (this.time > this.nextLook) { this.eyeTarget = (this.random() - .5) * .12; this.nextLook = this.time + 1.5 + this.random() * 2; }
      for (const n of ['LeftEye', 'RightEye']) {
        const eye = this.root.getObjectByName(n);
        if (eye) eye.rotation.y = MathUtils.damp(eye.rotation.y, this.emotion === 'thinking' ? -.12 : this.eyeTarget, 7, dt);
      }
    }
  }
  dispose() { this.endSpeech(); this.mixer.removeEventListener('finished', this.onFinished); this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root); }
}
