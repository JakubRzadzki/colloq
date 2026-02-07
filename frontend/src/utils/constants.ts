/**
 * Shared constants for Colloq frontend.
 * Polish regions (voivodeships / województwa) - all 16 since 1999.
 */
export const POLISH_REGIONS = [
  'Dolnośląskie',
  'Kujawsko-Pomorskie',
  'Lubelskie',
  'Lubuskie',
  'Łódzkie',
  'Małopolskie',
  'Mazowieckie',
  'Opolskie',
  'Podkarpackie',
  'Podlaskie',
  'Pomorskie',
  'Śląskie',
  'Świętokrzyskie',
  'Warmińsko-Mazurskie',
  'Wielkopolskie',
  'Zachodniopomorskie',
] as const;

export type PolishRegion = (typeof POLISH_REGIONS)[number];
