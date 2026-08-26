require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const MarketItem = require('../models/MarketItem');
const MarketPrice = require('../models/MarketPrice');

// 5 career tracks x 3 tiers = 15 jobs. Each tier promotes into the next via
// nextTierKey once promotionShiftsRequired is met (see jobs.controller.js's
// promoteJob). Salaries roughly double tier-to-tier to make promotion feel
// meaningfully rewarding, not cosmetic.
const JOBS = [
  // ---- Retail career track ----
  {
    key: 'cashier',
    title: 'Cashier',
    description: 'Entry-level retail work. No qualifications needed.',
    sector: 'commerce',
    baseSalary: 70,
    cooldownMinutes: 20,
    icon: 'store',
    locationType: 'market',
    careerTrack: 'retail',
    tier: 1,
    nextTierKey: 'shift_supervisor',
    promotionShiftsRequired: 8,
  },
  {
    key: 'shift_supervisor',
    title: 'Shift Supervisor',
    description: 'Runs the floor and manages a small retail team.',
    sector: 'commerce',
    baseSalary: 140,
    cooldownMinutes: 30,
    icon: 'clipboard-list',
    locationType: 'market',
    careerTrack: 'retail',
    tier: 2,
    nextTierKey: 'store_manager',
    promotionShiftsRequired: 15,
  },
  {
    key: 'store_manager',
    title: 'Store Manager',
    description: 'Full responsibility for a Veltriz retail location.',
    sector: 'commerce',
    baseSalary: 280,
    cooldownMinutes: 45,
    icon: 'store',
    locationType: 'market',
    careerTrack: 'retail',
    tier: 3,
  },

  // ---- Industrial career track ----
  {
    key: 'factory_worker',
    title: 'Factory Worker',
    description: 'Entry-level industrial labor.',
    sector: 'industry',
    baseSalary: 80,
    cooldownMinutes: 30,
    icon: 'hard-hat',
    locationType: 'factory',
    careerTrack: 'industrial',
    tier: 1,
    nextTierKey: 'line_supervisor',
    promotionShiftsRequired: 10,
  },
  {
    key: 'line_supervisor',
    title: 'Line Supervisor',
    description: 'Oversees a production line and its safety record.',
    sector: 'industry',
    baseSalary: 160,
    cooldownMinutes: 40,
    icon: 'hard-hat',
    locationType: 'factory',
    careerTrack: 'industrial',
    tier: 2,
    nextTierKey: 'plant_manager',
    promotionShiftsRequired: 18,
  },
  {
    key: 'plant_manager',
    title: 'Plant Manager',
    description: 'Runs an entire industrial facility.',
    sector: 'industry',
    baseSalary: 320,
    cooldownMinutes: 60,
    icon: 'factory',
    locationType: 'factory',
    careerTrack: 'industrial',
    tier: 3,
  },

  // ---- Logistics career track ----
  {
    key: 'delivery_driver',
    title: 'Delivery Driver',
    description: 'Move goods across the city.',
    sector: 'services',
    baseSalary: 90,
    cooldownMinutes: 25,
    icon: 'truck',
    locationType: 'logistics_hub',
    careerTrack: 'logistics',
    tier: 1,
    nextTierKey: 'dispatcher',
    promotionShiftsRequired: 8,
  },
  {
    key: 'dispatcher',
    title: 'Dispatcher',
    description: 'Coordinates routes for a whole fleet of drivers.',
    sector: 'services',
    baseSalary: 170,
    cooldownMinutes: 35,
    icon: 'radio',
    locationType: 'logistics_hub',
    careerTrack: 'logistics',
    tier: 2,
    nextTierKey: 'logistics_manager',
    promotionShiftsRequired: 16,
  },
  {
    key: 'logistics_manager',
    title: 'Logistics Manager',
    description: 'Owns the entire supply chain operation.',
    sector: 'services',
    baseSalary: 340,
    cooldownMinutes: 50,
    icon: 'truck',
    locationType: 'logistics_hub',
    careerTrack: 'logistics',
    tier: 3,
  },

  // ---- Engineering career track ----
  {
    key: 'junior_engineer',
    title: 'Junior Engineer',
    description: 'Technical work at a local firm.',
    sector: 'technology',
    baseSalary: 150,
    cooldownMinutes: 45,
    icon: 'cpu',
    locationType: 'university',
    careerTrack: 'engineering',
    tier: 1,
    nextTierKey: 'software_engineer',
    promotionShiftsRequired: 12,
  },
  {
    key: 'software_engineer',
    title: 'Software Engineer',
    description: 'Builds and ships real systems.',
    sector: 'technology',
    baseSalary: 260,
    cooldownMinutes: 55,
    icon: 'cpu',
    locationType: 'university',
    careerTrack: 'engineering',
    tier: 2,
    nextTierKey: 'senior_engineer',
    promotionShiftsRequired: 20,
  },
  {
    key: 'senior_engineer',
    title: 'Senior Engineer',
    description: 'Leads technical direction for major projects.',
    sector: 'technology',
    baseSalary: 480,
    cooldownMinutes: 70,
    icon: 'cpu',
    locationType: 'university',
    careerTrack: 'engineering',
    tier: 3,
  },

  // ---- Public service career track ----
  {
    key: 'clerk_officer',
    title: 'Government Clerk',
    description: 'Processes paperwork for the city administration.',
    sector: 'government',
    baseSalary: 100,
    cooldownMinutes: 30,
    icon: 'landmark',
    locationType: 'government_complex',
    careerTrack: 'public_service',
    tier: 1,
    nextTierKey: 'civil_officer',
    promotionShiftsRequired: 10,
  },
  {
    key: 'civil_officer',
    title: 'Civil Officer',
    description: 'Handles official city business and permits.',
    sector: 'government',
    baseSalary: 200,
    cooldownMinutes: 40,
    icon: 'landmark',
    locationType: 'government_complex',
    careerTrack: 'public_service',
    tier: 2,
    nextTierKey: 'administrator',
    promotionShiftsRequired: 18,
  },
  {
    key: 'administrator',
    title: 'City Administrator',
    description: 'Senior public office overseeing city operations.',
    sector: 'government',
    baseSalary: 360,
    cooldownMinutes: 55,
    icon: 'landmark',
    locationType: 'government_complex',
    careerTrack: 'public_service',
    tier: 3,
  },

  // ---- Location-tied jobs (single tier, hireable straight from that
  // location's panel via locationType, and still visible at the generic
  // Job Center like every other job) ----
  {
    key: 'electronics_technician',
    title: 'Electronics Technician',
    description: 'Repairs and stocks devices at the Electronics Store.',
    sector: 'technology',
    baseSalary: 130,
    cooldownMinutes: 30,
    icon: 'cpu',
    locationType: 'electronics',
  },
  {
    key: 'boutique_associate',
    title: 'Boutique Sales Associate',
    description: 'Helps customers find the right look.',
    sector: 'commerce',
    baseSalary: 95,
    cooldownMinutes: 25,
    icon: 'shirt',
    locationType: 'boutique',
  },
  {
    key: 'jeweler_assistant',
    title: "Jeweler's Assistant",
    description: 'Appraises and displays fine jewelry.',
    sector: 'commerce',
    baseSalary: 150,
    cooldownMinutes: 35,
    icon: 'gem',
    locationType: 'jeweler',
  },
  {
    key: 'personal_trainer',
    title: 'Personal Trainer',
    description: 'Coaches members through their workouts at the Gym.',
    sector: 'services',
    baseSalary: 120,
    cooldownMinutes: 30,
    icon: 'dumbbell',
    locationType: 'gym',
  },
  {
    key: 'casino_dealer',
    title: 'Casino Dealer',
    description: 'Runs the tables at the Veltriz Casino.',
    sector: 'services',
    baseSalary: 180,
    cooldownMinutes: 40,
    icon: 'dice-5',
    locationType: 'casino',
  },
  {
    key: 'stockbroker',
    title: 'Stockbroker',
    description: 'Executes trades and advises clients at the Stock Exchange.',
    sector: 'commerce',
    baseSalary: 200,
    cooldownMinutes: 45,
    icon: 'trending-up',
    locationType: 'stock_exchange',
  },
  {
    key: 'hospital_nurse',
    title: 'Nurse',
    description: 'Treats patients at Veltriz General Hospital.',
    sector: 'healthcare',
    baseSalary: 160,
    cooldownMinutes: 35,
    icon: 'stethoscope',
    locationType: 'hospital',
  },
  {
    key: 'restaurant_chef',
    title: 'Chef',
    description: 'Cooks for the Veltriz Diner.',
    sector: 'services',
    baseSalary: 110,
    cooldownMinutes: 25,
    icon: 'utensils',
    locationType: 'restaurant',
  },
  {
    key: 'real_estate_agent',
    title: 'Real Estate Agent',
    description: 'Lists and sells homes around the district.',
    sector: 'commerce',
    baseSalary: 170,
    cooldownMinutes: 40,
    icon: 'home',
    locationType: 'real_estate',
  },
  {
    key: 'school_teacher',
    title: 'Teacher',
    description: 'Teaches classes at the local School.',
    sector: 'services',
    baseSalary: 150,
    cooldownMinutes: 40,
    icon: 'graduation-cap',
    locationType: 'school',
  },
  {
    key: 'police_officer',
    title: 'Police Officer',
    description: 'Keeps the peace and processes fines at the Police Station.',
    sector: 'government',
    baseSalary: 190,
    cooldownMinutes: 45,
    icon: 'shield',
    locationType: 'police_station',
  },
  {
    key: 'cinema_usher',
    title: 'Cinema Usher',
    description: 'Runs the box office and shows at the Cinema.',
    sector: 'services',
    baseSalary: 85,
    cooldownMinutes: 20,
    icon: 'clapperboard',
    locationType: 'cinema',
  },
  {
    key: 'loan_officer',
    title: 'Loan Officer',
    description: 'Processes loans and repayments at the Credit Union.',
    sector: 'commerce',
    baseSalary: 145,
    cooldownMinutes: 30,
    icon: 'banknote',
    locationType: 'credit_union',
  },
  {
    key: 'insurance_agent',
    title: 'Insurance Agent',
    description: 'Sells policies at the Insurance Office.',
    sector: 'commerce',
    baseSalary: 135,
    cooldownMinutes: 30,
    icon: 'umbrella',
    locationType: 'insurance_office',
  },
  {
    key: 'lottery_clerk',
    title: 'Lottery Clerk',
    description: 'Sells tickets and runs draws at the Lottery.',
    sector: 'services',
    baseSalary: 80,
    cooldownMinutes: 20,
    icon: 'ticket',
    locationType: 'lottery',
  },
  {
    key: 'court_clerk',
    title: 'Court Clerk',
    description: 'Files cases and manages records at the Courthouse.',
    sector: 'government',
    baseSalary: 155,
    cooldownMinutes: 35,
    icon: 'gavel',
    locationType: 'courthouse',
  },
  {
    key: 'embassy_officer',
    title: 'Embassy Officer',
    description: 'Processes citizenship paperwork at the Embassy.',
    sector: 'government',
    baseSalary: 140,
    cooldownMinutes: 30,
    icon: 'globe',
    locationType: 'embassy',
  },

  // ---- Neo Meridian exclusive career tracks ----
  // Tech Campus: 3-tier, hosted at Neo Meridian Tower.
  {
    key: 'data_analyst',
    title: 'Data Analyst',
    description: 'Turns raw city data into insight at Neo Meridian Tower.',
    sector: 'technology',
    baseSalary: 190,
    cooldownMinutes: 40,
    icon: 'building-2',
    locationType: 'tech_campus',
    careerTrack: 'innovation',
    tier: 1,
    nextTierKey: 'product_manager',
    promotionShiftsRequired: 12,
  },
  {
    key: 'product_manager',
    title: 'Product Manager',
    description: 'Ships new features for one of Neo Meridian\u2019s tech firms.',
    sector: 'technology',
    baseSalary: 320,
    cooldownMinutes: 50,
    icon: 'building-2',
    locationType: 'tech_campus',
    careerTrack: 'innovation',
    tier: 2,
    nextTierKey: 'tech_director',
    promotionShiftsRequired: 20,
  },
  {
    key: 'tech_director',
    title: 'Tech Director',
    description: 'Sets technical strategy for the whole tower.',
    sector: 'technology',
    baseSalary: 560,
    cooldownMinutes: 65,
    icon: 'building-2',
    locationType: 'tech_campus',
    careerTrack: 'innovation',
    tier: 3,
  },

  // Quantum Labs: 2-tier research track, deliberately shorter than the
  // others — research is a smaller, more specialized field in-world.
  {
    key: 'lab_assistant',
    title: 'Lab Assistant',
    description: 'Runs experiments and logs results at Quantum Labs.',
    sector: 'technology',
    baseSalary: 210,
    cooldownMinutes: 45,
    icon: 'flask-conical',
    locationType: 'quantum_labs',
    careerTrack: 'research',
    tier: 1,
    nextTierKey: 'research_scientist',
    promotionShiftsRequired: 15,
  },
  {
    key: 'research_scientist',
    title: 'Research Scientist',
    description: 'Leads original research at the city\u2019s premier lab.',
    sector: 'technology',
    baseSalary: 420,
    cooldownMinutes: 60,
    icon: 'flask-conical',
    locationType: 'quantum_labs',
    careerTrack: 'research',
    tier: 2,
  },

  // ---- Dustridge County exclusive career track: agriculture ----
  {
    key: 'farmhand',
    title: 'Farmhand',
    description: 'Long hours in the fields at Dustridge Farm.',
    sector: 'industry',
    baseSalary: 95,
    cooldownMinutes: 30,
    icon: 'wheat',
    locationType: 'farm',
    careerTrack: 'agriculture',
    tier: 1,
    nextTierKey: 'farm_foreman',
    promotionShiftsRequired: 10,
  },
  {
    key: 'farm_foreman',
    title: 'Farm Foreman',
    description: 'Runs the day-to-day operation of the farm.',
    sector: 'industry',
    baseSalary: 175,
    cooldownMinutes: 40,
    icon: 'wheat',
    locationType: 'farm',
    careerTrack: 'agriculture',
    tier: 2,
    nextTierKey: 'ranch_owner',
    promotionShiftsRequired: 18,
  },
  {
    key: 'ranch_owner',
    title: 'Ranch Owner',
    description: "Owns Dustridge Farm outright — the county's biggest employer.",
    sector: 'industry',
    baseSalary: 340,
    cooldownMinutes: 55,
    icon: 'wheat',
    locationType: 'farm',
    careerTrack: 'agriculture',
    tier: 3,
  },

  // ---- Port Haven exclusive career track: maritime administration ----
  {
    key: 'dockhand',
    title: 'Dockhand',
    description: 'Loads and unloads cargo at Port Haven Authority.',
    sector: 'services',
    baseSalary: 100,
    cooldownMinutes: 25,
    icon: 'anchor',
    locationType: 'port_authority',
    careerTrack: 'maritime',
    tier: 1,
    nextTierKey: 'crane_operator',
    promotionShiftsRequired: 10,
  },
  {
    key: 'crane_operator',
    title: 'Crane Operator',
    description: 'Moves shipping containers between vessel and yard.',
    sector: 'services',
    baseSalary: 200,
    cooldownMinutes: 35,
    icon: 'anchor',
    locationType: 'port_authority',
    careerTrack: 'maritime',
    tier: 2,
    nextTierKey: 'harbor_master',
    promotionShiftsRequired: 18,
  },
  {
    key: 'harbor_master',
    title: 'Harbor Master',
    description: "Runs Port Haven's entire shipping schedule.",
    sector: 'services',
    baseSalary: 380,
    cooldownMinutes: 55,
    icon: 'anchor',
    locationType: 'port_authority',
    careerTrack: 'maritime',
    tier: 3,
  },

  // ---- Veltriz Sea exclusive career track: commercial fishing ----
  {
    key: 'deckhand',
    title: 'Deckhand',
    description: 'Hauls nets aboard at the Fishing Wharf.',
    sector: 'industry',
    baseSalary: 105,
    cooldownMinutes: 30,
    icon: 'fish',
    locationType: 'fishing_wharf',
    careerTrack: 'fishing',
    tier: 1,
    nextTierKey: 'fishing_captain',
    promotionShiftsRequired: 10,
  },
  {
    key: 'fishing_captain',
    title: 'Fishing Captain',
    description: 'Commands a trawler and its catch quota.',
    sector: 'industry',
    baseSalary: 210,
    cooldownMinutes: 40,
    icon: 'fish',
    locationType: 'fishing_wharf',
    careerTrack: 'fishing',
    tier: 2,
    nextTierKey: 'fleet_owner',
    promotionShiftsRequired: 18,
  },
  {
    key: 'fleet_owner',
    title: 'Fleet Owner',
    description: 'Owns every trawler working out of the Wharf.',
    sector: 'industry',
    baseSalary: 400,
    cooldownMinutes: 58,
    icon: 'fish',
    locationType: 'fishing_wharf',
    careerTrack: 'fishing',
    tier: 3,
  },

  // ---- Veltriz Sea exclusive career track: offshore energy ----
  {
    key: 'roughneck',
    title: 'Roughneck',
    description: 'Works the drill floor on the Offshore Oil Platform.',
    sector: 'industry',
    baseSalary: 220,
    cooldownMinutes: 40,
    icon: 'flame',
    locationType: 'oil_rig',
    careerTrack: 'offshore_energy',
    tier: 1,
    nextTierKey: 'rig_supervisor',
    promotionShiftsRequired: 14,
  },
  {
    key: 'rig_supervisor',
    title: 'Rig Supervisor',
    description: 'Oversees drill crews and platform safety.',
    sector: 'industry',
    baseSalary: 400,
    cooldownMinutes: 55,
    icon: 'flame',
    locationType: 'oil_rig',
    careerTrack: 'offshore_energy',
    tier: 2,
    nextTierKey: 'platform_manager',
    promotionShiftsRequired: 22,
  },
  {
    key: 'platform_manager',
    title: 'Platform Manager',
    description: 'Runs the entire Offshore Oil Platform.',
    sector: 'industry',
    baseSalary: 620,
    cooldownMinutes: 70,
    icon: 'flame',
    locationType: 'oil_rig',
    careerTrack: 'offshore_energy',
    tier: 3,
  },

  // ---- Veltriz Sea exclusive career track: oceanography (2-tier,
  // deliberately short like Quantum Labs' research track) ----
  {
    key: 'marine_biologist',
    title: 'Marine Biologist',
    description: 'Studies reef and deep-sea life for the Institute.',
    sector: 'technology',
    baseSalary: 240,
    cooldownMinutes: 45,
    icon: 'flask-conical',
    locationType: 'marine_research',
    careerTrack: 'oceanography',
    tier: 1,
    nextTierKey: 'chief_oceanographer',
    promotionShiftsRequired: 16,
  },
  {
    key: 'chief_oceanographer',
    title: 'Chief Oceanographer',
    description: "Leads the Institute's entire research program.",
    sector: 'technology',
    baseSalary: 460,
    cooldownMinutes: 62,
    icon: 'flask-conical',
    locationType: 'marine_research',
    careerTrack: 'oceanography',
    tier: 2,
  },
];

const MARKET_ITEMS = [
  // ---- Commodities (pure investment, no consume effect) ----
  { key: 'wheat', name: 'Wheat', category: 'commodity', basePrice: 12, volatilityPercent: 3, icon: 'wheat' },
  { key: 'fuel', name: 'Fuel', category: 'commodity', basePrice: 45, volatilityPercent: 4, icon: 'fuel' },
  { key: 'gold', name: 'Gold', category: 'commodity', basePrice: 5800, volatilityPercent: 1.5, icon: 'gem' },
  { key: 'silver', name: 'Silver', category: 'commodity', basePrice: 720, volatilityPercent: 2, icon: 'circle-dollar-sign' },
  { key: 'oil_barrel', name: 'Oil Barrel', category: 'commodity', basePrice: 310, volatilityPercent: 3.5, icon: 'droplet' },

  // ---- Tools (utility, not consumable — no in-game use yet beyond ownership) ----
  { key: 'toolkit', name: 'Toolkit', category: 'tool', basePrice: 60, volatilityPercent: 2, icon: 'wrench' },
  { key: 'work_gloves', name: 'Work Gloves', category: 'tool', basePrice: 25, volatilityPercent: 2, icon: 'hand' },

  // ---- Electronics (luxury-ish, not consumable) ----
  { key: 'smartphone', name: 'Smartphone', category: 'electronics', basePrice: 350, volatilityPercent: 3.5, icon: 'smartphone' },
  { key: 'laptop', name: 'Laptop', category: 'electronics', basePrice: 900, volatilityPercent: 3, icon: 'laptop' },
  { key: 'television', name: 'Television', category: 'electronics', basePrice: 480, volatilityPercent: 2.5, icon: 'tv' },

  // ---- Luxury (status items, not consumable) ----
  { key: 'watch', name: 'Luxury Watch', category: 'luxury', basePrice: 2200, volatilityPercent: 2, icon: 'watch' },
  { key: 'jewelry', name: 'Jewelry Set', category: 'luxury', basePrice: 3400, volatilityPercent: 2.5, icon: 'gem' },

  // ---- Food (consumable — restores energy) ----
  {
    key: 'sandwich',
    name: 'Sandwich',
    category: 'food',
    basePrice: 8,
    volatilityPercent: 2,
    icon: 'sandwich',
    consumable: true,
    effectEnergy: 12,
  },
  {
    key: 'home_cooked_meal',
    name: 'Home-Cooked Meal',
    category: 'food',
    basePrice: 22,
    volatilityPercent: 2,
    icon: 'utensils',
    consumable: true,
    effectEnergy: 30,
    effectHappiness: 5,
  },
  {
    key: 'coffee',
    name: 'Coffee',
    category: 'food',
    basePrice: 5,
    volatilityPercent: 1.5,
    icon: 'coffee',
    consumable: true,
    effectEnergy: 8,
  },

  // ---- Clothing (consumable — a little happiness boost from looking good) ----
  {
    key: 'casual_outfit',
    name: 'Casual Outfit',
    category: 'clothing',
    basePrice: 45,
    volatilityPercent: 2,
    icon: 'shirt',
    consumable: true,
    effectHappiness: 10,
  },
  {
    key: 'designer_outfit',
    name: 'Designer Outfit',
    category: 'clothing',
    basePrice: 260,
    volatilityPercent: 2.5,
    icon: 'shirt',
    consumable: true,
    effectHappiness: 25,
  },

  // ---- Medicine (consumable — restores energy AND happiness, pricier) ----
  {
    key: 'vitamins',
    name: 'Vitamins',
    category: 'medicine',
    basePrice: 18,
    volatilityPercent: 2,
    icon: 'pill',
    consumable: true,
    effectEnergy: 15,
    effectHappiness: 5,
  },
  {
    key: 'wellness_package',
    name: 'Wellness Package',
    category: 'medicine',
    basePrice: 85,
    volatilityPercent: 2,
    icon: 'heart-pulse',
    consumable: true,
    effectEnergy: 40,
    effectHappiness: 20,
  },

  // ---- Stock (fictional company shares, traded at the Stock Exchange) ----
  // Same buy/sell mechanism and the same price-drift engine as every other
  // category (see cron/priceEngine.js) — nothing special about "stock" to
  // the backend. What makes it feel like a real market: much higher
  // volatilityPercent than commodities (real stocks move faster) and a
  // sellRateMultiplier near 1 (trade at live price, no pawn-shop spread).
  {
    key: 'vlt_industries',
    name: 'Veltriz Industries (VLTI)',
    category: 'stock',
    basePrice: 240,
    volatilityPercent: 6,
    sellRateMultiplier: 0.98,
    icon: 'factory',
  },
  {
    key: 'nova_tech',
    name: 'Nova Technologies (NOVA)',
    category: 'stock',
    basePrice: 610,
    volatilityPercent: 9,
    sellRateMultiplier: 0.98,
    icon: 'cpu',
  },
  {
    key: 'goldenharvest_agri',
    name: 'Goldenharvest Agriculture (GHAG)',
    category: 'stock',
    basePrice: 88,
    volatilityPercent: 4,
    sellRateMultiplier: 0.98,
    icon: 'wheat',
  },
  {
    key: 'crestline_bank',
    name: 'Crestline Bank Holdings (CBH)',
    category: 'stock',
    basePrice: 155,
    volatilityPercent: 3,
    sellRateMultiplier: 0.98,
    icon: 'landmark',
  },
  {
    key: 'skyline_realty',
    name: 'Skyline Realty Group (SKRG)',
    category: 'stock',
    basePrice: 320,
    volatilityPercent: 5,
    sellRateMultiplier: 0.98,
    icon: 'building',
  },
  {
    key: 'pulseenergy_co',
    name: 'PulseEnergy Co. (PLSE)',
    category: 'stock',
    basePrice: 72,
    volatilityPercent: 8,
    sellRateMultiplier: 0.98,
    icon: 'zap',
  },
  {
    key: 'meridian_retail',
    name: 'Meridian Retail (MRDN)',
    category: 'stock',
    basePrice: 45,
    volatilityPercent: 5,
    sellRateMultiplier: 0.98,
    icon: 'store',
  },

  // ---- Seafood (Port Haven's Fish Market — sold via CategoryTradePanel
  // like weapon/luxury, collectible/tradeable, no consumable effect) ----
  { key: 'tuna_catch', name: 'Tuna Catch', category: 'seafood', basePrice: 55, volatilityPercent: 4, sellRateMultiplier: 0.85, icon: 'fish' },
  { key: 'crab_haul', name: 'Crab Haul', category: 'seafood', basePrice: 70, volatilityPercent: 4.5, sellRateMultiplier: 0.85, icon: 'fish' },
  { key: 'lobster_crate', name: 'Lobster Crate', category: 'seafood', basePrice: 160, volatilityPercent: 3.5, sellRateMultiplier: 0.85, icon: 'fish' },
  { key: 'squid_ink_barrel', name: 'Squid Ink Barrel', category: 'seafood', basePrice: 95, volatilityPercent: 5, sellRateMultiplier: 0.85, icon: 'fish' },

  // ---- Crude oil (the Offshore Oil Platform's own tradeable output —
  // distinct from the existing 'oil_barrel' commodity, which is refined
  // product sold city-wide; this is the raw, riskier-to-hold input) ----
  { key: 'crude_barrel', name: 'Crude Oil Barrel', category: 'crude_oil', basePrice: 260, volatilityPercent: 5, sellRateMultiplier: 0.8, icon: 'droplet' },
  { key: 'natural_gas_canister', name: 'Natural Gas Canister', category: 'crude_oil', basePrice: 140, volatilityPercent: 6, sellRateMultiplier: 0.8, icon: 'flame' },
  { key: 'offshore_drilling_rights', name: 'Offshore Drilling Rights', category: 'crude_oil', basePrice: 5200, volatilityPercent: 3, sellRateMultiplier: 0.75, icon: 'flame' },

  // ---- Pearls (the Pearl Divers' Guild's own luxury-adjacent category —
  // deliberately separate from 'luxury' so it doesn't just show up at
  // every existing Jeweler unannounced) ----
  { key: 'freshwater_pearl', name: 'Freshwater Pearl', category: 'pearls', basePrice: 480, volatilityPercent: 3, sellRateMultiplier: 0.85, icon: 'gem' },
  { key: 'black_pearl', name: 'Black Pearl', category: 'pearls', basePrice: 1450, volatilityPercent: 2.5, sellRateMultiplier: 0.85, icon: 'gem' },
  { key: 'south_sea_pearl_strand', name: 'South Sea Pearl Strand', category: 'pearls', basePrice: 3800, volatilityPercent: 2, sellRateMultiplier: 0.85, icon: 'gem' },

  // ---- Weapon (Dustridge County's Gun Store — collectible/tradeable game
  // items, no consumable effect. Owning any one of these gives a flat
  // bonus to crime success chance — see crime-service's economyClient
  // #checkHasWeapon and attemptCrime for where that's actually applied) ----
  {
    key: 'rusty_revolver',
    name: 'Rusty Revolver',
    category: 'weapon',
    basePrice: 180,
    volatilityPercent: 2,
    sellRateMultiplier: 0.75,
    icon: 'crosshair',
  },
  {
    key: 'hunting_rifle',
    name: 'Hunting Rifle',
    category: 'weapon',
    basePrice: 420,
    volatilityPercent: 2,
    sellRateMultiplier: 0.75,
    icon: 'crosshair',
  },
  {
    key: 'pump_shotgun',
    name: 'Pump Shotgun',
    category: 'weapon',
    basePrice: 650,
    volatilityPercent: 2,
    sellRateMultiplier: 0.75,
    icon: 'crosshair',
  },
  {
    key: 'bowie_knife',
    name: 'Bowie Knife',
    category: 'weapon',
    basePrice: 90,
    volatilityPercent: 2,
    sellRateMultiplier: 0.75,
    icon: 'crosshair',
  },
];

const run = async () => {
  for (const job of JOBS) {
    await Job.findOneAndUpdate({ key: job.key }, { $set: job }, { upsert: true, setDefaultsOnInsert: true });
  }
  console.log(`[seed] Upserted ${JOBS.length} jobs`);

  for (const itemData of MARKET_ITEMS) {
    const item = await MarketItem.findOneAndUpdate(
      { key: itemData.key },
      { $set: itemData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await MarketPrice.findOneAndUpdate(
      { item: item._id },
      { $setOnInsert: { currentPrice: item.basePrice, previousPrice: item.basePrice } },
      { upsert: true }
    );
  }
  console.log(`[seed] Upserted ${MARKET_ITEMS.length} market items + prices`);
};

// Runnable directly (`npm run seed`) for a one-off/manual seed against
// whatever MONGODB_URI is configured, AND exported as a function so
// server.js can call it automatically on every boot — upserts are
// idempotent (matched by `key`), so calling this on a server that already
// has real admin-edited data just leaves those documents alone; it only
// fills in whatever is missing. This is what fixes a fresh/restarted
// deployment otherwise having zero jobs, zero market items, and a
// completely "dead" economy until someone remembers to run the script by
// hand.
if (require.main === module) {
  require('dotenv').config();
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('[seed] Connected to MongoDB'))
    .then(run)
    .then(() => mongoose.disconnect())
    .then(() => {
      console.log('[seed] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed] Failed:', err);
      process.exit(1);
    });
}

module.exports = { run, JOBS, MARKET_ITEMS };
