import url from 'url';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { isPlainObject } from '@wixc3/resolve-directory-context';
import { fetchText, isSecureUrl, FetchError } from './http.js';

export const officialNpmRegistryUrl = 'https://registry.npmjs.org/';

export interface NpmRegistryDistTags {
  latest: string;
  [tag: string]: string | undefined;
}

export class NpmRegistry {
  agent?: http.Agent | https.Agent;
  constructor(public url: string, private token?: string) {}

  public async fetchDistTags(packageName: string): Promise<NpmRegistryDistTags> {
    this.ensureAgent();
    const { url, token, agent } = this;
    const options: https.RequestOptions = { agent };
    if (token) {
      options.headers = { authorization: `Bearer ${token}` };
    }
    const responseText = await fetchText(new URL(`-/package/${packageName}/dist-tags`, url), options);
    const distTags = JSON.parse(responseText) as unknown;
    if (!isPlainObject(distTags)) {
      throw new Error(`expected an object response, but got ${String(distTags)}`);
    }

    return distTags as NpmRegistryDistTags;
  }

  public async fetchVersions(packageName: string): Promise<string[]> {
    this.ensureAgent();
    const { url, token, agent } = this;

    try {
      const options: https.RequestOptions = { agent };
      if (token) {
        options.headers = { authorization: `Bearer ${token}` };
      }
      const responseText = await fetchText(new URL(packageName, url), options);

      try {
        const packument = JSON.parse(responseText) as { versions: Record<string, string> };
        if (!isPlainObject(packument)) {
          throw new Error(`expected an object response, but got ${String(packument)}`);
        }
        if (!isPlainObject(packument.versions)) {
          throw new Error(`expected "versions" to be an object, but got ${String(packument.versions)}`);
        }
        const versions = Object.keys(packument.versions);
        return versions;
      } catch (parseError) {
        throw new Error(`${(parseError as Error)?.stack ?? String(parseError)}\nResponse is:\n${responseText}`);
      }
    } catch (error) {
      if ((error as FetchError)?.statusCode === 404) {
        return [];
      } else {
        throw error;
      }
    }
  }

  public dispose(): void {
    if (this.agent) {
      this.agent.destroy();
    }
    this.agent = undefined;
  }

  private ensureAgent() {
    if (!this.agent) {
      this.agent = isSecureUrl(this.url) ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });
    }
  }
}

// https://github.com/npm/cli/blob/release-v6.14.8/lib/config/nerf-dart.js
export function uriToIdentifier(uri: string): string {
  const parsed = url.parse(uri);
  parsed.protocol = null;
  parsed.auth = null;
  parsed.query = null;
  parsed.search = null;
  parsed.hash = null;

  return url.resolve(url.format(parsed), '.');
}
