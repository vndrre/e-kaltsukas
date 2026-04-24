const { sendTestEmail } = require("../services/emailService");

const to = process.env.RESEND_TEST_TO || "aleppik7@gmail.com";

sendTestEmail(to)
  .then(({ data, error }) => {
    if (error) {
      console.error("Resend test email failed", error);
      process.exit(1);
    }

    console.log("Resend test email sent", {
      id: data?.id,
      to
    });
  })
  .catch((error) => {
    console.error("Resend test email failed", error.message);
    process.exit(1);
  });
