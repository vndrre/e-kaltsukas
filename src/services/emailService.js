const { env } = require("../config/env");
const { resend } = require("./resendClient");

const sendEmail = async ({ to, subject, html, from = env.RESEND_FROM_EMAIL }) => {
  if (!resend) {
    throw new Error("RESEND_API_KEY is missing in server config");
  }

  if (!to || !subject || !html) {
    throw new Error("to, subject, and html are required to send an email");
  }

  return resend.emails.send({
    from,
    to,
    subject,
    html
  });
};

const sendTestEmail = (to) =>
  sendEmail({
    to,
    subject: "Hello World",
    html: "<p>Congrats on sending your <strong>first email</strong>!</p>"
  });

module.exports = {
  sendEmail,
  sendTestEmail
};
