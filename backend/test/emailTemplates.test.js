import assert from 'node:assert/strict';
import test from 'node:test';
import { renderPasswordResetEmail, renderWelcomeEmail } from '../src/emailTemplates.js';

test('welcome email escapes display names in html and keeps plain text readable', () => {
  const email = renderWelcomeEmail({
    displayName: '<Admin Racer>',
    verificationUrl: 'https://example.test/verify-email?token=abc123',
    siteUrl: 'https://example.test',
  });

  assert.equal(email.subject, 'Welcome to Paddock India');
  assert.match(email.html, /Hi &lt;Admin Racer&gt;,/);
  assert.doesNotMatch(email.html, /Hi <Admin Racer>,/);
  assert.match(email.text, /Hi <Admin Racer>,/);
  assert.match(email.html, /Confirm email/);
});

test('password reset email includes html and text alternatives', () => {
  const email = renderPasswordResetEmail({
    resetUrl: 'https://example.test/reset-password?token=reset123',
    siteUrl: 'https://example.test',
  });

  assert.equal(email.subject, 'Reset your Paddock India password');
  assert.match(email.previewText, /secure link/);
  assert.match(email.html, /Reset password/);
  assert.match(email.html, /If you did not ask for a password reset/);
  assert.match(email.text, /https:\/\/example\.test\/reset-password\?token=reset123/);
});
