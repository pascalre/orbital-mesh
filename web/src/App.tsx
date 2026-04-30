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
import { OrbitLine } from "./components/OrbitLine";
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
      const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
      
        // Die Basis-Rotation (Zeitkomponente)
      const dayRotation = ((utcHours - 12) / 24) * 2 * Math.PI;
        // 12:00 UTC ist der Punkt, an dem der Nullmeridian (Greenwich) zur Sonne schaut.
        // Die 1.5 * Math.PI ist der Korrekturwert, um den Nullmeridian der Textur 
        // mit der mathematischen Z-Achse zu decken.
      const BIAS_DEGREES = 105; // <--- ÄNDERE DIESEN WERT (z.B. 10, 20, -30, 90...)
      const CALIBRATION = Math.PI + (BIAS_DEGREES * Math.PI / 180);
    
      worldRef.current.rotation.y = dayRotation + CALIBRATION;
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

<World activeHoverData={activeHoverData}>
        <Earth sunDirection={sunDirection} />
        <Atmosphere sunDirection={sunDirection} />
        {activeHoverData && <OrbitLine data={activeHoverData} />}
        <SatelliteManager 
          key={activeTopic}
          filterTopic={activeTopic} 
          solaceData={data} 
          isConnected={isConnected}
          onHoverSatellite={setActiveHoverData} 
          onCountChange={setSatelliteCount}
        />
        </World>
        {/* Suspense fängt die Ladezeit der 8K Textur ab */}
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
