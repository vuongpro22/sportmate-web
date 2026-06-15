/** Base URL API for web app */
export function getApiBaseUrl(): string {
  // Check if there is an env variable (Vite uses import.meta.env)
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');

  return 'http://localhost:3000';
}
