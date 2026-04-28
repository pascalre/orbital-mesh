import { useEffect, useState, useRef } from 'react';
import { solaceSubscriber } from '../services/subscriber';

export const useSolace = (topic: string) => {
  const [data, setData] = useState<any>(null);
  const [msgRate, setMsgRate] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [satelliteCount, setSatelliteCount] = useState(0);

  const activeSubscriptionRef = useRef<string | null>(null);
  const activeSatellitesRef = useRef(new Set<string>());
  
  const setDataRef = useRef(setData);
  const setSatelliteCountRef = useRef(setSatelliteCount);

  useEffect(() => {
    setDataRef.current = setData;
    setSatelliteCountRef.current = setSatelliteCount;
  });

  // EFFEKT 1: Verbindung und initiale Subscription sicherstellen
  useEffect(() => {
    const init = async () => {
      try {
        if (!solaceSubscriber.isConnected()) {
          await solaceSubscriber.connect({
            url: import.meta.env.VITE_SOLACE_URL,
            vpnName: import.meta.env.VITE_SOLACE_VPN,
            userName: import.meta.env.VITE_SOLACE_USER,
            password: import.meta.env.VITE_SOLACE_PASS,
          });
        }
        
        setIsConnected(true);

        // DIREKT NACH DEM CONNECT: 
        // Wir erzwingen die erste Subscription hier im selben Flow,
        // damit es keine Race-Condition zwischen den Effekten gibt.
        subscribeToTopic(topic);

        solaceSubscriber.startRateCalculation((rate) => {
          setMsgRate(rate);
        });
      } catch (err) {
        console.error("Solace Connection Error:", err);
      }
    };

    init();
  }, []); // Nur beim Booten

  // Hilfsfunktion für die Subscription-Logik
  const subscribeToTopic = (targetTopic: string) => {
    if (activeSubscriptionRef.current && activeSubscriptionRef.current !== targetTopic) {
      solaceSubscriber.unsubscribe(activeSubscriptionRef.current);
    }

    setData(null);
    activeSatellitesRef.current.clear();
    setSatelliteCount(0);

    solaceSubscriber.subscribe(targetTopic, (msg) => {
      setDataRef.current(msg);
      // ... (Zähler-Logik falls benötigt)
    });

    activeSubscriptionRef.current = targetTopic;
  };

  // EFFEKT 2: Reagiert NUR auf Topic-Wechsel im UI (Filter)
  useEffect(() => {
    // Wenn wir schon verbunden sind UND sich das Topic ändert
    if (isConnected && activeSubscriptionRef.current !== topic) {
      subscribeToTopic(topic);
    }
  }, [topic, isConnected]);

  return { data, isConnected, msgRate, satelliteCount };
};