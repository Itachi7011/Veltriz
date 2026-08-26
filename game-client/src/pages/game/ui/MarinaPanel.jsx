import React from 'react';
import { Sailboat } from 'lucide-react';
import VehicleDealerPanel from './VehicleDealerPanel';

const MarinaPanel = ({ onClose }) => (
  <VehicleDealerPanel onClose={onClose} terrain="water" title="Marina" Icon={Sailboat} />
);

export default MarinaPanel;
