const sgMail = require('@sendgrid/mail');

// NOTE: add "@sendgrid/mail" to package.json dependencies before install:
// npm install @sendgrid/mail

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Sends an email via SendGrid. In development without a real API key,
 * it logs the email to console instead of throwing, so local dev isn't blocked.
 */
const sendEmail = async ({ to, subject, html }) => {
  if (process.env.EMAIL_PROVIDER !== 'sendgrid' || !process.env.SENDGRID_API_KEY) {
    console.log('\n[DEV EMAIL - not actually sent]');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML:', html);
    console.log('[DEV EMAIL END]\n');
    return { simulated: true };
  }

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html,
  };

  return sgMail.send(msg);
};

module.exports = { sendEmail };
