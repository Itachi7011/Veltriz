import React from 'react';
import { Fish } from 'lucide-react';
import CategoryTradePanel from './CategoryTradePanel';

const FishMarketPanel = ({ onClose }) => (
  <CategoryTradePanel
    onClose={onClose}
    category="seafood"
    locationType="fish_market"
    title="Fish Market"
    Icon={Fish}
    emptyMessage="The ice tables are empty right now — check back later."
  />
);

export default FishMarketPanel;
