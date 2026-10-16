import { useId, useState } from 'react';
import solaceLogo from '../assets/solace.svg';
import githubLogo from '../assets/github-lockup.svg';
import { IconChevronDown } from './icons';

interface InfoPanelProps {
  /** When true, render content only (no fixed-corner panel chrome / collapse toggle); the host sheet handles layout. */
  mobile?: boolean;
}

const DID_YOU_KNOW = [
  'Every satellite orbit is described by a TLE set: two lines of 69 characters each, pure physics.',
  'Molniya orbits spend about 11 of their 12 hours over the northern hemisphere, ideal for high-latitude communications.',
  'The Kessler syndrome describes a cascade of collisions in which debris makes entire orbits unusable.',
  'Sputnik 1 was the first artificial satellite and marked the beginning of the space age in 1957.',
  'Geostationary satellites orbit at 35,786 km, exactly matching the rotation of the Earth.',
  'The ISS serves as a microgravity research lab at an altitude of about 420 km.',
];

export function InfoPanel({ mobile = false }: InfoPanelProps = {}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const bodyId = useId();
  const [randomFact] = useState(() => DID_YOU_KNOW[Math.floor(Math.random() * DID_YOU_KNOW.length)]);

  const content = (
    <>
      <section aria-labelledby={`${bodyId}-about`}>
        <h2 id={`${bodyId}-about`} className="hud-title">Orbital Mesh</h2>
        <p className="hud-dim" style={{ margin: '6px 0 0' }}>
          A digital twin of Earth&apos;s orbital environment. Every dot is a real satellite, moved by
          a live stream of events instead of page refreshes.
        </p>
      </section>

      <section aria-labelledby={`${bodyId}-flow`} style={{ marginTop: 22 }}>
        <h3 id={`${bodyId}-flow`} className="hud-eyebrow" style={{ marginBottom: 14 }}>How it works</h3>
        <ol className="hud-steps">
          <li>
            <strong>Data source</strong>
            <p>
              <b>TLE sets</b> from CelesTrak are turned into geodetic coordinates by <b>SGP4</b>.
            </p>
          </li>
          <li>
            <strong>Event broker</strong>
            <p>
              A Go client publishes each position to <b>Solace</b> on hierarchical topics.
            </p>
          </li>
          <li>
            <strong>3D visualization</strong>
            <p>
              <b>React and Three.js</b> subscribe over <b>WebSockets</b> and render the stream in WebGL.
            </p>
          </li>
        </ol>
      </section>

      <section aria-labelledby={`${bodyId}-fact`} style={{ marginTop: 22 }}>
        <h3 id={`${bodyId}-fact`} className="hud-eyebrow" style={{ marginBottom: 10 }}>Did you know?</h3>
        <p className="hud-quote">{randomFact}</p>
      </section>

      <footer className="hud-footer" style={{ marginTop: 22 }}>
        <span>
          Textures:{' '}
          <a className="hud-link" href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">
            Solar System Scope
          </a>
          <br />
          Data:{' '}
          <a className="hud-link" href="https://celestrak.org" target="_blank" rel="noopener noreferrer">
            CelesTrak
          </a>
        </span>
        <span>
          Built by{' '}
          <a className="hud-link" href="https://www.linkedin.com/in/pascal-reitermann/" target="_blank" rel="noopener noreferrer">
            Pascal
          </a>{' '}
          <a
            href="https://github.com/pascalre/orbital-mesh"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Orbital Mesh on GitHub"
            style={{ marginLeft: 6 }}
          >
            <img src={githubLogo} alt="" />
          </a>
        </span>
      </footer>
    </>
  );

  if (mobile) {
    return (
      <div className="hud-flat">
        <img src={solaceLogo} width={110} alt="Solace" style={{ display: 'block', marginBottom: 18 }} />
        {content}
      </div>
    );
  }

  return (
    <aside
      className="hud-panel hud-panel--left"
      aria-label="About Orbital Mesh"
      style={isExpanded ? undefined : { width: 'auto' }}
    >
      <div className="hud-info-head">
        <img src={solaceLogo} width={isExpanded ? 118 : 84} alt="Solace" style={{ transition: 'width 0.3s' }} />
        <button
          type="button"
          className="hud-btn"
          aria-expanded={isExpanded}
          aria-controls={bodyId}
          onClick={() => setIsExpanded((v) => !v)}
        >
          {isExpanded ? 'Hide' : 'Info'}
          <IconChevronDown style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>
      <div id={bodyId} className="hud-panel__scroll" hidden={!isExpanded} style={{ paddingTop: 4 }}>
        {content}
      </div>
    </aside>
  );
}
