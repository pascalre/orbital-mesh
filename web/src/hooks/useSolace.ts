import { useEffect, useState, useRef } from 'react';
import { solaceSubscriber } from '../services/subscriber';

export const useSolace = (topic: string | string[]) => {
  const [data, setData] = useState<any>(null);
  const [msgRate, setMsgRate] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [satelliteCount, setSatelliteCount] = useState(0);

  // Normalize to a stable, order-independent key so effects only re-run when the
  // set of topics actually changes.
  const topics = Array.isArray(topic) ? topic : [topic];
  const topicKey = [...topics].sort().join('|');

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
        subscribeToTopics(topics);

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

  const subscribeToTopics = (targetTopics: string[]) => {
    const targetKey = [...targetTopics].sort().join('|');

    // Swap the whole subscription set when the region/filter changes.
    solaceSubscriber.unsubscribeAll();

    setData(null);
    activeSatellitesRef.current.clear();
    setSatelliteCount(0);

    solaceSubscriber.subscribeMany(targetTopics, (msg) => {
      const incomingTopic = typeof msg.getDestination === 'function' ? msg.getDestination().getName() : '';

      if (!isMatchAny(incomingTopic, targetTopics)) {
        return;
      }

      setDataRef.current(msg);
    });

    activeSubscriptionRef.current = targetKey;
  };

  useEffect(() => {
    if (isConnected && activeSubscriptionRef.current !== topicKey) {
      subscribeToTopics(topics);
    }
    // topicKey captures the meaningful change; topics is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicKey, isConnected]);

  function isMatchAny(incoming: string, filters: string[]): boolean {
    return filters.some((f) => isMatch(incoming, f));
  }

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