import solace from 'solclientjs';

export interface SolaceConfig {
  url: string;
  vpnName: string;
  userName: string;
  password?: string;
}

export class SolaceSubscriber {
  private session: solace.Session | null = null;
  private factory: typeof solace.SolclientFactory;
  private connected = false;
  private messageCallback: ((payload: any) => void) | null = null;

  private msgCount = 0;
  private currentRate = 0;
  private activeTopics = new Set<string>();

  constructor() {
    this.factory = solace.SolclientFactory;
    const factoryProps = new solace.SolclientFactoryProperties();
    this.factory.init(factoryProps);
  }

  public isConnected() {
    return this.connected && this.session !== null;
  }

  public startRateCalculation(callback: (rate: number) => void) {
    setInterval(() => {
      this.currentRate = this.msgCount;
      this.msgCount = 0;
      callback(this.currentRate);
    }, 1000);
  }

  public async connect(config: SolaceConfig): Promise<void> {
    if (this.session) return;

    return new Promise((resolve, reject) => {
      try {
        this.session = this.factory.createSession({
          url: config.url,
          vpnName: config.vpnName,
          userName: config.userName,
          password: config.password,
        });

        this.session.on(solace.SessionEventCode.UP_NOTICE, () => {
          this.connected = true;
          console.log('✅ Solace Session Up');
          resolve();
        });

        this.session.on(solace.SessionEventCode.MESSAGE, (message: solace.Message) => {
          this.msgCount++;

          if (this.messageCallback) {
            this.messageCallback(message);
          }
        });

        this.session.connect();
      } catch (error) {
        reject(error);
      }
    });
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