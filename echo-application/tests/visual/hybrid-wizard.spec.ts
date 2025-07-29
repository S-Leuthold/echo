/**
 * Visual Regression Tests for Hybrid Project Creation Wizard
 * 
 * Captures baseline screenshots of all wizard states to ensure
 * zero visual regressions during refactoring process.
 * 
 * Part of Phase 1: Foundation Setup
 */

import { test, expect } from '@playwright/test';

test.describe('Hybrid Wizard Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
  });

  test('should capture baseline: projects page with dropdown closed', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForSelector('[data-testid="projects-page"], h1:has-text("Projects")', { timeout: 10000 });
    
    // Take screenshot
    await expect(page).toHaveScreenshot('projects-page-initial.png');
  });

  test('should capture baseline: create project dropdown open', async ({ page }) => {
    // Wait for page load
    await page.waitForSelector('h1:has-text("Projects")', { timeout: 10000 });
    
    // Open the dropdown
    await page.click('button:has-text("Create New Project")');
    await page.waitForSelector('text="New with AI"', { timeout: 5000 });
    
    // Take screenshot
    await expect(page).toHaveScreenshot('projects-dropdown-open.png');
  });

  test('should capture baseline: hybrid wizard modal closed state', async ({ page }) => {
    // Wait for page load
    await page.waitForSelector('h1:has-text("Projects")', { timeout: 10000 });
    
    // Open dropdown and click hybrid wizard
    await page.click('button:has-text("Create New Project")');
    await page.waitForSelector('text="New with AI"', { timeout: 5000 });
    
    // Take screenshot before opening wizard
    await expect(page).toHaveScreenshot('hybrid-wizard-before-open.png');
  });

  test('should capture baseline: hybrid wizard initial state', async ({ page }) => {
    // Wait for page load
    await page.waitForSelector('h1:has-text("Projects")', { timeout: 10000 });
    
    // Open hybrid wizard
    await page.click('button:has-text("Create New Project")');
    await page.waitForSelector('text="New with AI"', { timeout: 5000 });
    await page.click('text="New with AI"');
    
    // Wait for wizard to open
    await page.waitForSelector('h2:has-text("Create New Project")', { timeout: 10000 });
    
    // Take screenshot
    await expect(page).toHaveScreenshot('hybrid-wizard-initial.png');
  });

  test('should capture baseline: conversation with first message', async ({ page }) => {
    // Open wizard
    await page.waitForSelector('h1:has-text("Projects")', { timeout: 10000 });
    await page.click('button:has-text("Create New Project")');
    await page.waitForSelector('text="New with AI"', { timeout: 5000 });
    await page.click('text="New with AI"');
    await page.waitForSelector('h2:has-text("Create New Project")', { timeout: 10000 });
    
    // Type a message in the conversation
    const textarea = page.locator('textarea').first();
    await textarea.fill('I want to create a mobile app for tracking daily habits');
    
    // Take screenshot with typed message
    await expect(page).toHaveScreenshot('hybrid-wizard-with-message.png');
  });

  test('should capture baseline: project brief with populated data', async ({ page }) => {
    // Open wizard
    await page.waitForSelector('h1:has-text("Projects")', { timeout: 10000 });
    await page.click('button:has-text("Create New Project")');
    await page.waitForSelector('text="New with AI"', { timeout: 5000 });
    await page.click('text="New with AI"');
    await page.waitForSelector('h2:has-text("Create New Project")', { timeout: 10000 });
    
    // Wait for brief to be visible
    await page.waitForSelector('text="Untitled Project"', { timeout: 5000 });
    
    // Take screenshot of initial brief state
    await expect(page).toHaveScreenshot('hybrid-wizard-brief-empty.png');
  });

  test('should capture baseline: wizard error states', async ({ page }) => {
    // Open wizard
    await page.waitForSelector('h1:has-text("Projects")', { timeout: 10000 });
    await page.click('button:has-text("Create New Project")');
    await page.waitForSelector('text="New with AI"', { timeout: 5000 });
    await page.click('text="New with AI"');
    await page.waitForSelector('h2:has-text("Create New Project")', { timeout: 10000 });
    
    // Check if error display is visible (might not be in normal flow)
    const errorDisplay = page.locator('[data-testid="error-display"]');
    const isErrorVisible = await errorDisplay.isVisible().catch(() => false);
    
    if (isErrorVisible) {
      await expect(page).toHaveScreenshot('hybrid-wizard-error-state.png');
    }
  });

  test('should capture baseline: wizard close interaction', async ({ page }) => {
    // Open wizard
    await page.waitForSelector('h1:has-text("Projects")', { timeout: 10000 });
    await page.click('button:has-text("Create New Project")');
    await page.waitForSelector('text="New with AI"', { timeout: 5000 });
    await page.click('text="New with AI"');
    await page.waitForSelector('h2:has-text("Create New Project")', { timeout: 10000 });
    
    // Hover over close button to show interaction state
    await page.hover('button:has-text("×")');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('hybrid-wizard-close-hover.png');
  });

  test('should capture baseline: CTA button states', async ({ page }) => {
    // Open wizard
    await page.waitForSelector('h1:has-text("Projects")', { timeout: 10000 });
    await page.click('button:has-text("Create New Project")');
    await page.waitForSelector('text="New with AI"', { timeout: 5000 });
    await page.click('text="New with AI"');
    await page.waitForSelector('h2:has-text("Create New Project")', { timeout: 10000 });
    
    // Wait for CTA button to be visible
    await page.waitForSelector('button:has-text("Finalize & Create Project")');
    
    // Take screenshot of footer with CTA
    await expect(page.locator('div').filter({ hasText: 'Finalize & Create Project' }).last()).toHaveScreenshot('hybrid-wizard-cta-section.png');
  });
});

// Mobile-specific tests
test.describe('Hybrid Wizard Mobile Visual Regression', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should capture baseline: mobile wizard layout', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForSelector('h1:has-text("Projects")', { timeout: 10000 });
    
    // Open wizard on mobile
    await page.click('button:has-text("Create New Project")');
    await page.waitForSelector('text="New with AI"', { timeout: 5000 });
    await page.click('text="New with AI"');
    await page.waitForSelector('h2:has-text("Create New Project")', { timeout: 10000 });
    
    // Take mobile screenshot
    await expect(page).toHaveScreenshot('hybrid-wizard-mobile.png');
  });
});