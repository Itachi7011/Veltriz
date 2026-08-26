import React from 'react';
import { Stethoscope } from 'lucide-react';
import CategoryShopPanel from './CategoryShopPanel';

const HospitalPanel = ({ onClose }) => (
  <CategoryShopPanel
    onClose={onClose}
    category="medicine"
    locationType="hospital"
    title="Veltriz General Hospital"
    Icon={Stethoscope}
    emptyMessage="No treatments available right now — check back later."
  />
);

export default HospitalPanel;
