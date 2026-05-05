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
  const smoothedRateRef = useRef(0);
  const ALPHA = 0.8;

  useEffect(() => {
    setDataRef.current = setData;
    setSatelliteCountRef.current = setSatelliteCount;
  });

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
        subscribeToTopic(topic);

        solaceSubscriber.startRateCalculation((rawRate) => {
          const nextRate = smoothedRateRef.current + ALPHA * (rawRate - smoothedRateRef.current);

          smoothedRateRef.current = nextRate;
          setMsgRate(Math.round(nextRate));
        });
      } catch (err) {
        console.error("Solace Connection Error:", err);
      }
    };

    init();
  }, []);

  const subscribeToTopic = (targetTopic: string) => {
    if (activeSubscriptionRef.current && activeSubscriptionRef.current !== targetTopic) {
      solaceSubscriber.unsubscribe(activeSubscriptionRef.current);
    }

    setData(null);
    activeSatellitesRef.current.clear();
    setSatelliteCount(0);

    solaceSubscriber.subscribe(targetTopic, (msg) => {
      const incomingTopic = typeof msg.getDestination === 'function' ? msg.getDestination().getName() : '';

      if (!isMatch(incomingTopic, targetTopic)) {
        return;
      }

      setDataRef.current(msg);
    });

    activeSubscriptionRef.current = targetTopic;
  };

  useEffect(() => {
    if (isConnected && activeSubscriptionRef.current !== topic) {
      subscribeToTopic(topic);
    }
  }, [topic, isConnected]);

  function isMatch(incoming: string, filter: string): boolean {
    if (filter === "*" || filter.includes(">")) return true;

    const iParts = incoming.split('/');
    const fParts = filter.split('/');
    if (iParts.length !== fParts.length) return false;

    for (let i = 0; i < fParts.length; i++) {
      if (fParts[i] !== "*" && fParts[i] !== iParts[i]) {
        return false;
      }
    }

    return true;
  }

  return { data, isConnected, msgRate, satelliteCount };
};