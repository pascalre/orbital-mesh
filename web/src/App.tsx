import * as THREE from "three";
import { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Nebula from "./Nebula";
import Starfield from "./Starfield";
import { Earth } from './components/Earth';
import { Sun } from "./components/Sun";
import ControlPanel from "./components/ControlPanel";
import {InfoPanel } from "./components/InfoPanel";
import { Moon } from "./components/Moon";
import { Atmosphere } from "./components/Atmosphere";
import { SatelliteManager } from "./components/SatelliteManager";
import { SatelliteTooltip } from "./components/SatelliteTooltip";
import { getSunDirection } from "./utils/astronomy";
import { useSolace } from "./hooks/useSolace";

function App() {
  const [activeTopic, setActiveTopic] = useState("earth/sat/tracked/*/*/*/>");
  const [activeHoverData, setActiveHoverData] = useState<{name: string, x: number, y: number} | null>(null);
  const [sunDirection] = useState(() => getSunDirection());
  const { data, isConnected, msgRate } = useSolace(activeTopic);
  const [satelliteCount, setSatelliteCount] = useState(0);

  useEffect(() => {
  if (data) {
    console.log("🟢 App.tsx hat Daten empfangen:", data);
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

        <Earth sunDirection={sunDirection} />
        <Atmosphere sunDirection={sunDirection} />
        <SatelliteManager 
          key={activeTopic}
          filterTopic={activeTopic} 
          solaceData={data} 
          isConnected={isConnected}
          onHoverSatellite={setActiveHoverData} 
          onCountChange={setSatelliteCount}
        />
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
