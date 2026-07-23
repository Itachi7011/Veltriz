const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendEmail = async ({ to, subject, html }) => {
  if (process.env.EMAIL_PROVIDER !== 'sendgrid' || !process.env.SENDGRID_API_KEY) {
    console.log('\n[DEV EMAIL - not actually sent]');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML:', html);
    console.log('[DEV EMAIL END]\n');
    return { simulated: true };
  }

  return sgMail.send({ to, from: process.env.SENDGRID_FROM_EMAIL, subject, html });
};

module.exports = { sendEmail };
