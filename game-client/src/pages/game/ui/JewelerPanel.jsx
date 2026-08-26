import React from 'react';
import { Gem } from 'lucide-react';
import CategoryTradePanel from './CategoryTradePanel';

const JewelerPanel = ({ onClose }) => (
  <CategoryTradePanel
    onClose={onClose}
    category="luxury"
    locationType="jeweler"
    title="Veltriz Jeweler"
    Icon={Gem}
    emptyMessage="The display cases are empty right now — check back later."
  />
);

export default JewelerPanel;
