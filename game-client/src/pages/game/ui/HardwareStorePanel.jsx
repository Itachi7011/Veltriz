import React from 'react';
import { Wrench } from 'lucide-react';
import CategoryTradePanel from './CategoryTradePanel';

const HardwareStorePanel = ({ onClose }) => (
  <CategoryTradePanel
    onClose={onClose}
    category="tool"
    locationType="hardware_store"
    title="Veltriz Hardware Store"
    Icon={Wrench}
    emptyMessage="Shelves are bare right now — check back later."
  />
);

export default HardwareStorePanel;
