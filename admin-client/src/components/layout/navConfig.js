import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  Wallet,
  Store,
  Briefcase,
  TrendingUp,
  ScrollText,
  Settings,
  UserCog,
  KeyRound,
  Globe,
  Zap,
  Bot,
  Newspaper,
  VenetianMask,
  Flame,
  Gem,
  Receipt,
} from 'lucide-react';

/**
 * Each node is either:
 *  - a LEAF: { label, icon, path } — has a real route, renders as a Link
 *  - a GROUP: { label, icon, children: [...] } — no route, just toggles
 *    its children open/closed. Groups can nest inside groups (see
 *    "Economy" > "Market" below) to satisfy the "some nested dropdown
 *    options" requirement.
 */
export const NAV_CONFIG = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    label: 'Players',
    icon: Users,
    children: [
      { label: 'All players', icon: Users, path: '/users' },
      { label: 'Suspended', icon: UserX, path: '/users?status=suspended' },
      { label: 'Active', icon: UserCheck, path: '/users?status=active' },
    ],
  },
  {
    label: 'Economy',
    icon: Wallet,
    children: [
      { label: 'Overview', icon: TrendingUp, path: '/economy' },
      { label: 'Wallets', icon: Wallet, path: '/economy/wallets' },
      { label: 'Jobs', icon: Briefcase, path: '/economy/jobs' },
      {
        label: 'Market',
        icon: Store,
        children: [
          { label: 'Items & Prices', icon: Store, path: '/economy/market-items' },
        ],
      },
      {
        label: 'Chrono Shards',
        icon: Gem,
        children: [
          { label: 'Chrono Store', icon: Gem, path: '/economy/chrono-store' },
          { label: 'Purchases', icon: Receipt, path: '/economy/chrono-purchases' },
        ],
      },
    ],
  },
  { label: 'Audit Logs', icon: ScrollText, path: '/logs' },
  {
    label: 'World',
    icon: Globe,
    children: [
      { label: 'World Events', icon: Zap, path: '/world/events' },
      { label: 'Population (NPCs)', icon: Bot, path: '/world/population' },
      { label: 'News Feed', icon: Newspaper, path: '/world/news' },
    ],
  },
  {
    label: 'Crime',
    icon: VenetianMask,
    children: [
      { label: 'Crime Actions', icon: VenetianMask, path: '/crime/actions' },
      { label: 'Player Heat', icon: Flame, path: '/crime/heat' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'Profile', icon: UserCog, path: '/settings/profile' },
      { label: 'Security', icon: KeyRound, path: '/settings/security' },
    ],
  },
];
