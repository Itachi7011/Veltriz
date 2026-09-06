import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import GameEngine from './engine/GameEngine';
import gameEvents from './gameEvents';
import { useCharacter } from '../../context/CharacterContext';
import http from '../../lib/httpClient';
import { getAccessToken } from '../../utils/tokenStore';
import { enterFullscreen, exitFullscreen } from '../../utils/fullscreen';
import GameHUD from './ui/GameHUD';
import WeaponHUD from './ui/WeaponHUD';
import FpsCounter from './ui/FpsCounter';
import VehicleHUD from './ui/VehicleHUD';
import SubtitleBar from './ui/SubtitleBar';
import PoliticsPanel from './ui/PoliticsPanel';
import PhoneUI from './ui/PhoneUI';
import NewsTicker from './ui/NewsTicker';
import MiniMap from './ui/MiniMap';
import FullMap from './ui/FullMap';
import PauseMenu from './ui/PauseMenu';
import JobPanel from './ui/JobPanel';
import MarketPanel from './ui/MarketPanel';
import WalletPanel from './ui/WalletPanel';
import CrimePanel from './ui/CrimePanel';
import HospitalPanel from './ui/HospitalPanel';
import RestaurantPanel from './ui/RestaurantPanel';
import CityHallPanel from './ui/CityHallPanel';
import ParkPanel from './ui/ParkPanel';
import ElectronicsPanel from './ui/ElectronicsPanel';
import BoutiquePanel from './ui/BoutiquePanel';
import JewelerPanel from './ui/JewelerPanel';
import GymPanel from './ui/GymPanel';
import CasinoPanel from './ui/CasinoPanel';
import StockExchangePanel from './ui/StockExchangePanel';
import SchoolPanel from './ui/SchoolPanel';
import RealEstatePanel from './ui/RealEstatePanel';
import PoliceStationPanel from './ui/PoliceStationPanel';
import CinemaPanel from './ui/CinemaPanel';
import FactoryPanel from './ui/FactoryPanel';
import CreditUnionPanel from './ui/CreditUnionPanel';
import InsuranceOfficePanel from './ui/InsuranceOfficePanel';
import LotteryPanel from './ui/LotteryPanel';
import CourthousePanel from './ui/CourthousePanel';
import UniversityPanel from './ui/UniversityPanel';
import LogisticsHubPanel from './ui/LogisticsHubPanel';
import GovernmentComplexPanel from './ui/GovernmentComplexPanel';
import HardwareStorePanel from './ui/HardwareStorePanel';
import TradingPostPanel from './ui/TradingPostPanel';
import EmbassyPanel from './ui/EmbassyPanel';
import TechCampusPanel from './ui/TechCampusPanel';
import QuantumLabsPanel from './ui/QuantumLabsPanel';
import GunStorePanel from './ui/GunStorePanel';
import FarmPanel from './ui/FarmPanel';
import PortAuthorityPanel from './ui/PortAuthorityPanel';
import FishMarketPanel from './ui/FishMarketPanel';
import PearlExchangePanel from './ui/PearlExchangePanel';
import AutoDockMotorsPanel from './ui/AutoDockMotorsPanel';
import MarinaPanel from './ui/MarinaPanel';
import FishingWharfPanel from './ui/FishingWharfPanel';
import OilRigPanel from './ui/OilRigPanel';
import MarineResearchPanel from './ui/MarineResearchPanel';
import SmugglersDenPanel from './ui/SmugglersDenPanel';
import ChronoStorePanel from './ui/ChronoStorePanel';
import HousePanel from './ui/HousePanel';
import LoadingScreen from '../../components/shared/LoadingScreen';
import './Game.css';

// See SocketContext.jsx for why sockets (unlike every REST call in this
// app) need a real URL instead of a relative path: Netlify can't proxy
// WebSocket upgrades through redirects. Set VITE_GAME_WORLD_SERVICE_URL at
// build time for production; the localhost default just works in dev.
const GAME_WORLD_URL = import.meta.env.VITE_GAME_WORLD_SERVICE_URL || 'http://localhost:5002';

const GamePage = () => {
  const navigate = useNavigate();
  const { character, isLoading: characterLoading, checked } = useCharacter();
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const socketRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [nearbyBuilding, setNearbyBuilding] = useState(null); // 'job_center' | 'market' | 'bank' | 'home' | null
  const [nearbyHouse, setNearbyHouse] = useState(null); // { id, name } | null — a purchasable house, not the starter 'home' building above
  const [activeHouse, setActiveHouse] = useState(null); // snapshot of nearbyHouse taken when its panel opens, so it doesn't change under the panel if the player walks off
  const [crimeOpportunity, setCrimeOpportunity] = useState(null); // { actionKey, label } | null — set only while physically at a matching crime location
  const [openPanel, setOpenPanel] = useState(null);
  const [mapConfig, setMapConfig] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // A logged-in user with no character yet shouldn't land here directly
  useEffect(() => {
    if (checked && !characterLoading && !character) {
      navigate('/create-character', { replace: true });
    }
  }, [checked, characterLoading, character, navigate]);

  // ---- Boot Phaser once map config + character are ready ----
  useEffect(() => {
    if (!character) return;
    let destroyed = false;

    const boot = async () => {
      const {
        data: { map },
      } = await http.get(`/api/world/map/${character.mapId || 'delhi_cp_district'}`);
      if (destroyed) return;
      setMapConfig(map);

      const socket = io(GAME_WORLD_URL, {
        auth: { token: getAccessToken() },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      const engine = new GameEngine({ container: containerRef.current, mapConfig: map, character, socket });
      gameRef.current = engine;

      setIsLoading(false);
      enterFullscreen();
    };

    boot();

    return () => {
      destroyed = true;
      gameRef.current?.destroy();
      gameRef.current = null;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id]);

  // ---- Building proximity prompt ----
  useEffect(() => {
    const onEnter = ({ type }) => setNearbyBuilding(type);
    const onLeave = () => setNearbyBuilding(null);
    gameEvents.on('building:enter', onEnter);
    gameEvents.on('building:leave', onLeave);
    return () => {
      gameEvents.off('building:enter', onEnter);
      gameEvents.off('building:leave', onLeave);
    };
  }, []);

  // ---- House proximity prompt — any of the 100+ purchasable houses,
  // separate from the 'home' building above since each house is its own
  // individually-named/owned place rather than one shared building type. ----
  useEffect(() => {
    const onEnter = (house) => setNearbyHouse(house);
    const onLeave = () => setNearbyHouse(null);
    gameEvents.on('house:enter', onEnter);
    gameEvents.on('house:leave', onLeave);
    return () => {
      gameEvents.off('house:enter', onEnter);
      gameEvents.off('house:leave', onLeave);
    };
  }, []);

  // ---- Crime location proximity (which crime, if any, you're physically
  // standing at right now) + getting caught by a police NPC mid-chase ----
  useEffect(() => {
    const onOpportunity = (opp) => setCrimeOpportunity(opp);
    const onBusted = () => {
      setOpenPanel(null);
      Swal.fire({
        icon: 'error',
        title: 'Busted!',
        text: "An officer caught up with you — better lay low for a bit.",
        timer: 2600,
        showConfirmButton: false,
      });
    };
    gameEvents.on('crime:opportunity', onOpportunity);
    gameEvents.on('crime:busted', onBusted);
    return () => {
      gameEvents.off('crime:opportunity', onOpportunity);
      gameEvents.off('crime:busted', onBusted);
    };
  }, []);

  // ---- Politics panel (G) and phone (P) — driven by the 3D engine ----
  useEffect(() => {
    const onOpenPolitics = () => setOpenPanel((p) => (p ? p : 'politics'));
    const onPhoneToggle = (using) => setOpenPanel(using ? 'phone' : (p) => (p === 'phone' ? null : p));
    gameEvents.on('ui:openPolitics', onOpenPolitics);
    gameEvents.on('phone:toggle', onPhoneToggle);
    return () => {
      gameEvents.off('ui:openPolitics', onOpenPolitics);
      gameEvents.off('phone:toggle', onPhoneToggle);
    };
  }, []);

  // However the phone panel closes (Escape, the X button, switching to a
  // different panel) the engine needs to know so it can drop the "phone
  // to ear" pose — otherwise pressing P again silently no-ops because the
  // engine still thinks the phone is out.
  useEffect(() => {
    if (openPanel !== 'phone') gameRef.current?.closePhone();
  }, [openPanel]);

  const pauseGame = useCallback(() => {
    gameRef.current?.pause();
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    gameRef.current?.resume();
    setIsPaused(false);
  }, []);

  const exitToMenu = useCallback(async () => {
    await exitFullscreen();
    gameRef.current?.destroy();
    socketRef.current?.disconnect();
    navigate('/');
  }, [navigate]);

  // ---- Freeze player movement + release the mouse whenever any panel or
  // the full map is open, so you can't wander around blind behind a modal
  // and the cursor is free to click UI instead of steering the camera. ----
  useEffect(() => {
    gameRef.current?.setInputEnabled(!openPanel && !isMapOpen && !isPaused);
  }, [openPanel, isMapOpen, isPaused]);

  // ---- Escape key: close map, then a panel, then toggle pause menu ----
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isMapOpen) {
        setIsMapOpen(false);
        return;
      }
      if (openPanel) {
        setOpenPanel(null);
        return;
      }
      isPaused ? resumeGame() : pauseGame();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPaused, isMapOpen, openPanel, pauseGame, resumeGame]);

  // ---- 'E' or 'Enter' to interact with a nearby building — both do the
  // exact same thing; Enter is the more familiar key for a lot of players
  // coming from other games, so either works everywhere the other does. ----
  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if ((key !== 'e' && key !== 'enter') || isPaused || isMapOpen) return;
      if (nearbyBuilding) {
        setOpenPanel(nearbyBuilding);
      } else if (nearbyHouse) {
        setActiveHouse(nearbyHouse);
        setOpenPanel('house');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nearbyBuilding, nearbyHouse, isPaused, isMapOpen]);

  // ---- Smugglers' Cove's "Open the Crime menu" shortcut button emits this
  // instead of calling setOpenPanel directly, since it lives in a
  // standalone panel component with no access to this state. ----
  useEffect(() => {
    const onOpenCrimeMenu = () => setOpenPanel('crime');
    gameEvents.on('open-crime-menu', onOpenCrimeMenu);
    return () => gameEvents.off('open-crime-menu', onOpenCrimeMenu);
  }, []);

  // ---- 'M' toggles the full map, 'C' opens the crime menu — both global,
  // standard game shortcuts that don't require being near any building
  // (crime can happen anywhere in the world, and checking the map is
  // always available). ----
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isPaused) return;
      const key = e.key.toLowerCase();
      if (key === 'm') {
        setIsMapOpen((open) => !open);
        setOpenPanel(null);
      } else if (key === 'c' && !isMapOpen) {
        setOpenPanel((p) => (p === 'crime' ? null : 'crime'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPaused, isMapOpen]);

  const buildingLabel = {
    job_center: 'Job Center',
    market: 'Central Market',
    bank: 'Bank',
    home: 'Home',
    hospital: 'Hospital',
    restaurant: 'Restaurant',
    city_hall: 'City Hall',
    park: 'Park',
    electronics: 'Electronics Store',
    boutique: 'Boutique',
    jeweler: 'Jeweler',
    gym: 'Gym',
    casino: 'Casino',
    stock_exchange: 'Stock Exchange',
    school: 'School',
    real_estate: 'Real Estate Agency',
    police_station: 'Police Station',
    cinema: 'Cinema',
    factory: 'Factory',
    credit_union: 'Credit Union',
    insurance_office: 'Insurance Office',
    lottery: 'Lottery',
    courthouse: 'Courthouse',
    university: 'University',
    logistics_hub: 'Logistics Hub',
    government_complex: 'Government Complex',
    hardware_store: 'Hardware Store',
    trading_post: 'Trading Post',
    embassy: 'Embassy',
    tech_campus: 'Tech Campus',
    quantum_labs: 'Quantum Labs',
    gun_store: 'Gun Store',
    farm: 'Farm',
    port_authority: 'Port Haven Authority',
    fish_market: 'Fish Market',
    pearl_exchange: "Pearl Divers' Guild",
    vehicle_dealer: 'AutoDock Motors',
    marina: 'Marina',
    fishing_wharf: 'Fishing Wharf',
    oil_rig: 'Offshore Oil Platform',
    marine_research: 'Deepwater Research Institute',
    smugglers_den: "Smugglers' Cove",
  };

  if (!character) {
    return <LoadingScreen />;
  }

  return (
    <div className="veltriz-game-shell">
      <div id="veltriz-phaser-container" ref={containerRef} className="veltriz-game-canvas-host" />

      {isLoading && (
        <div className="veltriz-game-loading">
          <div className="veltriz-game-loading-spinner" />
          <p>Loading Veltriz…</p>
        </div>
      )}

      {!isLoading && (
        <>
          <GameHUD onOpenChronoStore={() => setOpenPanel('chrono_store')} />
          <NewsTicker />
          <MiniMap mapConfig={mapConfig} onExpand={() => setIsMapOpen(true)} />

          {nearbyBuilding && !openPanel && !isPaused && !isMapOpen && (
            <div className="veltriz-game-interact-prompt">
              Press <kbd>E</kbd> / <kbd>Enter</kbd> to enter {buildingLabel[nearbyBuilding] || nearbyBuilding}
            </div>
          )}

          {!nearbyBuilding && nearbyHouse && !openPanel && !isPaused && !isMapOpen && (
            <div className="veltriz-game-interact-prompt">
              Press <kbd>E</kbd> / <kbd>Enter</kbd> to enter {nearbyHouse.name}
            </div>
          )}

          {crimeOpportunity && !openPanel && !isPaused && !isMapOpen && (
            <div className="veltriz-game-interact-prompt veltriz-game-interact-prompt-crime">
              Press <kbd>C</kbd> — you can attempt something here
            </div>
          )}

          {!openPanel && !isPaused && !isMapOpen && (
            <div className="veltriz-game-camera-hint">
              <kbd>V</kbd> camera &nbsp;·&nbsp; <kbd>Shift</kbd> run &nbsp;·&nbsp; <kbd>Space</kbd> jump &nbsp;·&nbsp; <kbd>Q</kbd> skateboard &nbsp;·&nbsp; <kbd>F</kbd> vehicle &nbsp;·&nbsp; <kbd>G</kbd> gather &nbsp;·&nbsp; <kbd>P</kbd> phone &nbsp;·&nbsp; <kbd>1-6</kbd> weapons
            </div>
          )}

          {!openPanel && !isPaused && !isMapOpen && <WeaponHUD />}
          <FpsCounter />
          {!openPanel && !isPaused && !isMapOpen && <VehicleHUD />}
          {!isPaused && !isMapOpen && <SubtitleBar />}

          {isMapOpen && mapConfig && <FullMap mapConfig={mapConfig} onClose={() => setIsMapOpen(false)} />}

          {openPanel === 'job_center' && <JobPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'market' && <MarketPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'bank' && <WalletPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'crime' && <CrimePanel onClose={() => setOpenPanel(null)} activeOpportunity={crimeOpportunity} />}
          {openPanel === 'politics' && <PoliticsPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'phone' && <PhoneUI onClose={() => setOpenPanel(null)} />}
          {openPanel === 'hospital' && <HospitalPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'restaurant' && <RestaurantPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'city_hall' && <CityHallPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'park' && <ParkPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'electronics' && <ElectronicsPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'boutique' && <BoutiquePanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'jeweler' && <JewelerPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'gym' && <GymPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'casino' && <CasinoPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'stock_exchange' && <StockExchangePanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'school' && <SchoolPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'real_estate' && <RealEstatePanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'police_station' && <PoliceStationPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'cinema' && <CinemaPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'factory' && <FactoryPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'credit_union' && <CreditUnionPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'insurance_office' && <InsuranceOfficePanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'lottery' && <LotteryPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'courthouse' && <CourthousePanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'university' && <UniversityPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'logistics_hub' && <LogisticsHubPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'government_complex' && <GovernmentComplexPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'hardware_store' && <HardwareStorePanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'trading_post' && <TradingPostPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'embassy' && <EmbassyPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'tech_campus' && <TechCampusPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'quantum_labs' && <QuantumLabsPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'gun_store' && <GunStorePanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'farm' && <FarmPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'port_authority' && <PortAuthorityPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'fish_market' && <FishMarketPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'pearl_exchange' && <PearlExchangePanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'vehicle_dealer' && <AutoDockMotorsPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'marina' && <MarinaPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'fishing_wharf' && <FishingWharfPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'oil_rig' && <OilRigPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'marine_research' && <MarineResearchPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'smugglers_den' && <SmugglersDenPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'chrono_store' && <ChronoStorePanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'home' && <HousePanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'house' && activeHouse && (
            <HousePanel onClose={() => setOpenPanel(null)} houseId={activeHouse.id} houseName={activeHouse.name} />
          )}

          {isPaused && <PauseMenu onResume={resumeGame} onExit={exitToMenu} />}
        </>
      )}
    </div>
  );
};

export default GamePage;
