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
    ],
  },
  { label: 'Audit Logs', icon: ScrollText, path: '/logs' },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'Profile', icon: UserCog, path: '/settings/profile' },
      { label: 'Security', icon: KeyRound, path: '/settings/security' },
    ],
  },
];
