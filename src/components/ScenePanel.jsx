import DoodleMotif from './DoodleMotif.jsx';

export default function ScenePanel({ id, eyebrow, motif, children }) {
  return (
    <section className="scene-panel" data-scene-id={id} id={id}>
      {motif && (
        <div className="scene-panel__motif" data-reveal aria-hidden="true">
          <DoodleMotif name={motif} size={84} />
        </div>
      )}
      <div className="scene-panel__inner">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {children}
      </div>
    </section>
  );
}
