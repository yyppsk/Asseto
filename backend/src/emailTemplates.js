const BRAND = 'Paddock India';
const DEFAULT_SUPPORT_EMAIL = 'hello@paddockindia.local';
const DEFAULT_SITE_URL = 'http://localhost:3001';
const EMAIL_LOGO_PATH = '/assets/images/logos/email/paddock-india-email-logo.png';
const EMAIL_MARK_PATH = '/assets/images/logos/email/paddock-india-email-mark.png';

export function renderWelcomeEmail({ displayName, verificationUrl, siteUrl }) {
  const greetingName = displayName || 'there';

  return renderTransactionalEmail({
    subject: `Welcome to ${BRAND}`,
    previewText: 'Confirm your email and step into the paddock.',
    eyebrow: 'Account setup',
    accent: 'green',
    title: `Welcome to ${BRAND}`,
    greeting: `Hi ${greetingName},`,
    paragraphs: [
      `Welcome to ${BRAND}. Your account is almost ready.`,
      'Confirm your email so we can keep your account secure and send important updates about your profile, events, and community activity.',
    ],
    ctaLabel: 'Confirm email',
    ctaUrl: verificationUrl,
    fallbackIntro: 'If the button does not work, copy and paste this link into your browser:',
    fallbackUrl: verificationUrl,
    note: 'This link works for a limited time. If you did not create this account, you can ignore this email.',
    signoff: 'See you in the paddock,',
    siteUrl,
    text: [
      `Hi ${greetingName},`,
      '',
      `Welcome to ${BRAND}. Your account is almost ready.`,
      '',
      `Confirm your email here:`,
      verificationUrl,
      '',
      'This link works for a limited time. If you did not create this account, you can ignore this email.',
      '',
      'See you in the paddock,',
      BRAND,
    ].join('\n'),
  });
}

export function renderPasswordResetEmail({ resetUrl, siteUrl }) {
  return renderTransactionalEmail({
    subject: `Reset your ${BRAND} password`,
    previewText: 'Use this secure link to choose a new password.',
    eyebrow: 'Password reset',
    accent: 'yellow',
    title: 'Choose a new password',
    greeting: 'Hi,',
    paragraphs: [
      `We received a request to reset the password for your ${BRAND} account.`,
      'Use the button below to choose a new password.',
    ],
    ctaLabel: 'Reset password',
    ctaUrl: resetUrl,
    fallbackIntro: 'If the button does not work, copy and paste this link into your browser:',
    fallbackUrl: resetUrl,
    dangerNote: 'If you did not ask for a password reset, you can ignore this email. Your password will not change unless this link is used.',
    siteUrl,
    text: [
      'Hi,',
      '',
      `We received a request to reset the password for your ${BRAND} account.`,
      '',
      'Reset your password here:',
      resetUrl,
      '',
      'This link works for a limited time. If you did not ask for a password reset, you can ignore this email. Your password will not change unless this link is used.',
      '',
      BRAND,
    ].join('\n'),
  });
}

export function renderPasswordChangedEmail({ forgotPasswordUrl, siteUrl }) {
  const supportEmail = getSupportEmail();

  return renderTransactionalEmail({
    subject: `Your ${BRAND} password was changed`,
    previewText: 'This is a confirmation that your account password changed.',
    eyebrow: 'Security update',
    accent: 'green',
    title: 'Your password was changed',
    greeting: 'Hi,',
    paragraphs: [
      `Your ${BRAND} password was changed successfully.`,
      'If this was you, no further action is needed.',
    ],
    ctaLabel: 'Reset password',
    ctaUrl: forgotPasswordUrl,
    secondaryAction: true,
    dangerNote: 'If you did not make this change, reset your password right away and contact support.',
    siteUrl,
    text: [
      'Hi,',
      '',
      `Your ${BRAND} password was changed successfully.`,
      '',
      'If this was you, no further action is needed.',
      '',
      'If you did not make this change, reset your password here:',
      forgotPasswordUrl,
      '',
      `You can also contact support at ${supportEmail}.`,
      '',
      BRAND,
    ].join('\n'),
  });
}

export function renderEmailVerifiedEmail({ displayName, siteUrl }) {
  const greetingName = displayName || 'there';
  const resolvedSiteUrl = resolveSiteUrl(siteUrl);

  return renderTransactionalEmail({
    subject: `Your ${BRAND} email is confirmed`,
    previewText: 'Your account is ready to use.',
    eyebrow: 'Account ready',
    accent: 'green',
    title: 'Your email is confirmed',
    greeting: `Hi ${greetingName},`,
    paragraphs: [
      `Your email is confirmed and your ${BRAND} account is ready.`,
      'You can now sign in, manage your profile, and join the community as it opens up.',
    ],
    ctaLabel: `Open ${BRAND}`,
    ctaUrl: resolvedSiteUrl,
    siteUrl: resolvedSiteUrl,
    text: [
      `Hi ${greetingName},`,
      '',
      `Your email is confirmed and your ${BRAND} account is ready.`,
      '',
      `Open ${BRAND}:`,
      resolvedSiteUrl,
      '',
      BRAND,
    ].join('\n'),
  });
}

function renderTransactionalEmail({
  accent = 'yellow',
  ctaLabel,
  ctaUrl,
  dangerNote,
  eyebrow,
  fallbackIntro,
  fallbackUrl,
  greeting,
  note,
  paragraphs,
  previewText,
  secondaryAction = false,
  signoff,
  siteUrl,
  subject,
  text,
  title,
}) {
  const resolvedSiteUrl = resolveSiteUrl(siteUrl);
  const supportEmail = getSupportEmail();
  const logoUrl = getLogoUrl(resolvedSiteUrl);
  const markUrl = getMarkUrl(resolvedSiteUrl);
  const footerLinks = renderFooterLinks(resolvedSiteUrl);
  const accentColor = accent === 'green' ? '#54f29a' : '#ffce56';
  const buttonStyle = secondaryAction
    ? 'display:inline-block;border:1px solid #f43d4f;background:transparent;color:#f4f1e8;text-decoration:none;font-weight:800;padding:13px 18px;border-radius:8px;'
    : 'display:inline-block;background:#ffce56;color:#101316;text-decoration:none;font-weight:900;padding:13px 18px;border-radius:8px;';
  const bodyParagraphs = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#cbd3cf;font-size:15px;line-height:1.62;">${escapeHtml(paragraph)}</p>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#07090b;color:#f4f1e8;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(previewText)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#07090b;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
            <tr>
              <td style="padding:0 4px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
                        <tr>
                          <td style="background:#f4f1e8;border:1px solid #d9b76f;border-radius:10px;padding:8px 12px;">
                            <img src="${escapeAttribute(logoUrl)}" width="160" height="48" alt="${BRAND}" style="display:block;border:0;outline:none;text-decoration:none;width:160px;height:auto;">
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <img src="${escapeAttribute(markUrl)}" width="36" height="36" alt="" style="display:block;border:0;outline:none;text-decoration:none;width:36px;height:36px;border-radius:8px;">
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="border:1px solid rgba(244,241,232,0.14);background:#101316;border-radius:14px;overflow:hidden;">
                <div style="height:4px;background:#ffce56;"></div>
                <div style="padding:28px;">
                  <p style="margin:0 0 12px;color:${accentColor};font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(eyebrow)}</p>
                  <h1 style="margin:0 0 14px;color:#f4f1e8;font-size:26px;line-height:1.15;font-weight:900;">${escapeHtml(title)}</h1>
                  <p style="margin:0 0 16px;color:#f4f1e8;font-size:15px;line-height:1.62;">${escapeHtml(greeting)}</p>
                  ${bodyParagraphs}
                  ${
                    ctaUrl
                      ? `<p style="margin:22px 0 0;"><a href="${escapeAttribute(ctaUrl)}" style="${buttonStyle}">${escapeHtml(ctaLabel)}</a></p>`
                      : ''
                  }
                  ${
                    fallbackUrl
                      ? `<p style="margin:22px 0 0;color:#aeb8b1;font-size:13px;line-height:1.55;">${escapeHtml(fallbackIntro)}<br><a href="${escapeAttribute(fallbackUrl)}" style="color:#ffce56;text-decoration:none;word-break:break-all;">${escapeHtml(fallbackUrl)}</a></p>`
                      : ''
                  }
                  ${
                    note
                      ? `<p style="margin:20px 0 0;padding:14px 16px;border:1px solid rgba(84,242,154,0.22);background:#151b20;color:#cbd3cf;font-size:13px;line-height:1.55;border-radius:10px;">${escapeHtml(note)}</p>`
                      : ''
                  }
                  ${
                    dangerNote
                      ? `<p style="margin:20px 0 0;padding:14px 16px;border:1px solid rgba(244,61,79,0.32);background:#151b20;color:#f0c4c8;font-size:13px;line-height:1.55;border-radius:10px;">${escapeHtml(dangerNote)}</p>`
                      : ''
                  }
                  ${
                    signoff
                      ? `<p style="margin:22px 0 0;color:#cbd3cf;font-size:14px;line-height:1.6;">${escapeHtml(signoff)}<br>${BRAND}</p>`
                      : ''
                  }
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 4px 0;color:#7f8a84;font-size:12px;line-height:1.65;">
                You received this email because someone used this address for a ${BRAND} account.<br>
                Need help? Contact <a href="mailto:${escapeAttribute(supportEmail)}" style="color:#ffce56;text-decoration:none;">${escapeHtml(supportEmail)}</a>.<br>
                <span style="color:#aeb8b1;font-weight:700;">${BRAND}</span><br>
                <a href="${escapeAttribute(resolvedSiteUrl)}" style="color:#aeb8b1;text-decoration:none;">${escapeHtml(resolvedSiteUrl)}</a>${footerLinks}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    previewText,
    html,
    text,
  };
}

function renderFooterLinks(siteUrl) {
  const links = [
    process.env.PRIVACY_URL ? `<a href="${escapeAttribute(process.env.PRIVACY_URL)}" style="color:#aeb8b1;text-decoration:none;">Privacy Policy</a>` : '',
    process.env.TERMS_URL ? `<a href="${escapeAttribute(process.env.TERMS_URL)}" style="color:#aeb8b1;text-decoration:none;">Terms</a>` : '',
  ].filter(Boolean);

  return links.length ? `<br>${links.join(' <span style="color:#59645e;">|</span> ')}` : '';
}

function getLogoUrl(siteUrl) {
  return process.env.EMAIL_LOGO_URL || absoluteUrl(siteUrl, EMAIL_LOGO_PATH);
}

function getMarkUrl(siteUrl) {
  return process.env.EMAIL_MARK_URL || absoluteUrl(siteUrl, EMAIL_MARK_PATH);
}

function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL;
}

function resolveSiteUrl(siteUrl) {
  return stripTrailingSlash(process.env.APP_PUBLIC_URL || siteUrl || DEFAULT_SITE_URL);
}

function absoluteUrl(siteUrl, path) {
  return `${stripTrailingSlash(siteUrl)}${path}`;
}

function stripTrailingSlash(value) {
  return String(value || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}
