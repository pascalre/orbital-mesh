import * as THREE from "three";
import { Suspense, useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Starfield } from "./components/Starfield";
import { Earth } from './components/Earth';
import { Sun } from "./components/Sun";
import ControlPanel from "./components/ControlPanel";
import { InfoPanel } from "./components/InfoPanel";
import { Moon } from "./components/Moon";
import { Atmosphere } from "./components/Atmosphere";
import { SatelliteManager } from "./components/SatelliteManager";
import { SatelliteTooltip } from "./components/SatelliteTooltip";
import { MobileMenu } from "./components/MobileMenu";
import { RegionGrid } from "./components/RegionGrid";
import { getSunDirection } from "./utils/astronomy";
import { useSolace } from "./hooks/useSolace";
import { useIsMobile } from "./hooks/useIsMobile";

function World({ children }: { children: React.ReactNode }) {
  const worldRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (worldRef.current) {
      const now = new Date();
      const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

      const dayRotation = ((utcHours - 12) / 24) * 2 * Math.PI;
      const BIAS_DEGREES = 90;
      const CALIBRATION = Math.PI + (BIAS_DEGREES * Math.PI / 180);

      worldRef.current.rotation.y = dayRotation + CALIBRATION;
    }
  });

  return <group ref={worldRef}>{children}</group>;
}

function App() {
  const [activeTopics, setActiveTopics] = useState<string[]>(["earth/sat/tracked/*/*/*/*/*"]);
  const [regionKey, setRegionKey] = useState("all");
  const [activeHoverData, setActiveHoverData] = useState<any | null>(null);
  const [sunDirection] = useState(() => getSunDirection());
  const { data, isConnected, msgRate } = useSolace(activeTopics);
  const [satelliteCount, setSatelliteCount] = useState(0);
  const isMobile = useIsMobile();

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

  const controlPanel = (
    <ControlPanel
      satelliteCount={satelliteCount}
      onFilterChange={setActiveTopics}
      onRegionChange={setRegionKey}
      msgRate={msgRate}
      isConnected={isConnected}
      solaceData={data}
      mobile={isMobile}
    />
  );
  const infoPanel = <InfoPanel mobile={isMobile} />;

  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      {!isMobile && (
        <>
          {controlPanel}
          {infoPanel}
        </>
      )}
      <Canvas
        camera={{ position: [0, 0.1, 5] }}
        gl={{
          toneMapping: THREE.NoToneMapping
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block'
        }}>

        <World>
          <Earth sunDirection={sunDirection} />
          <Atmosphere sunDirection={sunDirection} />
          { /* activeHoverData && <OrbitLine data={activeHoverData} /> */}
          <RegionGrid regionKey={regionKey} />
          <SatelliteManager
            key={activeTopics.join('|')}
            filterTopics={activeTopics}
            solaceData={data}
            isConnected={isConnected}
            onHoverSatellite={setActiveHoverData}
            onCountChange={setSatelliteCount}
            isMobile={isMobile}
          />
        </World>
        <Suspense fallback={null}>
          <Moon sunDirection={sunDirection} />
        </Suspense>
        <Sun direction={sunDirection} />
        <hemisphereLight args={[0xffffff, 0x000000, 3.0]} />
        <directionalLight
          position={[sunDirection.x * 10, sunDirection.y * 10, sunDirection.z * 10]}
          intensity={2}
        />
        <Starfield />
        <OrbitControls
          enableDamping={true}
          dampingFactor={0.05}
          autoRotate={!activeHoverData}
          autoRotateSpeed={0.08}
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
          mobile={isMobile}
          onClose={() => setActiveHoverData(null)}
        />
      )}

      {isMobile && <MobileMenu info={infoPanel} controls={controlPanel} />}
    </div>
  );
}

export default App;
