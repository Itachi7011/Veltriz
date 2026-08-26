import React from 'react';
import { Utensils } from 'lucide-react';
import CategoryShopPanel from './CategoryShopPanel';

const RestaurantPanel = ({ onClose }) => (
  <CategoryShopPanel
    onClose={onClose}
    category="food"
    locationType="restaurant"
    title="Veltriz Diner"
    Icon={Utensils}
    emptyMessage="Kitchen's empty right now — check back later."
  />
);

export default RestaurantPanel;
