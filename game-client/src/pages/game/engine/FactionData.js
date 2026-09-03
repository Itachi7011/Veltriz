/**
 * Entirely fictional factions native to Veltriz. Political parties here
 * extend the game's own existing election system (see game-world-service
 * Government/Election models) — never real-world parties or people.
 * Gangs are original names invented for this game, not references to any
 * real criminal organization.
 */

export const POLITICAL_PARTIES = [
  { key: 'unity', name: 'Veltriz Unity Party', short: 'VUP', color: '#2563eb', emblem: 'star' },
  { key: 'reform', name: 'Meridian Reform Bloc', short: 'MRB', color: '#dc2626', emblem: 'torch' },
  { key: 'progress', name: 'Harborlight Progress Coalition', short: 'HPC', color: '#16a34a', emblem: 'leaf' },
];

export const GANGS = [
  { key: 'ironclaw', name: 'Ironclaw Crew', color: '#94a3b8', emblem: 'claw' },
  { key: 'redtide', name: 'Redtide Syndicate', color: '#b91c1c', emblem: 'wave' },
  { key: 'duskrunners', name: 'Dusk Runners', color: '#7c3aed', emblem: 'bolt' },
];

export function twoRivals(list) {
  const a = list[Math.floor(Math.random() * list.length)];
  let b = list[Math.floor(Math.random() * list.length)];
  while (b.key === a.key) b = list[Math.floor(Math.random() * list.length)];
  return [a, b];
}
