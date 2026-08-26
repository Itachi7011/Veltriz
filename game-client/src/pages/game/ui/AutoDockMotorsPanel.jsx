import React from 'react';
import { Car } from 'lucide-react';
import VehicleDealerPanel from './VehicleDealerPanel';

const AutoDockMotorsPanel = ({ onClose }) => (
  <VehicleDealerPanel onClose={onClose} terrain="land" title="AutoDock Motors" Icon={Car} />
);

export default AutoDockMotorsPanel;
