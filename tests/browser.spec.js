import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

let forbiddenRequests;
let browserErrors;

test.beforeEach(async ({ context, page, baseURL }) => {
  forbiddenRequests = [];
  browserErrors = [];
  const origin = new URL(baseURL).origin;
  await context.route('**/*', async route => {
    const request = route.request();
    if (new URL(request.url()).origin !== origin || !['GET', 'HEAD'].includes(request.method())) {
      forbiddenRequests.push(`${request.method()} ${request.url()}`);
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
});

test.afterEach(async () => {
  expect(forbiddenRequests, 'The catalog must only request local, read-only resources.').toEqual([]);
  expect(browserErrors, 'The page must not log JavaScript or resource errors.').toEqual([]);
});

async function openCatalog(page) {
  const response = await page.goto('/');
  expect(response.status()).toBe(200);
  await expect(page.locator('.books_card')).toHaveCount(9);
}

async function loadImages(page) {
  for (const image of await page.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('alt');
    await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  }
}

async function checkNavigation(page) {
  const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
  const destinations = [
    ['Beranda', 'home'],
    ['Tentang', 'about'],
    ['Buku', 'book'],
  ];
  await expect(nav.getByRole('link')).toHaveCount(3);
  for (const [label, id] of destinations) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    const heading = page.locator(`#${id}`).getByRole('heading').first();
    await expect(heading).toBeVisible();
    const headingBox = await heading.boundingBox();
    const headerBox = await page.locator('.site-header').boundingBox();
    expect(headingBox.y, `${label} heading must remain below the fixed header.`).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
    expect(headingBox.y).toBeLessThan(await page.evaluate(() => window.innerHeight));
  }
}

async function assertNoClipping(page) {
  const clipped = await page.locator('.books_card').evaluateAll(cards => cards.flatMap((card, index) => {
    const synopsis = card.querySelector('.synopsis') || card.querySelector('.books_tag > p:last-child');
    if (!synopsis || !synopsis.textContent.trim()) return [`Book ${index + 1}: synopsis missing`];
    const failures = [];
    for (let element = synopsis; element && card.contains(element); element = element.parentElement) {
      const style = getComputedStyle(element);
      if (['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2) {
        failures.push(`Book ${index + 1}: clipped synopsis`);
      }
    }
    if (synopsis.getBoundingClientRect().bottom > card.getBoundingClientRect().bottom + 1) {
      failures.push(`Book ${index + 1}: synopsis escapes card`);
    }
    return failures;
  }));
  expect(clipped).toEqual([]);
}

async function screenshot(page, name) {
  if (!process.env.BOOK_STORE_QA_DIR) return;
  mkdirSync(process.env.BOOK_STORE_QA_DIR, { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: join(process.env.BOOK_STORE_QA_DIR, `${name}.png`), fullPage: true });
}

async function viewportScreenshots(page) {
  if (!process.env.BOOK_STORE_VIEWPORT_QA_DIR) return;
  mkdirSync(process.env.BOOK_STORE_VIEWPORT_QA_DIR, { recursive: true });
  for (const [name, width, height] of [['desktop-1280-viewport', 1280, 900], ['mobile-390-viewport', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: join(process.env.BOOK_STORE_VIEWPORT_QA_DIR, `${name}.png`) });
  }
}

test('catalog loads all nine titles and local images without browser errors', async ({ page }) => {
  await openCatalog(page);
  await expect(page).toHaveTitle('BUKA BUKU | Katalog Buku');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('BUKA BUKU');
  const titles = await page.locator('.books_card').evaluateAll(cards => cards.map(card => (
    card.querySelector('h3') || card.querySelector('.books_tag > p')
  )?.textContent.trim()));
  expect(titles.every(Boolean)).toBe(true);
  expect(new Set(titles).size).toBe(9);
  await loadImages(page);
  await screenshot(page, 'desktop-1280');
  await viewportScreenshots(page);
});

test('all navigation links reach visible headings below the header', async ({ page }) => {
  await openCatalog(page);
  await checkNavigation(page);
});

test('keyboard users can skip navigation and activate each menu item', async ({ page }) => {
  await openCatalog(page);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Lewati navigasi' });
  await expect(skip).toBeFocused();
  const skipBox = await skip.boundingBox();
  expect(skipBox.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();

  const destinations = [['Beranda', 'home'], ['Tentang', 'about'], ['Buku', 'book']];
  for (const [index, [label, id]] of destinations.entries()) {
    await page.goto(`/index.html?keyboard=${id}`);
    await page.keyboard.press('Tab');
    for (let step = 0; step <= index; step += 1) await page.keyboard.press('Tab');
    const link = page.getByRole('navigation').getByRole('link', { name: label, exact: true });
    await expect(link).toBeFocused();
    expect(await link.evaluate(element => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
    })).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
  }
});

test('all nine synopses remain readable inside their cards', async ({ page }) => {
  await openCatalog(page);
  await assertNoClipping(page);
});

for (const width of [320, 390, 768]) {
  test(`catalog and navigation work at ${width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openCatalog(page);
    await loadImages(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await assertNoClipping(page);
    await checkNavigation(page);
    for (const link of await page.getByRole('navigation').getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    if (width === 390) {
      await screenshot(page, 'mobile-390');
    }
  });
}

test('static page exposes valid metadata and only working in-page controls', async ({ page }) => {
  await openCatalog(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  expect((await page.locator('meta[name="description"]').getAttribute('content')).trim().length).toBeGreaterThan(30);
  await expect(page.locator('form, input, button')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/logout|login|password|admin@example/i);
  const invalidLinks = await page.locator('a').evaluateAll(links => links.flatMap(link => {
    const href = link.getAttribute('href');
    if (!href?.startsWith('#') || href.length < 2 || !document.getElementById(href.slice(1))) return [href];
    return [];
  }));
  expect(invalidLinks).toEqual([]);
  await loadImages(page);
});
