import { expect, test } from '@playwright/test';

test('renders a framed 600x600 table', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 600 });
  await page.goto('/');
  const canvas = page.locator('#game');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveJSProperty('width', 600);
  await expect(canvas).toHaveJSProperty('height', 600);

  await expect
    .poll(async () =>
      canvas.evaluate((node) => {
        const canvasNode = node as HTMLCanvasElement;
        const ctx = canvasNode.getContext('2d');
        const pixel = Array.from(ctx!.getImageData(300, 300, 1, 1).data);
        return pixel[1] > pixel[0];
      }),
    )
    .toBe(true);
});

test('keyboard controls can charge and shoot', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 600 });
  await page.goto('/');
  await page.keyboard.down('Space');
  await page.waitForTimeout(260);
  await page.keyboard.up('Space');

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
        const ctx = canvas.getContext('2d')!;
        return Array.from(ctx.getImageData(300, 430, 1, 1).data).join(',');
      }),
    )
    .not.toBe('0,0,0,0');
});

test('enter toggles charge and shoot for glasses input', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 600 });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(180);
  await page.keyboard.press('Enter');

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
        const ctx = canvas.getContext('2d')!;
        return Array.from(ctx.getImageData(300, 430, 1, 1).data).join(',');
      }),
    )
    .not.toBe('0,0,0,0');
});

test('quick taps toggle charge and shoot for glasses click input', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 600 });
  await page.goto('/');
  const canvas = page.locator('#game');
  await canvas.click({ position: { x: 300, y: 402 } });
  await page.waitForTimeout(180);
  await canvas.click({ position: { x: 300, y: 402 } });

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const canvasNode = document.querySelector<HTMLCanvasElement>('#game')!;
        const ctx = canvasNode.getContext('2d')!;
        return Array.from(ctx.getImageData(300, 430, 1, 1).data).join(',');
      }),
    )
    .not.toBe('0,0,0,0');
});
