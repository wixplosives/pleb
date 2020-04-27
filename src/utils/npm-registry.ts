import url from 'url';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { fetchText, isSecureUrl } from './http';
import { isObject } from './language-helpers';

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
    const distTags: unknown = JSON.parse(responseText);
    if (!isObject(distTags)) {
      throw new Error(`expected an object response, but got ${distTags}`);
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
        const packument: { versions: Record<string, string> } = JSON.parse(responseText);
        if (!isObject(packument)) {
          throw new Error(`expected an object response, but got ${packument}`);
        }
        if (!isObject(packument.versions)) {
          throw new Error(`expected "versions" to be an object, but got ${packument.versions}`);
        }
        const versions = Object.keys(packument.versions);
        return versions;
      } catch (parseError) {
        throw new Error(`${parseError?.stack ?? parseError}\nResponse is:\n${responseText}`);
      }
    } catch (error) {
      if (error?.statusCode === 404) {
        return [];
      } else {
        throw error;
      }
    }
  }

  public dispose() {
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

// https://github.com/npm/cli/blob/v6.13.7/lib/config/nerf-dart.js
export function uriToIdentifier(uri: string) {
  const parsed = url.parse(uri);
  delete parsed.protocol;
  delete parsed.auth;
  delete parsed.query;
  delete parsed.search;
  delete parsed.hash;

  return url.resolve(url.format(parsed), '.');
}
