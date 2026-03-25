import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Configuration

const BASE_URL = 'http://localhost';

const searchErrorRate   = new Rate('search_error_rate');
const productErrorRate  = new Rate('product_error_rate');
const emptySearchRate   = new Rate('empty_search_rate');
const searchDuration    = new Trend('search_duration_ms', true);
const productDuration   = new Trend('product_duration_ms', true);


const PRODUCT_ENDPOINTS = [
  '/build-your-own-computer',
  '/digital-storm-vanquish-custom-performance-pc',
  '/lenovo-ideacentre',
  '/apple-macbook-pro',
  '/asus-laptop',
  '/samsung-premium-ultrabook',
  '/hp-spectre-xt-pro-ultrabook',
  '/hp-envy-156-inch-sleekbook',
  '/lenovo-thinkpad-carbon-laptop',
  '/apple-iphone-16-128gb',
  '/samsung-galaxy-s24-256gb',
  '/htc-smartphone',
  '/htc-one-mini-blue',
  '/nokia-lumia-1020',
  '/nikon-d5500-dslr',
  '/leica-t-mirrorless-digital-camera',
  '/apple-icam',
  '/beats-pill-wireless-speaker',
  '/portable-sound-speakers',
  '/universal-7-8-inch-tablet-cover',
  '/adobe-photoshop',
  '/microsoft-windows-os',
  '/sound-forge-pro-recurring',
  '/custom-t-shirt',
  '/oversized-women-t-shirt',
  '/nike-tailwind-loose-short-sleeve-running-shirt',
  '/levis-511-jeans',
  '/nike-floral-roshe-customized-running-shoes',
  '/adidas-consortium-campus-80s-running-shoes',
  '/nike-sb-zoom-stefan-janoski-medium-mint',
  '/obey-propaganda-hat',
  '/reversible-horseferry-check-belt',
  '/ray-ban-aviator-sunglasses',
  '/elegant-gemstone-necklace-rental',
  '/flower-girl-bracelet',
  '/vintage-style-engagement-ring',
  '/fahrenheit-451-by-ray-bradbury',
  '/pride-and-prejudice',
  '/first-prize-pies',
  '/night-visions',
  '/if-you-wait-donation',
  '/science-faith',
  '/25-virtual-gift-card',
  '/50-physical-gift-card',
  '/100-physical-gift-card',
];

const VALID_SEARCH_TERMS = [
  'apple',
  'samsung',
  'laptop',
  'nike',
  'camera',
  'phone',
  'computer',
  'shirt',
  'shoes',
  'speaker',
  'tablet',
  'gift card',
  'jeans',
  'book',
];

const EMPTY_SEARCH_TERMS = [
  'zzznoresults',
  'xyznonexistent',
  'qqqnotaproduct',
  'fakeitem123',
  'doesnotexist',
];


export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp-up
    { duration: '1m',  target: 20 },  // steady load
    { duration: '30s', target: 50 },  // spike
    { duration: '1m',  target: 0  },  // ramp-down
  ],
  thresholds: {
    search_duration_ms: ['p(95)<2000', 'p(99)<5000'],
    product_duration_ms: ['p(95)<3000', 'p(99)<6000'],
    search_error_rate:  ['rate<0.05'],
    product_error_rate: ['rate<0.05'],
    http_req_failed: ['rate<0.05'],
  },
};


function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const HEADERS = {
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ---------------------------------------------------------------------------
// Scenario: Search with a valid term (generates cache misses on first hit,
// cache hits on repeated terms across VUs)
// ---------------------------------------------------------------------------

function doValidSearch() {
  const term = randomItem(VALID_SEARCH_TERMS);
  const url   = `${BASE_URL}/search/?q=${encodeURIComponent(term)}&searchCategoryId=0&searchManufacturerId=0&searchProductTags=false`;

  const res = http.get(url, { headers: HEADERS, tags: { flow: 'search' } });

  const ok = check(res, {
    'search: status 200': (r) => r.status === 200,
    'search: has body':   (r) => r.body && r.body.length > 0,
  });

  searchErrorRate.add(!ok);
  searchDuration.add(res.timings.duration);

  // Detect empty result pages — nopCommerce renders a "no products" message
  const isEmpty = res.body && (
    res.body.includes('No products were found') ||
    res.body.includes('no-result') ||
    res.body.includes('search-no-results')
  );
  emptySearchRate.add(isEmpty ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Scenario: Search with a term that returns no results
// (directly exercises the nop_empty_searches counter)
// ---------------------------------------------------------------------------

function doEmptySearch() {
  const term = randomItem(EMPTY_SEARCH_TERMS);
  const url  = `${BASE_URL}/search/?q=${encodeURIComponent(term)}`;

  const res = http.get(url, { headers: HEADERS, tags: { flow: 'empty_search' } });

  check(res, {
    'empty search: status 200': (r) => r.status === 200,
  });

  searchDuration.add(res.timings.duration);
  emptySearchRate.add(1); // we know these are empty
}

// ---------------------------------------------------------------------------
// Scenario: View a product page
// (triggers ViewProduct span + CalculatePrice span + pricing cache metrics)
// ---------------------------------------------------------------------------

function doViewProduct() {
  const slug = randomItem(PRODUCT_ENDPOINTS);
  const url  = `${BASE_URL}${slug}`;

  const res = http.get(url, { headers: HEADERS, tags: { flow: 'view_product' } });

  const ok = check(res, {
    'product: status 200':    (r) => r.status === 200,
    'product: has price':     (r) => r.body && (
                                       r.body.includes('product-price') ||
                                       r.body.includes('price-value') ||
                                       r.body.includes('price')
                                     ),
  });

  productErrorRate.add(!ok);
  productDuration.add(res.timings.duration);
}

// ---------------------------------------------------------------------------
// Scenario: Visit the same product twice in quick succession
// The second call should be a pricing cache HIT, making the
// "Pricing Cache Hit Rate" gauge go up in Grafana.
// ---------------------------------------------------------------------------

function doRepeatViewProduct() {
  const slug = randomItem(PRODUCT_ENDPOINTS);
  const url  = `${BASE_URL}${slug}`;

  // First visit — likely a cache miss
  const res1 = http.get(url, { headers: HEADERS, tags: { flow: 'view_product_repeat' } });
  check(res1, { 'repeat product 1st: status 200': (r) => r.status === 200 });
  productDuration.add(res1.timings.duration);

  sleep(0.3); 

  // Second visit to the same slug — should be a cache hit
  const res2 = http.get(url, { headers: HEADERS, tags: { flow: 'view_product_repeat' } });
  check(res2, { 'repeat product 2nd: status 200': (r) => r.status === 200 });
  productDuration.add(res2.timings.duration);

  productErrorRate.add(res1.status !== 200 || res2.status !== 200 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Main VU function — each virtual user runs this in a loop
// ---------------------------------------------------------------------------

export default function () {
  //   distribution 
  //   50 % → valid search 
  //   25 % → direct product view 
  //   15 % → repeat product view
  //   10 % → empty/garbage search 

  const roll = Math.random();

  if (roll < 0.50) {
    group('Valid Search', doValidSearch);
  } else if (roll < 0.75) {
    group('View Product', doViewProduct);
  } else if (roll < 0.90) {
    group('Repeat View Product', doRepeatViewProduct);
  } else {
    group('Empty Search', doEmptySearch);
  }

  sleep(0.5 + Math.random() * 1.5);
}


export function handleSummary(data) {
  const p95Search  = data.metrics.search_duration_ms?.values?.['p(95)']?.toFixed(0) ?? 'n/a';
  const p99Search  = data.metrics.search_duration_ms?.values?.['p(99)']?.toFixed(0) ?? 'n/a';
  const p95Product = data.metrics.product_duration_ms?.values?.['p(95)']?.toFixed(0) ?? 'n/a';
  const p99Product = data.metrics.product_duration_ms?.values?.['p(99)']?.toFixed(0) ?? 'n/a';
  const errSearch  = ((data.metrics.search_error_rate?.values?.rate  ?? 0) * 100).toFixed(2);
  const errProduct = ((data.metrics.product_error_rate?.values?.rate ?? 0) * 100).toFixed(2);
  const emptyRate  = ((data.metrics.empty_search_rate?.values?.rate  ?? 0) * 100).toFixed(2);

  console.log('\n========== NopCommerce Load Test Summary ==========');
  console.log(`Search   P95: ${p95Search} ms   P99: ${p99Search} ms   Error: ${errSearch}%`);
  console.log(`Product  P95: ${p95Product} ms  P99: ${p99Product} ms  Error: ${errProduct}%`);
  console.log(`Empty search rate: ${emptyRate}%`);
  console.log('===================================================\n');

  return {
  };
}
