Real-Time Digital Civilization Simulator

https://img.shields.io/badge/License-MIT-yellow.svg
https://img.shields.io/badge/Stack-MERN-blue

    A persistent, real-time civilization simulation where every action shapes history.

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