import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  renderEmailVerifiedEmail,
  renderPasswordChangedEmail,
  renderPasswordResetEmail,
  renderWelcomeEmail,
} from '../src/emailTemplates.js';

const outputDirectory = resolve('tmp/email-previews');
const siteUrl = process.env.APP_PUBLIC_URL || 'http://127.0.0.1:3001';
const previews = [
  {
    file: 'welcome.html',
    title: 'Welcome and Verification',
    template: renderWelcomeEmail({
      displayName: 'Pranjal',
      verificationUrl: `${siteUrl}/verify-email?token=preview-verification-token`,
      siteUrl,
    }),
  },
  {
    file: 'password-reset.html',
    title: 'Password Reset',
    template: renderPasswordResetEmail({
      resetUrl: `${siteUrl}/reset-password?token=preview-reset-token`,
      siteUrl,
    }),
  },
  {
    file: 'password-changed.html',
    title: 'Password Changed',
    template: renderPasswordChangedEmail({
      forgotPasswordUrl: `${siteUrl}/forgot-password`,
      siteUrl,
    }),
  },
  {
    file: 'email-verified.html',
    title: 'Email Verified',
    template: renderEmailVerifiedEmail({
      displayName: 'Pranjal',
      siteUrl,
    }),
  },
];

await mkdir(outputDirectory, { recursive: true });

await Promise.all(
  previews.map((preview) => writeFile(resolve(outputDirectory, preview.file), preview.template.html, 'utf8')),
);

await writeFile(resolve(outputDirectory, 'index.html'), renderIndex(previews), 'utf8');

console.log(`Email previews written to ${outputDirectory}`);
for (const preview of previews) {
  console.log(`- ${preview.title}: ${resolve(outputDirectory, preview.file)}`);
}

function renderIndex(items) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Paddock India Email Previews</title>
    <style>
      body { margin: 0; background: #07090b; color: #f4f1e8; font-family: Arial, sans-serif; }
      main { max-width: 1040px; margin: 0 auto; padding: 32px 16px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { color: #aeb8b1; line-height: 1.6; }
      nav { display: flex; flex-wrap: wrap; gap: 10px; margin: 24px 0; }
      a { color: #101316; background: #ffce56; border-radius: 8px; padding: 10px 14px; text-decoration: none; font-weight: 800; }
      iframe { display: block; width: 100%; height: 780px; margin-top: 18px; border: 1px solid rgba(244,241,232,.18); border-radius: 10px; background: #07090b; }
    </style>
  </head>
  <body>
    <main>
      <h1>Paddock India Email Previews</h1>
      <p>Open each template below to review the rendered HTML before these templates are published.</p>
      <nav>
        ${items.map((item) => `<a href="${item.file}">${escapeHtml(item.title)}</a>`).join('')}
      </nav>
      <iframe title="Welcome email preview" src="welcome.html"></iframe>
    </main>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
