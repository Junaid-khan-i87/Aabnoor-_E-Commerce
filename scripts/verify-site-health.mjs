import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const appSource = read('src/App.tsx');
const vercelConfig = JSON.parse(read('vercel.json'));
const packageJson = JSON.parse(read('package.json'));

const routeMatches = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
const routePaths = routeMatches
  .filter((route) => !route.includes(':'))
  .filter((route) => route !== '/');
const rewriteRoutes = new Set((vercelConfig.routes || []).map((route) => route.src));
const missingRewrites = routePaths.filter((route) => !rewriteRoutes.has(route));

const headerKeys = new Set((vercelConfig.headers?.[0]?.headers || []).map((header) => header.key));
const requiredHeaders = [
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Content-Security-Policy',
];
const missingHeaders = requiredHeaders.filter((header) => !headerKeys.has(header));

const scanFiles = [
  'src',
  'api',
].flatMap((entry) => {
  const fullPath = path.join(root, entry);
  const files = [];
  const walk = (dir) => {
    for (const child of fs.readdirSync(dir, { withFileTypes: true })) {
      const childPath = path.join(dir, child.name);
      if (child.isDirectory()) {
        walk(childPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(child.name)) {
        files.push(childPath);
      }
    }
  };
  walk(fullPath);
  return files;
});

const hazards = [
  { name: 'dangerouslySetInnerHTML', pattern: /dangerouslySetInnerHTML/ },
  { name: 'innerHTML', pattern: /\.innerHTML\s*=/ },
  { name: 'eval', pattern: /\beval\s*\(/ },
  { name: 'browser confirm', pattern: /\bconfirm\s*\(/ },
  { name: 'blank target without noopener', pattern: /target=["']_blank["'](?![^>]*rel=["'][^"']*noopener)/ },
];
const hazardHits = [];
for (const file of scanFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const hazard of hazards) {
    if (hazard.pattern.test(text)) {
      hazardHits.push(`${path.relative(root, file)}: ${hazard.name}`);
    }
  }
}

const failures = [
  ...missingRewrites.map((route) => `Missing vercel rewrite for ${route}`),
  ...missingHeaders.map((header) => `Missing security header ${header}`),
  ...hazardHits.map((hit) => `Unsafe frontend/API pattern: ${hit}`),
];

console.log(`Aabnoor health check`);
console.log(`Routes checked: ${routePaths.length}`);
console.log(`Security headers checked: ${requiredHeaders.length}`);
console.log(`Package scripts available: ${Object.keys(packageJson.scripts || {}).sort().join(', ')}`);

if (failures.length) {
  console.error('\nFailures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Health check passed.');
