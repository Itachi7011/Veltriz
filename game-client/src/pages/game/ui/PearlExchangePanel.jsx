import React from 'react';
import { Gem } from 'lucide-react';
import CategoryTradePanel from './CategoryTradePanel';

/**
 * Sells the 'pearls' category — deliberately separate from the existing
 * Jeweler's 'luxury' category so it doesn't just retroactively show up at
 * every Jeweler in the city.
 */
const PearlExchangePanel = ({ onClose }) => (
  <CategoryTradePanel
    onClose={onClose}
    category="pearls"
    locationType="pearl_exchange"
    title="Pearl Divers' Guild"
    Icon={Gem}
    emptyMessage="The guild's cases are empty right now — check back later."
  />
);

export default PearlExchangePanel;
