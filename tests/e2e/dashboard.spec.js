// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('node:path');

const abcClientsFile = path.resolve(__dirname, '../../sample-data/CustomerA_ABCAccounting/clients.csv');

test.describe('Onboarding Dashboard', () => {
  test('should display the dashboard heading', async ({ page }) => {
    await page.goto('/');

    // Verify the main heading is visible
    await expect(page.locator('h1')).toContainText('Onboarding Dashboard');
  });

  test('should show navigation tabs', async ({ page }) => {
    await page.goto('/');

    // Verify all navigation tabs are present
    await expect(page.locator('.tab')).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Customer Info' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Data Mapping' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tenant Setup' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
  });

  test('should display example customer in onboarding queue', async ({ page }) => {
    await page.goto('/');

    // Wait for data to load and verify example customer is shown
    await expect(page.locator('.customer-card')).toBeVisible();
    await expect(page.locator('.customer-card h3')).toContainText('Acme Corporation');
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/');

    // Click on Customer Info tab
    await page.getByRole('button', { name: 'Customer Info' }).click();
    
    // Verify placeholder content is shown
    await expect(page.locator('.placeholder h2')).toContainText('Customer Info');
  });

  test('previews a selected ABC Accounting clients file', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Data Mapping' }).click();
    await page.locator('input[type="file"]').setInputFiles(abcClientsFile);

    await expect(page.getByText('Preview: clients.csv')).toBeVisible();
    await expect(page.getByText('10 rows · 10 ID/name ready · 0 need attention')).toBeVisible();
    await expect(page.getByText('Client ID → clientId')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Riverside Manufacturing LLC' })).toBeVisible();
  });

  test('imports one selected client and shows it after refresh', async ({ page }) => {
    const clientId = `E2E-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const csvText = `Client ID,Client Name\n${clientId},Demo Client`;
    await page.goto('/');
    await page.getByRole('button', { name: 'Data Mapping' }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'clients.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvText)
    });

    const importButton = page.getByRole('button', { name: 'Import first client' });
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect(page.getByText(`${clientId} — Demo Client`)).toBeVisible();
    await expect(importButton).toBeDisabled();

    const duplicate = await page.request.post('/api/client-imports', {
      data: { csvText, fileName: 'clients.csv' }
    });
    expect(duplicate.status()).toBe(409);

    await page.reload();
    await page.getByRole('button', { name: 'Data Mapping' }).click();
    await expect(page.getByText(`${clientId} — Demo Client`)).toBeVisible();
  });

  test('blocks import when the first client has no ID', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Data Mapping' }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Client ID,Client Name\n,Missing ID')
    });

    await expect(page.getByRole('cell', { name: 'Missing Client ID' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import first client' })).toBeDisabled();
  });

  test('rejects a file without the required mapping columns', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Data Mapping' }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'other.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('id,name\nC999,No Mapping')
    });

    await expect(page.getByRole('alert')).toContainText('CSV must contain Client ID and Client Name columns');
    await expect(page.getByRole('button', { name: 'Import first client' })).toBeDisabled();
  });
});
