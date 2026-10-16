import solace from 'solclientjs';

export interface SolaceConfig {
  url: string;
  vpnName: string;
  userName: string;
  password?: string;
}

/** Connection state as the UI shows it. */
export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

type StatusListener = (status: ConnectionStatus, detail?: string) => void;

export class SolaceSubscriber {
  private session: solace.Session | null = null;
  private factory: typeof solace.SolclientFactory;
  private connected = false;
  private messageCallback: ((payload: any) => void) | null = null;

  private msgCount = 0;
  private currentRate = 0;
  private rateTimer: ReturnType<typeof setInterval> | null = null;
  private activeTopics = new Set<string>();

  private status: ConnectionStatus = 'connecting';
  private statusListeners = new Set<StatusListener>();

  constructor() {
    this.factory = solace.SolclientFactory;
    const factoryProps = new solace.SolclientFactoryProperties();
    this.factory.init(factoryProps);
  }

  public isConnected() {
    return this.connected && this.session !== null;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /** Subscribe to connection state changes. Returns an unsubscribe function. */
  public onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: ConnectionStatus, detail?: string) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status, detail));
  }

  public startRateCalculation(callback: (rate: number) => void) {
    // Restarting (e.g. after a retry) must not stack timers.
    if (this.rateTimer) clearInterval(this.rateTimer);
    this.rateTimer = setInterval(() => {
      this.currentRate = this.msgCount;
      this.msgCount = 0;
      callback(this.currentRate);
    }, 1000);
  }

  public async connect(config: SolaceConfig): Promise<void> {
    if (this.session) return;

    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        const session = this.factory.createSession({
          url: config.url,
          vpnName: config.vpnName,
          userName: config.userName,
          password: config.password,
        });
        this.session = session;

        session.on(solace.SessionEventCode.UP_NOTICE, () => {
          this.connected = true;
          this.setStatus('live');
          console.log('✅ Solace Session Up');
          resolve();
        });

        session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (event: solace.SessionEvent) => {
          const reason = event?.infoStr || 'Could not connect to the event broker';
          this.teardown();
          this.setStatus('offline', reason);
          reject(new Error(reason));
        });

        session.on(solace.SessionEventCode.DISCONNECTED, () => {
          this.teardown();
          this.setStatus('offline', 'Connection to the event broker was lost');
        });

        session.on(solace.SessionEventCode.RECONNECTING_NOTICE, () => {
          this.setStatus('reconnecting');
        });

        session.on(solace.SessionEventCode.RECONNECTED_NOTICE, () => {
          this.setStatus('live');
        });

        session.on(solace.SessionEventCode.MESSAGE, (message: solace.Message) => {
          this.msgCount++;

          if (this.messageCallback) {
            this.messageCallback(message);
          }
        });

        session.connect();
      } catch (error) {
        this.teardown();
        this.setStatus('offline', error instanceof Error ? error.message : 'Connection failed');
        reject(error);
      }
    });
  }

  /** Drop the dead session so that connect() can be called again. */
  private teardown() {
    try {
      this.session?.dispose();
    } catch {
      // already gone
    }
    this.session = null;
    this.connected = false;
    this.activeTopics.clear();
  }

  public subscribe(topicName: string, onMessage: (payload: any) => void): void {
    this.subscribeMany([topicName], onMessage);
  }

  /**
   * Subscribe to several topics at once, all feeding a single shared callback.
   * Used for region filtering, where a region maps to a set of grid-cell topics.
   */
  public subscribeMany(topicNames: string[], onMessage: (payload: any) => void): void {
    if (!this.session) return;
    this.messageCallback = onMessage;

    for (const topicName of topicNames) {
      if (this.activeTopics.has(topicName)) continue;
      try {
        const topic = this.factory.createTopicDestination(topicName);
        this.session.subscribe(topic, true, topicName, 10000);
        this.activeTopics.add(topicName);
        console.log(`📡 Broker-Side Subscribe: ${topicName}`);
      } catch (error) {
        console.error("Subscription error:", error);
      }
    }
  }

  public unsubscribe(topicName: string) {
    if (!this.session) return;
    if (!this.activeTopics.has(topicName)) return;
    try {
      const topic = this.factory.createTopicDestination(topicName);
      this.session.unsubscribe(topic, true, topicName, 10000);
      this.activeTopics.delete(topicName);
      console.log(`[Solace] Unsubscribe: ${topicName}`);
    } catch (error) {
      console.error("Unsubscribe failed:", error);
    }
  }

  /** Unsubscribe from every currently active topic. */
  public unsubscribeAll() {
    for (const topicName of [...this.activeTopics]) {
      this.unsubscribe(topicName);
    }
  }

  public disconnect(): void {
    if (this.session) {
      this.session.disconnect();
      this.session = null;
      this.connected = false;
    }
  }
}

export const solaceSubscriber = new SolaceSubscriber();
