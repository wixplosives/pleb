import http from 'http';
import https from 'https';
import { once } from 'events';
import { URL } from 'url';

export async function fetchText(url: string | URL, options: https.RequestOptions = {}) {
  const request = isSecureUrl(url) ? https.get(url, options) : http.get(url, options);
  const [response] = (await once(request, 'response')) as [http.IncomingMessage];
  const { statusCode } = response;
  if (statusCode !== 200) {
    response.resume();
    throw new FetchError(`HTTP ${statusCode}: failed fetching ${url}`, statusCode);
  }
  return readTextFromStream(response);
}

export async function readTextFromStream(readable: NodeJS.ReadableStream, encoding = 'utf8') {
  let text = '';
  readable.setEncoding(encoding);
  for await (const chunk of readable) {
    text += chunk;
  }
  return text;
}

export function isSecureUrl(url: string | URL): boolean {
  return url instanceof URL ? url.protocol === 'https' : url.startsWith('https://');
}

export class FetchError extends Error {
  constructor(message?: string, public statusCode?: number) {
    super(message);
    // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
