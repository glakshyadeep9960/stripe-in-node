const nodemailer = require("nodemailer");

async function sendMail(email, subject, message) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: subject,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email Sent");
  } catch (error) {
    console.log(error, "Error in sending email");
  }
}

module.exports = sendMail;
