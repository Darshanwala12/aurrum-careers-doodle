import { useMemo } from 'react';
import CharacterCanvas from '../character/CharacterCanvas.jsx';
import './tara-demo.css';

const POSES = {
  idle: 'idle', talking: 'talking', greeting: 'wave', waving: 'wave', pointing: 'point',
  explaining: 'explaining', encouraging: 'explaining', celebrating: 'celebrating', success: 'celebrating',
  thinking: 'thinking', surprised: 'celebrating',
};

const CLIPS = {
  idle: 'idle', talking: 'talking', wave: 'greeting', point: 'pointing',
  explaining: 'explaining', celebrating: 'success', thinking: 'thinking',
};

export default function TaraAvatar({ action = 'idle', emotion = 'neutral', speaking = false, reducedMotion = false }) {
  const pose = useMemo(() => POSES[action] ?? 'idle', [action]);
  return (
    <div className={`tara-avatar tara-avatar--${pose} tara-avatar--${emotion} ${speaking ? 'is-speaking' : ''}`} role="img" aria-label={`Tara, ${emotion}, ${pose}`}>
      <div className="tara-avatar__aura" aria-hidden="true" />
      <div className="tara-avatar__model">
        <CharacterCanvas
          character={{ emotion, animation: CLIPS[pose] ?? 'idle' }}
          reducedMotion={reducedMotion}
          ariaLabel={`Tara, ${emotion}, ${pose}, animated 3D career counsellor`}
          loadingLabel="Preparing Tara’s 3D character…"
          errorLabel="Tara’s 3D character could not be loaded"
        />
      </div>
      <div className="tara-avatar__shadow" aria-hidden="true" />
      {speaking && <span className="tara-avatar__voice" aria-hidden="true"><i /><i /><i /></span>}
    </div>
  );
}
