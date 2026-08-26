import React from 'react';
import { Shirt } from 'lucide-react';
import CategoryTradePanel from './CategoryTradePanel';

const BoutiquePanel = ({ onClose }) => (
  <CategoryTradePanel
    onClose={onClose}
    category="clothing"
    locationType="boutique"
    title="Veltriz Boutique"
    Icon={Shirt}
    emptyMessage="No new arrivals right now — check back later."
  />
);

export default BoutiquePanel;
