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
import { SatelliteTooltip, type SatelliteData } from "./components/SatelliteTooltip";
import { MobileMenu } from "./components/MobileMenu";
import { RegionGrid } from "./components/RegionGrid";
import { StatusBar } from "./components/StatusBar";
import { Hint } from "./components/Hint";
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

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function App() {
  const [activeTopics, setActiveTopics] = useState<string[]>(["earth/sat/tracked/*/*/*/*/*"]);
  const [regionKey, setRegionKey] = useState("all");
  // Hover shows a card that follows the cursor; a click pins it (interactive, closable).
  const [hoverData, setHoverData] = useState<SatelliteData | null>(null);
  const [pinnedData, setPinnedData] = useState<SatelliteData | null>(null);
  const [autoRotate, setAutoRotate] = useState(() => !prefersReducedMotion());
  const [sunDirection] = useState(() => getSunDirection());
  const { data, status, error, retry, msgRate, isConnected } = useSolace(activeTopics);
  const [satelliteCount, setSatelliteCount] = useState(0);
  const isMobile = useIsMobile();

  const cardData = pinnedData ?? hoverData;
  const hasPinned = pinnedData !== null;

  // Only parse live messages while a card is open.
  const cardIdRef = useRef<string | null>(null);
  useEffect(() => {
    cardIdRef.current = cardData ? String(cardData.id) : null;
  }, [cardData]);

  useEffect(() => {
    if (!data || cardIdRef.current === null) return;

    try {
      const rawString = typeof data.getBinaryAttachment === 'function'
        ? data.getBinaryAttachment()
        : data;

      const jsonStart = rawString.indexOf('{');
      const jsonEnd = rawString.lastIndexOf('}');
      if (jsonStart === -1) return;
      const payload = JSON.parse(rawString.substring(jsonStart, jsonEnd + 1));

      const satId = payload.id || payload.name || payload.noradId;
      if (String(satId) !== cardIdRef.current) return;

      const apply = (prev: SatelliteData | null): SatelliteData | null =>
        prev && String(prev.id) === String(satId)
          ? { ...prev, ...payload, x: prev.x, y: prev.y }
          : prev;
      setHoverData(apply);
      setPinnedData(apply);
    } catch (e) {
      console.error("Tooltip Live-Update Error:", e);
    }
  }, [data]);

  // A changed filter replaces the satellite set, so a pinned card would go stale.
  useEffect(() => {
    setPinnedData(null);
  }, [activeTopics]);

  useEffect(() => {
    if (!hasPinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinnedData(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasPinned]);

  const controlPanel = (
    <ControlPanel
      satelliteCount={satelliteCount}
      onFilterChange={setActiveTopics}
      onRegionChange={setRegionKey}
      status={status}
      solaceData={data}
      autoRotate={autoRotate}
      onAutoRotateChange={setAutoRotate}
      mobile={isMobile}
    />
  );
  const infoPanel = <InfoPanel mobile={isMobile} />;

  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      {!isMobile && (
        <>
          {infoPanel}
          {controlPanel}
        </>
      )}

      <StatusBar
        status={status}
        error={error}
        msgRate={msgRate}
        satelliteCount={satelliteCount}
        onRetry={retry}
      />

      <Canvas
        role="img"
        aria-label="Interactive 3D globe showing live satellite positions"
        camera={{ position: [0, 0.1, 5] }}
        gl={{
          toneMapping: THREE.NoToneMapping
        }}
        onPointerMissed={() => setPinnedData(null)}
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
            onHoverSatellite={setHoverData}
            onSelectSatellite={setPinnedData}
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
          autoRotate={autoRotate && !cardData}
          autoRotateSpeed={0.08}
          minDistance={2.6}
          maxDistance={25}
        />
      </Canvas>

      {cardData && (
        <SatelliteTooltip
          data={cardData}
          visible
          x={cardData.x}
          y={cardData.y}
          mobile={isMobile}
          pinned={hasPinned}
          onClose={() => {
            setPinnedData(null);
            setHoverData(null);
          }}
        />
      )}

      <Hint mobile={isMobile} />

      {isMobile && <MobileMenu info={infoPanel} controls={controlPanel} />}
    </div>
  );
}

export default App;
