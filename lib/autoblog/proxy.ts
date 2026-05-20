const ENGINE_URL = process.env.AUTOBLOG_ENGINE_URL ?? 'https://rfp-blog.vercel.app';
const API_KEY = process.env.AUTOBLOG_API_KEY ?? '';

export class EngineUnreachableError extends Error {
  constructor(cause: unknown) {
    super('Autoblog engine unreachable');
    this.name = 'EngineUnreachableError';
    this.cause = cause;
  }
}

export async function proxyToEngine(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${ENGINE_URL}${path}`;
  try {
    return await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-autoblog-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    throw new EngineUnreachableError(err);
  }
}

export function getEngineUrl(): string {
  return ENGINE_URL;
}
