// Netlify reads headers after its build command; keep script sources scoped to this deployment.
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function prepareSecurityHeaders(config, environment) {
  const values = ['URL', 'DEPLOY_PRIME_URL', 'DEPLOY_URL'].map(key => environment[key]).filter(Boolean);
  if (!values.length) throw new Error('Netlify deployment URLs are required for the script policy');
  const origins = [...new Set(values.map(value => {
    const url = new URL(value);
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if ((!/^[a-z0-9.-]+$/i.test(url.hostname) && !local) || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
      || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Invalid deployment origin for the script policy');
    }
    return url.origin;
  }))];
  const matches = [...config.matchAll(/Content-Security-Policy = "([^"\n]+)"/g)];
  if (matches.length !== 1) throw new Error('Expected one canonical Content-Security-Policy');
  const base = matches[0][1].split(';').map(rule => rule.trim()).filter(rule => rule && !rule.startsWith('script-src-elem '));
  const policy = [...base, `script-src-elem 'unsafe-inline' ${origins.map(origin => origin + '/assets/').join(' ')}`].join('; ');
  return config.replace(matches[0][0], `Content-Security-Policy = "${policy}"`);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = new URL('../netlify.toml', import.meta.url);
  writeFileSync(file, prepareSecurityHeaders(readFileSync(file, 'utf8'), process.env));
}
