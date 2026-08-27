Real-Time Digital Civilization Simulator

https://img.shields.io/badge/License-MIT-yellow.svg
https://img.shields.io/badge/Stack-MERN-blue

    A persistent, real-time civilization simulation where every action shapes history.

## ⚙️ Current Implementation Status (engineering-accurate)

The section below this one is the original product vision/pitch document — it
describes features (politics, media, AI population, Redis/BullMQ, Three.js)
that are **not built yet**. What's actually implemented today, as plain
Node/Express + MongoDB + React, no Redis/BullMQ/TypeScript/Three.js:

| Service | Port | Owns |
|---|---|---|
| `auth-service` | 5000 | Accounts, login, JWT issuance |
| `economy-service` | 5001 | Wallet, jobs (incl. School's salary bonus), market/stocks, Casino |
| `game-world-service` | 5002 | Character identity, the map (buildings + houses), live position sync, Park/Gym/Cinema actions, Real Estate |
| `admin-service` | 5003 | Admin-only BFF — proxies every other service for `admin-client` |
| `simulation-service` | 5004 | Generated news, world events, NPC population (NPCs work/spend across every job & market category that exists — see its README) |
| `crime-service` | 5005 | Risk-reward crime actions, player heat, Police Station fine payoff |
| `game-client` | 5173 (dev) | The player-facing game (React + Phaser) |
| `admin-client` | 5174 (dev) | The admin dashboard (React) |

### Run everything at once (instead of 8 terminals)

The root `package.json` uses npm workspaces to cover all 8 services/apps
with one install and one run command:

```bash
npm install     # once, from the repo root — installs all 8 workspaces
npm run dev     # starts all 8 (auth, economy, game-world, admin-service,
                 # simulation, crime, game-client, admin-client) together,
                 # each line prefixed with its service name/color
```

Other useful root scripts: `npm run dev:backend` (just the 6 Node
services), `npm run dev:frontend` (just the 2 React apps), `npm run build`
(builds both clients), `npm run seed` (manually re-runs every service's
seed script — not required anymore since each service auto-seeds its
defaults on boot, but still there for a forced reseed).

Each service still has its own `.env` — the root scripts don't change
that, they just save you from opening/managing 8 terminals by hand. You
can still `cd` into any one service and run its own `npm run dev`
individually exactly as before, if you only want that one.


Every backend service shares one MongoDB cluster (separate collections, no
cross-service `ref`s) and a shared `JWT_SECRET` (player auth) +
`INTERNAL_API_KEY` (service-to-service calls). Each service has its own
`.env.example` — copy to `.env` and fill in real secrets before running.
After first setup, run each service's `npm run seed` (auth-service and
admin-service have none) — order doesn't matter except economy-service's
job/market seed should run before simulation-service's NPC seed, so NPCs
have the full job/item list to be assigned from.

**Playable today — a three-zone city, 75 interactive locations, 346
non-interactive houses:**
- **Old Meridian** (the original district, x: 0-4800) — 30 locations: Job
  Center, Market, Bank, Hospital, Restaurant, Gym, Cinema, Casino,
  Electronics/Boutique/Jeweler/Hardware Store/Trading Post, Stock Exchange,
  School, Real Estate, City Hall, Police Station, Courthouse, Credit Union,
  Insurance Office, Lottery, Embassy, University, Logistics Hub, Government
  Complex, Factory, Park, plus 40 traditional-style house templates
- **Neo Meridian** (the modern district, x: 5200-14000, almost 2x Old
  Meridian's area) — directly connected, no loading screen: keep walking
  east past x=4800 and the ground tint shifts. 30 more locations — 28 of
  them reuse an Old Meridian building type under a new name/skin (Neo Bank,
  Sky Lounge, VR Arcade, MedTech Clinic, etc. — same mechanic, same panel,
  different building), plus 2 genuinely new career tracks: **Tech Campus**
  (Data Analyst → Product Manager → Tech Director) and **Quantum Labs**
  (Lab Assistant → Research Scientist). 60 modern-style house templates,
  from studio flats up to skyscraper-sized penthouses/estates.
- **Dustridge County** (the rural district, x: 14400-27600, 3x Neo
  Meridian's area) — also directly connected, also no loading screen. Only
  15 buildings and 50 houses across this whole huge footprint — vast open
  farmland with fence/crop-row scenery, "less houses" by deliberate design
  (a much coarser placement grid, not just a smaller catalog). 13 of its 15
  buildings reuse an existing type under a rural name (General Store is
  `market`, Sheriff's Office is `police_station`, Rusty Spur Saloon is
  `casino`, etc.); **Farm** (a 3rd new career track: Farmhand → Farm
  Foreman → Ranch Owner) and **Gun Store** (a new `weapon` market category)
  are the two genuinely new pieces. Owning any weapon gives a real bonus to
  crime success chance — "more violence" reaching an actual mechanic, not
  just flavor text. 15 small, cheap, old-style house templates.
- **Systems that work across the whole city, not per-zone**: the wallet,
  crime heat, City Hall's elections/tax policy, School's skill bonus, and
  every job/market category — a resident of any zone shares one wallet, one
  criminal record, one Mayor. Only Real Estate ownership and house geometry
  are zone-specific (you can only own one house at a time, in any zone).
- NPC population scaled up to match (140 by default, was 60) since the
  city's location count and footprint have both grown substantially.

NPCs are a real backend economic simulation (they work jobs and buy/sell
market items, moving prices and employment stats) across every job and
item category above — not visible sprites walking the map. See
`simulation-service/README.md` for how that engine works.
Everything below "Core Features" is the long-term vision, not current state.

---

🎯 What is Veltriz?

Veltriz is a real-time, persistent, AI-driven civilization simulation platform where users live as digital citizens inside a continuously evolving society. It combines identity systems, economic simulation, political governance, crime dynamics, media influence, and an AI population into a single interconnected world.
🎮 Elevator Pitch

    Veltriz is a real-time civilization simulator where players live full digital lives—working, building businesses, entering politics, committing crimes, influencing media, and shaping a shared evolving world.

✨ Core Features
🧍 Citizen Life Simulation

    Full identity system (age, background, personality)

    Education and skill development

    Career progression across multiple paths

    Relationships, family, and inheritance

    Emotional and psychological states

💰 Economic Simulation

    Virtual currency system with inflation

    Job market with salaries

    Player and AI-driven marketplace

    Property ownership and asset trading

    Banking, loans, and investment systems

    Taxation and government spending

🏛️ Political Governance

    Multi-party democratic system

    Player and AI elections

    Lawmaking and policy implementation

    Government ministries and administration

    Public approval and protest mechanics

⚖️ Crime & Justice

    Organized crime and gang systems

    Risk-reward criminal mechanics

    Law enforcement AI and investigations

    Corruption and bribery dynamics

    Prison and legal systems

📰 Media & Influence

    Dynamic news generation from events

    Propaganda and narrative control

    Social sentiment tracking

    Reputation and influence propagation

    Viral event amplification

🤖 AI Population

    Millions of autonomous NPC citizens

    Economic, political, and social decision-making

    Emotional states and memory systems

    Herd behavior and influence spread

    Learning and adaptation over time

🏗️ System Architecture
text

┌──────────────┐
│   UI Layer   │
└──────┬───────┘
       │
       ▼
┌────────────────────┐
│ API Gateway Layer  │
└────────┬───────────┘
         │
         ▼
┌─────────────────────────────┐
│ WORLD SIMULATION ENGINE     │
│ (EVENT-DRIVEN CORE LOOP)    │
└───────┬───────┬────────────┘
         │       │
┌────────┘       └──────────┐
▼                             ▼
ECONOMY SYSTEM        POLITICS SYSTEM
▼                             ▼
CRIME SYSTEM          MEDIA SYSTEM
▼                             ▼
SOCIAL SYSTEM        MILITARY SYSTEM
         │
         ▼
  AI POPULATION ENGINE
         │
         ▼
  WORLD STATE MEMORY

🛠️ Technical Stack
Layer	Technology
Frontend	React, TypeScript, Tailwind CSS, Zustand, React Query
Backend	Node.js, Express, TypeScript
Database	MongoDB (primary), Redis (cache/realtime)
Real-Time	Socket.IO, WebSockets
Queue	BullMQ with Redis
Auth	JWT
Rendering	Three.js / Babylon.js (for 3D world)
Deployment	Docker, Kubernetes (future)
📊 Database Schema Overview
Core Collections
text

Users          → Identity, stats, reputation
Wallets        → Currency, holdings, balances
Transactions   → All economic movements
EconomyState   → Global economy variables
MarketPrices   → Commodity and asset prices
PoliticsState  → Government, parties, laws
Elections      → Candidates, votes, results
CrimeRecords   → Illegal actions, investigations
NewsArticles   → Generated news, narratives
NPCs           → AI citizens, behavior profiles
WorldState     → Master simulation snapshot
InfluenceGraph → Hidden power connections
SocialGraph    → Relationships and networks
Assets         → Property, businesses, vehicles
Events         → All system triggers

🔄 System Integration Model

Every player action triggers a cascade of system reactions:
text

Player Action
    ↓
Event Creation
    ↓
Multi-System Processing
    ↓
AI Population Response
    ↓
Media Amplification
    ↓
Social Sentiment Shift
    ↓
World State Update
    ↓
Real-Time Broadcast

Example Chain Reaction
text

Player starts business
    ↓
Economy: Supply increases
    ↓
Jobs: Employment rises
    ↓
Politics: Tax discussion triggered
    ↓
Media: News article generated
    ↓
Social: Reputation increases
    ↓
Crime: Corruption opportunity appears

🚀 MVP Roadmap
Phase 0 — Foundation (Week 1)

    Project setup, auth system, database connection

Phase 1 — Identity + Wallet (Week 2)

    Player identity, virtual currency, basic dashboard

Phase 2 — Basic Economy (Week 3)

    Jobs system, daily income, inflation control

Phase 3 — Marketplace (Week 4)

    Buy/sell assets, basic commodities, price system

Phase 4 — Real-Time Engine (Week 5)

    WebSockets, live updates, tick system

Phase 5 — AI Population (Week 6)

    NPC workers, automated market activity

Phase 6 — Events System (Week 7)

    Daily events, system-wide notifications

Phase 7 — Dashboard System (Week 8)

    Economy dashboard, analytics, market overview

Phase 8 — Stabilization (Week 9-10)

    Balance fixes, performance optimization, UX polish

🎨 UI/UX Philosophy

Veltriz is designed as a digital civilization control room:
Panel	Purpose
Citizen Dashboard	Personal stats, finances, relationships
Economy Dashboard	Markets, inflation, assets, trading
Business Dashboard	Company management, employees, production
Political Dashboard	Government, elections, policies, parties
Crime Dashboard	Criminal profile, investigations, networks
Media Dashboard	News, influence metrics, narrative control
World Map	Heatmaps for economy, crime, political control
Admin Center	God-mode control, event triggering, balancing
Design Style

    Dark futuristic UI

    Holographic panels

    Neon accents

    Data-rich layout

    Real-time visual feedback

🤖 AI System Design
NPC Architecture
text

Perceive → Decide → Act → Influence → Learn → Evolve

AI Layers

    Individual Layer — Personality, needs, goals, risk tolerance

    Social Layer — Relationships, group behavior, peer pressure

    Economic Layer — Spending, jobs, investments, consumption

    Political Layer — Voting, ideology, protest behavior

    Crime Layer — Criminal probability, gang behavior

    Media Influence — Belief shaping, sentiment change

Decision-Making

    Probability-based behavior

    Weighted option scoring

    Emotional state influence

    Memory and learning adaptation

💰 Monetization Model

Strictly Anti-Pay-to-Win
Revenue Stream	Description
Cosmetics	Avatar customization, UI themes, vehicle skins
Premium Lifestyle	Enhanced dashboards, advanced analytics
VIP Subscription	Deeper insights, priority access, extra customization
Event Pass	Seasonal passes, cosmetics, participation badges
Marketplace Fees	Small transaction fees for stability
❌ Not Allowed

    No real money withdrawal

    No direct currency purchase

    No guaranteed political wins

    No crime immunity

    No economic advantage purchases

⚖️ Legal & Safety
Classification

    Strictly a simulation game

    NOT a financial product

    NOT an investment platform

    NOT a gambling system

Key Protections

    All assets are virtual and non-redeemable

    No real-world value guarantees

    For entertainment simulation only

    Data privacy and encryption

    Content moderation systems

Ethical Boundaries

    Crime simulated strategically, not glorified

    Political systems remain fair

    No harmful propaganda modeling

    Social harm prevention measures

📦 Getting Started
Prerequisites

    Node.js (v16+)

    MongoDB (v4+)

    Redis (for caching and real-time)

    npm or yarn

Installation
bash

# Clone the repository
git clone https://github.com/yourusername/veltriz.git
cd veltriz

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB and Redis
# (Using Docker recommended)
docker-compose up -d

# Run development servers
# Backend (port 5000)
cd backend
npm run dev

# Frontend (port 3000)
cd frontend
npm start

Environment Variables
env

# Backend
PORT=5000
MONGODB_URI=mongodb://localhost:27017/veltriz
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000

📁 Project Structure
text

veltriz/
├── backend/
│   ├── src/
│   │   ├── models/          # MongoDB schemas
│   │   ├── controllers/     # Business logic
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Core simulation systems
│   │   │   ├── economy/
│   │   │   ├── politics/
│   │   │   ├── crime/
│   │   │   ├── media/
│   │   │   └── ai/
│   │   ├── engine/          # Master simulation core
│   │   ├── events/          # Event handling
│   │   └── socket/          # WebSocket management
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Main pages
│   │   ├── hooks/           # Custom hooks
│   │   ├── context/         # State management
│   │   ├── styles/          # Tailwind styles
│   │   └── utils/           # Helpers
│   └── package.json
├── docker-compose.yml
└── README.md

🧪 Running Tests
bash

# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e

🤝 Contributing

We welcome contributions! Please see our Contributing Guide for details.
Development Workflow

    Fork the repository

    Create a feature branch

    Make your changes

    Run tests

    Submit a pull request

📈 Project Status
Phase	Status	Progress
Design & Documentation	✅ Complete	100%
MVP Foundation	🚧 In Progress	30%
Economic Systems	📋 Planned	0%
Political Systems	📋 Planned	0%
Crime & Justice	📋 Planned	0%
Media & Influence	📋 Planned	0%
AI Population	📋 Planned	0%
Full Integration	📋 Planned	0%
🏆 Key Metrics Tracked
Metric	Description
Wealth	Financial power and assets
Influence	Social and political reach
Reputation	Trust/fear balance
Stability	Risk exposure
Legacy	Long-term historical impact
🔮 Vision & Roadmap
Short-Term (6 months)

    Complete MVP phase

    Core economic loop working

    Basic AI population

    Real-time synchronization

Mid-Term (1-2 years)

    Full political system

    Crime and justice systems

    Media and influence

    Advanced AI behavior

Long-Term (3+ years)

    Global scale

    Full civilization emergence

    Historical persistence

    Community-driven evolution

📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
🙏 Acknowledgments

    Inspiration from real-world societal systems

    Community feedback and testing

    Open source libraries and tools

📞 Contact

    Project Website: veltriz.com

    Discord: Join our community

    Twitter: @VeltrizSim

    Email: team@veltriz.com

⚠️ Disclaimer

Veltriz is a simulation game. All currencies, assets, political systems, and societal structures are fictional and for entertainment purposes only. No real money can be withdrawn, and no real-world value is associated with in-game items or currencies.

    "Where every action becomes history, and every citizen shapes civilization."

Built with ❤️ by the Veltriz Team