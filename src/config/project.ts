const defaultSiteUrl = 'https://pzarzycki.github.io/artemis-2/';
const defaultSourceUrl = 'https://github.com/pzarzycki/artemis-2';

export const projectConfig = {
  title: 'Artemis II Tracker',
  siteUrl: import.meta.env.VITE_APP_URL || defaultSiteUrl,
  sourceUrl: import.meta.env.VITE_SOURCE_URL || defaultSourceUrl,
} as const;
