const appName = process.env.APP_NAME || 'Veltriz';

const baseWrapper = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0b0e14;font-family:Segoe UI,Roboto,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0e14;padding:32px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#131722;border-radius:12px;overflow:hidden;border:1px solid #1f2433;">
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:24px 32px;">
                <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:1px;">${appName}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#e2e8f0;">
                <h2 style="margin-top:0;color:#fff;font-size:18px;">${title}</h2>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#0e1119;color:#64748b;font-size:12px;">
                You're receiving this because an action was requested on your ${appName} account.
                If this wasn't you, you can safely ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const verifyEmailTemplate = ({ username, verifyUrl }) =>
  baseWrapper(
    'Verify your email',
    `
    <p>Hey ${username},</p>
    <p>Welcome to ${appName}. Confirm your email to activate your citizen account:</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${verifyUrl}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
        Verify Email
      </a>
    </p>
    <p style="font-size:12px;color:#94a3b8;">This link expires in 24 hours.</p>
  `
  );

const resetPasswordTemplate = ({ username, resetUrl }) =>
  baseWrapper(
    'Reset your password',
    `
    <p>Hey ${username},</p>
    <p>We received a request to reset your password. Click below to set a new one:</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="background:#06b6d4;color:#0b0e14;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
        Reset Password
      </a>
    </p>
    <p style="font-size:12px;color:#94a3b8;">This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.</p>
  `
  );

module.exports = { verifyEmailTemplate, resetPasswordTemplate };
