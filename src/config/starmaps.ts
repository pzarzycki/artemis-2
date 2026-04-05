import { assetUrl } from './assets';

export type StarMapResolution = '4k' | '8k' | '16k';
export type StarMapLayer = 'starmap' | 'hiptyc' | 'milkyway';

export const STAR_MAP_OPTIONS: readonly StarMapResolution[] = ['4k', '8k', '16k'] as const;
export const STAR_MAP_LAYER_OPTIONS: readonly StarMapLayer[] = ['starmap', 'hiptyc', 'milkyway'] as const;
export const STAR_MAP_LAYER_LABELS: Record<StarMapLayer, string> = {
  starmap: 'Combined',
  hiptyc: 'Bright Stars',
  milkyway: 'Milky Way',
};

export function getStarMapPath(layer: StarMapLayer, resolution: StarMapResolution) {
  return assetUrl(`starmaps/${layer}_2020_${resolution}.exr`);
}
