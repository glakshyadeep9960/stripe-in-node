const nodemailer = require("nodemailer");

async function sendMail(email, subject, message, req, res) {
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
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An Error at Sending Mail", error: error.message });
  }
}

module.exports = sendMail;
