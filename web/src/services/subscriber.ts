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
    if (!this.session) return;
    this.messageCallback = onMessage;

    const topic = this.factory.createTopicDestination(topicName);
    try {
      this.session.subscribe(topic, true, topicName, 10000);
      console.log(`📡 Broker-Side Subscribe: ${topicName}`);
    } catch (error) {
      console.error("Subscription error:", error);
    }
  }

  public unsubscribe(topicName: string) {
    if (this.session) {
      try {
        const topic = this.factory.createTopicDestination(topicName);
        this.session.unsubscribe(topic, true, topicName, 10000);
        console.log(`[Solace] Unsubscribe: ${topicName}`);
      } catch (error) {
        console.error("Unsubscribe failed:", error);
      }
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