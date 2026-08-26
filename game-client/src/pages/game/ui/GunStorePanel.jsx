import React from 'react';
import { Crosshair } from 'lucide-react';
import CategoryTradePanel from './CategoryTradePanel';

/**
 * Weapons are collectible/tradeable items (buy/sell, like electronics or
 * luxury goods) — no consumable effect. Owning one gives a real, if modest,
 * bonus to crime success chance (see crime-service's attemptCrime), which
 * is checked server-side by ownership, not anything this panel does.
 */
const GunStorePanel = ({ onClose }) => (
  <CategoryTradePanel
    onClose={onClose}
    category="weapon"
    locationType="gun_store"
    title="Dustridge Gun Store"
    Icon={Crosshair}
    emptyMessage="Cases are empty right now — check back later."
  />
);

export default GunStorePanel;
