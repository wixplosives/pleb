import http from 'http';
import https from 'https';
import { once } from 'events';

export async function fetchText(url: string, options: http.RequestOptions | https.RequestOptions = {}) {
    const request = url.startsWith('https://') ? https.get(url, options) : http.get(url, options);
    const [response] = (await once(request, 'response')) as [http.IncomingMessage];
    const { statusCode, headers } = response;
    if (statusCode !== 200) {
        response.resume();
        throw new Error(`HTTP ${statusCode}: failed fetching ${url}`);
    }
    const { 'content-type': contentType } = headers;
    if (!contentType || !isTextualContentType(contentType)) {
        response.resume();
        throw new Error(`expected textual content-type, but got ${contentType}`);
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

export function isTextualContentType(contentType: string) {
    return (
        contentType.startsWith('text/') ||
        contentType.startsWith('application/javascript') ||
        contentType.startsWith('application/json')
    );
}
