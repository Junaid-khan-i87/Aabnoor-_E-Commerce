import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const failures = [];

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const vercel = JSON.parse(read('vercel.json'));
const routes = vercel.routes || [];
expect(
  routes.some((route) => route.src === '/shop' && route.dest === '/index.html'),
  'vercel.json must rewrite /shop to /index.html'
);

const sitemap = read('public/sitemap.xml');
expect(sitemap.includes('https://aabnoor.shop/shop'), 'sitemap must include /shop');
expect(!/\/product\/p\d+/.test(sitemap), 'sitemap must not include stale /product/p* URLs');
expect(sitemap.includes('/product/new-'), 'sitemap must include current /product/new-* URLs');

const sourceFiles = [
  'src/pages/pageContent.tsx',
  'src/pages/HomePage.tsx',
  'src/pages/ProductPage.tsx',
  'src/pages/CheckoutPage.tsx',
  'src/pages/LiveSaleHubPage.tsx',
  'src/components/Header.tsx',
  'src/components/Footer.tsx',
  'src/components/SocialGallery.tsx',
  'src/components/SearchBar.tsx',
  'src/components/SearchOverlay.tsx',
  'src/components/TrustBadges.tsx',
  'src/config.ts',
  'src/SiteContext.tsx',
  'src/data/categories.ts',
  'api/place-order.ts',
  'public/llms.txt',
];

const source = sourceFiles.map((path) => `${path}\n${read(path)}`).join('\n\n');
const banned = [
  /Aabnoor Moderne/i,
  /aabnoormoderne\.com/i,
  /October 2026/i,
  /contact@flenogarei\.resend\.app/i,
  /Backend Product Highlights/i,
  /Backend Tracking/i,
  /backend tracking number/i,
  /backend record/i,
  /The Aabnoor Observer/i,
  /Real reviews from product pages/i,
  /https:\/\/instagram\.com/i,
  /Flash Session Ended/i,
  /JazzCash/i,
  /EasyPaisa/i,
  /Easypaisa/i,
];

for (const pattern of banned) {
  expect(!pattern.test(source), `remove banned storefront text matching ${pattern}`);
}

expect(source.includes('support@aabnoor.shop'), 'support email must use support@aabnoor.shop');
expect(read('src/config.ts').includes('FREE_SHIPPING_THRESHOLD = 9999'), 'free shipping threshold must be Rs. 9999');
expect(read('api/place-order.ts').includes('freeShippingThreshold: 9999'), 'order API fallback threshold must be Rs. 9999');
expect(
  read('src/data/categories.ts').includes('.filter((category) => category.count > 0)'),
  'category helper must hide empty categories from storefront navigation'
);

if (failures.length > 0) {
  console.error(`Cleanup verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Cleanup verification passed.');
