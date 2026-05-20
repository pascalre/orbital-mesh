# 🛰️ Orbital Mesh

> **A live Digital Twin of Earth's orbital environment — powered by Event-Driven Architecture and Solace.**

## What Is This?

**Orbital Mesh** is an interactive demo that visualizes satellites orbiting Earth in real time — as a living, breathing 3D globe in your browser.

![Demo](https://raw.githubusercontent.com/pascalre/orbital-mesh/master/docs/demo.png)

Every satellite you see moving on screen is driven by a live event stream. There is no polling, no page refresh, no manual data loading. Position updates flow continuously from a backend emitter through a Solace event mesh directly into the frontend, where they instantly appear as smooth orbital motion.

It's a digital twin: a virtual mirror of a real-world system, kept in sync through events.

## Why This Demo Exists

Most people understand that data moves through systems. Fewer people *feel* what it means for data to move in real time, at scale, through an event-driven architecture.

Orbital Mesh makes it accessible.

Watch a satellite arc across the globe. That movement you see? It didn't happen because the browser asked for it. It happened because an event was *published* the moment the position changed — and every connected subscriber received it instantly, automatically, without anyone asking.

**That is EDA.** And once you see it working at orbital scale, it's hard to unsee it everywhere else.

## How It Works

The architecture is intentionally simple to illustrate a powerful idea:

![Architecture](https://raw.githubusercontent.com/pascalre/orbital-mesh/master/docs/architecture.png)

**Three moving parts. One flow.**

1. **The Emitter** continuously calculates orbital positions and publishes each update as an event — fire-and-forget, no knowledge of who's listening.

2. **The Solace Broker** receives those events and instantly routes them to any and all subscribers. It acts as the intelligent nervous system connecting producers and consumers, decoupled from one another.

3. **The Web Frontend** subscribes to the event stream and renders each position update as it arrives — no requests, no waiting, just continuous real-time motion.

## What Makes EDA So Powerful Here

### Decoupling
The emitter has no idea a browser exists. The browser has no idea what language the emitter is written in. They share nothing except a topic and a message format. This means any component can be replaced, scaled, or swapped without touching the others.

### Real-Time by Default
Events are pushed the moment they happen. There's no scheduled job, no polling interval, no cache to expire. The state you see is the state that *is*.

### Scalability Without Redesign
Want to add a second visualization — a 2D map, a data dashboard, a mission control panel? Just subscribe. The emitter keeps doing exactly what it's doing. You don't change anything upstream.

### Fan-Out for Free
One event, published once, can be consumed by dozens of different subscribers simultaneously. In traditional architectures, this requires custom integrations for each new consumer. In EDA, it's the default behavior.


## Who This Is For

Orbital Mesh is a conversation starter, not a production system. It's designed to resonate with anyone who has ever wondered:

- *"How do you build a system that reacts the moment something changes?"*
- *"What does real-time actually mean in practice?"*
- *"How do you connect systems that shouldn't know about each other?"*

Whether you're evaluating event-driven platforms, exploring IoT architectures, designing enterprise integrations, or just curious what a modern event mesh looks like in action — this demo is for you.

## Try It Live

**No setup required.** Open the demo in your browser and watch the orbital positions update in real time:

👉 **[london.solace.rocks/orbital-mesh](https://london.solace.rocks/orbital-mesh/)**

## The Bigger Picture

Satellites are just one domain. The same architecture powers:

- **IoT & Industrial** — thousands of sensors streaming telemetry from machines, vehicles, or infrastructure
- **Financial Services** — trade events, fraud signals, and market data flowing in milliseconds
- **Retail & Logistics** — inventory changes, shipment tracking, and demand signals propagating in real time
- **Healthcare** — patient monitoring, device data, and alert routing without delay

Wherever things happen in the real world and systems need to react — that's where EDA, and Solace, lives.

## Learn More

- 🌐 [Solace.com](https://solace.com) — Event-driven architecture platform
- 📖 [Solace Documentation](https://docs.solace.com) — Dive deeper into the technology
- 🧭 [Solace Demos](https://solace.rocks/demos/index.html) — Explore other EDA demos
- 💬 [Solace Community](https://solace.community) — Talk to developers building with Solace

*Built with 💚 by [Pascal Reitermann](https://github.com/pascalre) as a Solace demo.*