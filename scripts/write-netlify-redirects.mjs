import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const backendOrigin = normalizeOrigin(
  process.env.NETLIFY_BACKEND_API_ORIGIN || 'https://fikingtrader-slnnd.ondigitalocean.app'
);
const aiOrigin = normalizeOrigin(
  process.env.NETLIFY_AI_SERVICE_ORIGIN || 'http://159.65.115.78:5000'
);

const distDir = resolve(process.cwd(), 'dist');
const redirectsPath = resolve(distDir, '_redirects');

const redirects = [
  `/ai/* ${aiOrigin}/ai/:splat 200!`,
  `/api/* ${backendOrigin}/api/:splat 200!`,
  '/* /index.html 200'
].join('\n') + '\n';

mkdirSync(distDir, { recursive: true });
writeFileSync(redirectsPath, redirects, 'utf8');

function normalizeOrigin(value) {
  return value.replace(/\/+$/, '');
}
