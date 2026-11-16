import { expect, test, type Page } from '@playwright/test';

async function installRecognition(page: Page) {
  await page.addInitScript(() => {
    const scope = window as unknown as Record<string, unknown>;
    class Recognition {
      static instances: Recognition[] = [];
      onstart?: () => void;
      onresult?: (event: unknown) => void;
      onerror?: (event: unknown) => void;
      onend?: () => void;
      constructor() { Recognition.instances.push(this); }
      start() { this.onstart?.(); }
      abort() {}
    }
    scope.SpeechRecognition = Recognition;
    scope.__recognizers = Recognition.instances;
  });
}

async function recognize(page: Page, text: string) {
  await page.evaluate(text => {
    const scope = window as unknown as { __recognizers: { onresult?: (event: unknown) => void }[] };
    scope.__recognizers.at(-1)?.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text, confidence: 0 } }] });
  }, text);
}

test('20 карточек, новый круг, клавиатура и адаптивность', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#word')).toHaveText('кошка');
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
  for (let i = 1; i < 20; i++) await page.getByRole('button', { name: 'Следующее слово' }).click();
  await expect(page.locator('#word')).toHaveText('снег');
  await expect(page.locator('.card-number')).toHaveText('Слово 20 из 20');
  await page.getByRole('button', { name: 'Новый круг', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#word')).toHaveText('снег');
  await page.getByRole('button', { name: 'Новый круг', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Начать новый круг' }).click();
  await expect(page.locator('#word')).toHaveText('кошка');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of await page.getByRole('button').all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.width).toBeGreaterThanOrEqual(48);
  }
  expect(errors).toEqual([]);
});

test('согласие до микрофона, награда и перезагрузка', async ({ page }) => {
  await installRecognition(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('внешнему сервису');
  expect(await page.evaluate(() => (window as unknown as { __recognizers: unknown[] }).__recognizers.length)).toBe(0);
  await page.getByRole('button', { name: 'Понятно, включить микрофон' }).click();
  await expect(page.getByRole('button', { name: 'Послушать', exact: true })).toBeDisabled();
  await recognize(page, 'КОШКА!');
  await expect(page.locator('#total-stars')).toHaveText('1');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await recognize(page, 'кошка');
  await expect(page.locator('#total-stars')).toHaveText('1');
  await page.getByRole('button', { name: 'Следующее слово' }).click();
  await page.reload();
  await expect(page.locator('#word')).toHaveText('собака');
  await expect(page.locator('#total-stars')).toHaveText('1');
});

test('нет распознавания — остаётся режим повторения', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeDisabled();
  await expect(page.locator('.capability-note')).toContainText('без автоматической оценки');
  await expect(page.getByRole('button', { name: 'Послушать', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Следующее слово' }).click();
  await expect(page.locator('#word')).toHaveText('собака');
});

test('повреждённое хранилище сбрасывается без ошибки', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('povtoryayka.progress', '{broken'));
  await page.goto('/');
  await expect(page.locator('#word')).toHaveText('кошка');
  await expect(page.locator('#total-stars')).toHaveText('0');
  await page.getByRole('button', { name: 'Следующее слово' }).click();
  await expect(page.locator('#word')).toHaveText('собака');
});

test('смена карточки игнорирует старые результаты в браузере', async ({ page }) => {
  await installRecognition(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await page.getByRole('button', { name: 'Понятно, включить микрофон' }).click();
  await page.evaluate(() => {
    const scope = window as unknown as { __recognizers: { onresult: (event: unknown) => void }[]; __late: (event: unknown) => void };
    scope.__late = scope.__recognizers[0].onresult;
  });
  await page.getByRole('button', { name: 'Следующее слово' }).click();
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await page.evaluate(() => (window as unknown as { __late: (event: unknown) => void }).__late({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'кошка', confidence: 1 } }] }));
  await expect(page.locator('#total-stars')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Послушать', exact: true })).toBeDisabled();
  await recognize(page, 'собака');
  await expect(page.locator('#total-stars')).toHaveText('1');
});
