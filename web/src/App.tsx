import * as THREE from "three";
import { Suspense, useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Nebula from "./Nebula";
import Starfield from "./Starfield";
import { Earth } from './components/Earth';
import { Sun } from "./components/Sun";
import ControlPanel from "./components/ControlPanel";
import { InfoPanel } from "./components/InfoPanel";
import { Moon } from "./components/Moon";
import { Atmosphere } from "./components/Atmosphere";
import { SatelliteManager } from "./components/SatelliteManager";
import { SatelliteTooltip } from "./components/SatelliteTooltip";
import { getSunDirection } from "./utils/astronomy";
import { useSolace } from "./hooks/useSolace";

function World({ children }: { children: React.ReactNode }) {
  const worldRef = useRef<THREE.Group>(null);

useFrame(() => {
  if (worldRef.current) {
    const now = new Date();
    
    // 1. Genaue UTC-Zeit in Stunden (0-24)
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

    // 2. Die Rotation der Erde
    // 15 Grad pro Stunde = (Math.PI / 12) Radiant pro Stunde.
    // Wir nehmen -1, da die Erde von oben gesehen im Uhrzeigersinn rotiert (West -> Ost).
    const rotationSpeed = -(utcHours * (Math.PI / 12));

    // 3. Kalibrierung (Dein Bias)
    // Dieser Wert sollte nun über Tage hinweg stabil bleiben.
    // Der Bias korrigiert, wo der Nullmeridian auf deiner Textur liegt.
    const TEXTURE_BIAS = (0 * Math.PI) / 180; 
    
    worldRef.current.rotation.y = rotationSpeed + TEXTURE_BIAS;
  }
});

  return <group ref={worldRef}>{children}</group>;
}

function App() {
  const [activeTopic, setActiveTopic] = useState("earth/sat/tracked/*/*/*/>");
  const [activeHoverData, setActiveHoverData] = useState<any | null>(null);
  const [sunDirection] = useState(() => getSunDirection());
  const { data, isConnected, msgRate } = useSolace(activeTopic);
  const [satelliteCount, setSatelliteCount] = useState(0);

  useEffect(() => {
    if (!data || !activeHoverData) return;

    try {
      let rawString = typeof data.getBinaryAttachment === 'function' 
        ? data.getBinaryAttachment() 
        : data;
      
      const jsonStart = rawString.indexOf('{');
      const jsonEnd = rawString.lastIndexOf('}');
      if (jsonStart === -1) return;
      const payload = JSON.parse(rawString.substring(jsonStart, jsonEnd + 1));

      const satId = payload.id || payload.name || payload.noradId;

      if (satId === activeHoverData.id) {
        setActiveHoverData((prev: any) => ({
          ...prev,
          ...payload,
          x: prev.x,
          y: prev.y
        }));
      }
    } catch (e) {
      console.error("Tooltip Live-Update Error:", e);
    }
  }, [data]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* UI Overlay */}

      <ControlPanel 
        satelliteCount={satelliteCount}
        onFilterChange={setActiveTopic} 
        msgRate={msgRate} 
        isConnected={isConnected} 
        solaceData={data}
      />
      <InfoPanel />
      <Canvas 
        camera={{ position: [0, 0.1, 5]}}
        gl={{ toneMapping: THREE.NoToneMapping 
      }}
      style={{ 
        position: 'absolute', // Canvas darf nicht im normalen Flow liegen
        top: 0, 
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block' // Verhindert kleine Abstände unter dem Canvas
      }}>

        <World>
          <Earth sunDirection={sunDirection} />
          <Atmosphere sunDirection={sunDirection} />
          { /* activeHoverData && <OrbitLine data={activeHoverData} /> */}
          <SatelliteManager 
            key={activeTopic}
            filterTopic={activeTopic} 
            solaceData={data} 
            isConnected={isConnected}
            onHoverSatellite={setActiveHoverData} 
            onCountChange={setSatelliteCount}
          />
        </World>
        <Suspense fallback={null}>
          <Moon sunDirection={sunDirection}/>
        </Suspense>
        <Sun direction={sunDirection} />
        <hemisphereLight args={[0xffffff, 0x000000, 3.0]} />
        <directionalLight 
        position={[sunDirection.x * 10, sunDirection.y * 10, sunDirection.z * 10]} 
        intensity={2} 
        />
        <Nebula />
        <Starfield />
        <OrbitControls 
          enableDamping={true}      // Macht die Bewegung geschmeidiger
          dampingFactor={0.05}
          autoRotate={!activeHoverData}         // Aktiviert die automatische Drehung
          autoRotateSpeed={0.08}     // Geschwindigkeit (niedriger = langsamer)
          minDistance={2.6}
          maxDistance={25}
        />
      </Canvas>

      {activeHoverData && (
      <SatelliteTooltip 
        data={activeHoverData} 
        visible={!!activeHoverData} 
        x={activeHoverData?.x} 
        y={activeHoverData?.y} 
      />
      )}
    </div>
  );
}

export default App;
