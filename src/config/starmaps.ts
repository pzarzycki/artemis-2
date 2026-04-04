export type StarMapResolution = '4k' | '8k' | '16k';

export const STAR_MAP_OPTIONS: readonly StarMapResolution[] = ['4k', '8k', '16k'] as const;

export function getStarMapPath(resolution: StarMapResolution) {
  return `/starmaps/starmap_2020_${resolution}.exr`;
}
