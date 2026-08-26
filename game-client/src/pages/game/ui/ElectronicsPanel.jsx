import React from 'react';
import { Cpu } from 'lucide-react';
import CategoryTradePanel from './CategoryTradePanel';

const ElectronicsPanel = ({ onClose }) => (
  <CategoryTradePanel
    onClose={onClose}
    category="electronics"
    locationType="electronics"
    title="Veltriz Electronics"
    Icon={Cpu}
    emptyMessage="Shelves are empty right now — check back later."
  />
);

export default ElectronicsPanel;
