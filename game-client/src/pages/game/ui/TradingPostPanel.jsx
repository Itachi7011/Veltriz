import React from 'react';
import { Package } from 'lucide-react';
import CategoryTradePanel from './CategoryTradePanel';

const TradingPostPanel = ({ onClose }) => (
  <CategoryTradePanel
    onClose={onClose}
    category="commodity"
    locationType="trading_post"
    title="Veltriz Trading Post"
    Icon={Package}
    emptyMessage="No commodities on hand right now — check back later."
  />
);

export default TradingPostPanel;
