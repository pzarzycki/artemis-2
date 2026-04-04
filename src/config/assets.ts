function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function assetUrl(path: string) {
  const baseUrl = normalizeBaseUrl(import.meta.env.BASE_URL || '/');
  const relativePath = path.replace(/^\/+/, '');
  return `${baseUrl}${relativePath}`;
}
