import React from 'react';
import { Flame } from 'lucide-react';
import CategoryTradePanel from './CategoryTradePanel';

/**
 * Sells the crude_oil category (distinct from the city-wide 'oil_barrel'
 * commodity — this is the raw, riskier-to-hold input) and hosts the
 * offshore_energy career track (Roughneck -> Rig Supervisor -> Platform
 * Manager) via CategoryTradePanel's built-in LocationCareers.
 */
const OilRigPanel = ({ onClose }) => (
  <CategoryTradePanel
    onClose={onClose}
    category="crude_oil"
    locationType="oil_rig"
    title="Offshore Oil Platform"
    Icon={Flame}
    emptyMessage="No crude coming up the pipe right now — check back later."
  />
);

export default OilRigPanel;
