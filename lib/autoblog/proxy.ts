const ENGINE_URL = process.env.AUTOBLOG_ENGINE_URL ?? 'https://rfp-blog.vercel.app';
const API_KEY = process.env.AUTOBLOG_API_KEY ?? '';

export async function proxyToEngine(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${ENGINE_URL}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-autoblog-key': API_KEY,
      'Content-Type': 'application/json',
    },
  });
}

export function getEngineUrl(): string {
  return ENGINE_URL;
}
