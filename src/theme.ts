// Sleek racing-game theme — Hot Wheels / Beach Buggy direction.
// Approved by Dhruv 2026-11-06 from the mockup (kids-car-racing-sleek-ui-mockup):
// glossy 3D cars, dark glass HUD, orange + gold on near-black. No pale
// app-like surfaces anywhere: every screen sits on the same dark asphalt
// background, and PLAY is the one giant orange button a kid's thumb finds first.

export const SLEEK = {
  bg: '#07080C',
  bg2: '#10131C',
  panel: '#161B28',
  panel2: '#1E2536',
  line: 'rgba(255,255,255,0.12)',
  lineStrong: 'rgba(255,255,255,0.22)',
  text: '#F2F4F8',
  muted: '#9AA3B5',
  mutedLight: '#C7CEDE',
  orange: '#FF7A1A',
  orangeDeep: '#E04E00',
  orangeDark: '#8F3200',
  orangeLight: '#FFB03A',
  gold: '#FFC531',
  goldLight: '#FFE9A8',
  cyan: '#2FD8FF',
  cyanDeep: '#0E9FD0',
  green: '#37D67A',
  greenDeep: '#15803D',
  red: '#FF3B30',
  glass: 'rgba(10,12,20,0.62)',
  glassLight: 'rgba(255,255,255,0.07)',
  card: 'rgba(255,255,255,0.06)',
  cardSelected: 'rgba(255,197,49,0.14)',
  goldBorder: '#FFC531',
} as const;

/** Dark asphalt screen background (Home / Garage / Results base). */
export const SLEEK_BG = ['#0B0D13', '#12151F', '#07080C'] as const;

/** Giant orange PLAY button gradient (top highlight -> orange -> deep). */
export const PLAY_GRADIENT = ['#FFA03A', '#FF6A00', '#E04E00'] as const;

/** Gold title gradient for "YOU WIN!" style headings. */
export const GOLD_GRADIENT = ['#FFE9A8', '#FFC531', '#FF8A00'] as const;
