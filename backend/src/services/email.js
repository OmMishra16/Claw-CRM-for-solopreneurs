const nodemailer = require('nodemailer');

// Create reusable transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Verify connection on startup
transporter.verify((error) => {
  if (error) {
    console.log('Email service error:', error.message);
  } else {
    console.log('Email service ready');
  }
});

/**
 * Send password reset email with 6-digit code
 */
async function sendPasswordResetEmail(email, code, businessName) {
  const mailOptions = {
    from: `"Claw" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Password - Claw',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f8fafc;">
        <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h1 style="color: #6366f1; font-size: 28px; margin: 0 0 8px 0;">Claw</h1>
          <p style="color: #64748b; margin: 0 0 24px 0;">Password Reset</p>

          <p style="color: #334155; font-size: 16px; line-height: 1.5;">
            Hi${businessName ? ` ${businessName}` : ''},
          </p>

          <p style="color: #334155; font-size: 16px; line-height: 1.5;">
            We received a request to reset your password. Use the code below to complete the process:
          </p>

          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${code}</span>
          </div>

          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            This code will expire in <strong>15 minutes</strong>.
          </p>

          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            If you didn't request this, you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            Claw - Scheduling made simple for solo practitioners
          </p>
        </div>
      </body>
      </html>
    `,
    text: `Your Claw password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Generate a random 6-digit code
 */
function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  sendPasswordResetEmail,
  generateResetCode,
};
