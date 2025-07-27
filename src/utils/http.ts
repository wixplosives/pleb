import http from 'node:http';
import https from 'node:https';
import { once } from 'node:events';

export async function fetchText(url: string | URL, options: https.RequestOptions = {}): Promise<string> {
  const request = isSecureUrl(url) ? https.get(url, options) : http.get(url, options);
  const [response] = (await once(request, 'response')) as [http.IncomingMessage];
  const { statusCode } = response;
  if (statusCode !== 200) {
    response.resume();
    throw new FetchError(`HTTP ${String(statusCode)}: failed fetching ${url.toString()}`, statusCode);
  }
  return readTextFromStream(response);
}

export async function readTextFromStream(
  readable: NodeJS.ReadableStream,
  encoding: BufferEncoding = 'utf8',
): Promise<string> {
  let text = '';
  readable.setEncoding(encoding);
  for await (const chunk of readable) {
    text += chunk as string;
  }
  return text;
}

export function isSecureUrl(url: string | URL): boolean {
  return url instanceof URL ? url.protocol === 'https:' : url.startsWith('https://');
}

export class FetchError extends Error {
  public statusCode;
  constructor(message?: string, statusCode?: number) {
    super(message);
    // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
  }
}
