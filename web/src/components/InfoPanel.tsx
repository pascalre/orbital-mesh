import * as React from 'react';
import solaceLogo from '../assets/solace.svg';
import githubLogo from '../assets/github-lockup.svg';

export function InfoPanel() {
    const didYouKnowFacts = [
      "Satellites omit their orbital elements using a TLE set. Each line is 69 characters of pure physics.",
      "Molniya Orbits spend 11h of their 12h period over the northern hemisphere for stable communications.",
      "The Kessler Syndrome describes a cascade effect of debris making orbits unusable.",
      "Sputnik 1 was the first artificial satellite, marking the beginning of the space age in 1957.",
      "Geostationary satellites orbit at 35,786 km to match the Earth's rotation.",
      "The ISS serves as a microgravity research lab at an altitude of ~420 km."
    ];
      const [randomFact] = React.useState(() => didYouKnowFacts[Math.floor(Math.random() * didYouKnowFacts.length)]);

  // Exakte Stil-Kopien aus deinem ControlPanel
  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    paddingBottom: '4px',
    marginBottom: '10px',
    marginTop: '18px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#ccc'
  };

  return (
    <div style={{
      position: 'absolute',
      top: '25px',
      left: '25px',
      zIndex: 10,
      color: 'white',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: '20px 25px',
      borderRadius: '14px',
      width: '430px',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      fontFamily: 'sans-serif',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      maxHeight: 'calc(100vh - 100px)',
      overflowY: 'auto',
    }}>
      
      <img src={solaceLogo} width="125px" alt="Solace Logo" style={{ marginBottom: '12px' }} />
      
      <h2 style={{ ...sectionHeaderStyle, marginTop: 0 }}>ORBITAL MESH</h2>
      <p style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: '1.5', marginBottom: '12px' }}>
        This interactive Digital Twin tracks live orbital positions. It orchestrates telemetry data via Solace, 
        transforming raw event streams into an immersive 3D experience.
      </p>


{/* SEKTION 2: ARCHITECTURE */}
      <h2 style={sectionHeaderStyle}>SYSTEM ARCHITECTURE</h2>
      <div style={{ 
        fontSize: '0.85rem',
        lineHeight: '1.4',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Step 1 & 2: The Core Processing */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#00c897', fontWeight: 'bold', fontSize: '0.75rem' }}>DATA SOURCE</span>
            </div>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>
              Raw <strong>TLE sets</strong> are fetched from CelesTrak and mapped via <strong>SGP4 algorithms</strong> into high-precision geodetic coordinates.
            </p>
          </div>

          {/* Step 3: The Event Mesh */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#00c897', fontWeight: 'bold', fontSize: '0.75rem' }}>EVENT BROKER</span>
            </div>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>
              Coordinates are sent to <strong>Solace</strong> via SMF using a high-performant Go client with hierarchical topics, enabling instant distribution with low latency.
            </p>
          </div>

          {/* Step 4: Frontend Rendering */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#00c897', fontWeight: 'bold', fontSize: '0.75rem' }}>3D VISUALIZATION</span>
            </div>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>
              React & <strong>Three.js</strong> consume the stream via WebSockets to render thousands of dynamic entities within a WebGL environment.
            </p>
          </div>

        </div>

      </div>



      <h2 style={sectionHeaderStyle}>DID YOU KNOW?</h2>
      <p style={{ fontSize: '0.8rem', opacity: 0.8, fontStyle: 'italic', borderLeft: '3px solid #00c897', paddingLeft: '12px', lineHeight: '1.4' }}>
        {randomFact}
      </p>


      <div style={{ 
        marginTop: '25px', 
        paddingTop: '12px', 
        borderTop: '1px solid rgba(255,255,255,0.1)', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '0.7rem', opacity: 0.6, lineHeight: '1.5' }}>
          Textures: <a href="https://www.solarsystemscope.com/textures/" target="_blank" style={{color: '#00c897', textDecoration: 'none'}}>Solar System Scope</a><br />
          Data: <a href="https://celestrak.org" target="_blank" style={{color: '#00c897', textDecoration: 'none'}}>CelesTrak</a>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            Built by <a href="https://www.linkedin.com/in/pascal-reitermann/" target="_blank" style={{color: '#00c897', textDecoration: 'none'}}>Pascal</a>
          </span>
          <a href="https://github.com/pascalre/orbital-mesh" target="_blank">
            <img src={githubLogo} height="14" alt="GitHub" style={{ marginLeft: '10px', verticalAlign: 'middle', opacity: 0.8 }}/>
          </a>
        </div>
      </div>


    </div>
  );
}