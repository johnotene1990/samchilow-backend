const nodemailer = require("nodemailer");

// Simple HTML sanitizer
const escapeHtml = (text = "") => {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ======================================================
// SMTP CONFIGURATION
// ======================================================

const emailPassword = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
const emailPort = Number(process.env.EMAIL_PORT || 587);

const isSecure =
  process.env.EMAIL_SECURE !== undefined
    ? process.env.EMAIL_SECURE === "true"
    : emailPort === 465;

let activeTransporter = null;

const createPrimaryTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "131.153.147.186",
    port: emailPort,
    secure: isSecure,
    auth: {
      user: process.env.EMAIL_USER || "info@samchilowmultibiz.com",
      pass: emailPassword,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
    },
  });
};

activeTransporter = createPrimaryTransporter();

const getTransporter = () => activeTransporter;

// ======================================================
// VERIFY EMAIL CONNECTION
// ======================================================

const verifyEmailTransporter = async () => {
  try {
    await activeTransporter.verify();
    console.log("✅ Primary SMTP Connection Ready for Samchilow MultiBiz.");
    return true;
  } catch (error) {
    console.warn(`⚠️ Primary SMTP Warning: ${error.message}`);
    // Only fallback to Ethereal in development environment if explicitly needed
    if (process.env.NODE_ENV === "development") {
      try {
        const testAccount = await nodemailer.createTestAccount();
        activeTransporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log("⚠️ Ethereal fallback transporter initialized for local dev.");
        return true;
      } catch (fallbackError) {
        console.error("❌ Failed to initialize fallback transporter:", fallbackError.message);
        return false;
      }
    }
    return false;
  }
};

// ======================================================
// GENERIC SEND EMAIL FUNCTION
// ======================================================

const sendEmail = async ({ to, subject, text, html, replyTo, fromName }) => {
  try {
    if (!to) throw new Error("Email recipient is required.");
    if (!subject) throw new Error("Email subject is required.");

    const senderTitle = fromName || "Samchilow MultiBiz Limited";
    const senderEmail = process.env.EMAIL_USER || "info@samchilowmultibiz.com";

    const mailOptions = {
      from: `"${senderTitle}" <${senderEmail}>`,
      to,
      subject,
      text: text || "",
      html:
        html ||
        `<div style="font-family: Arial, sans-serif;"><p>${escapeHtml(
          text || ""
        )}</p></div>`,
    };

    if (replyTo) {
      mailOptions.replyTo = replyTo;
    }

    const currentTransporter = getTransporter();
    const info = await currentTransporter.sendMail(mailOptions);
    console.log(`✉️ Email successfully dispatched to: ${to} (MessageID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error("❌ EMAIL SEND ERROR:", error.message);
    throw error;
  }
};

// ======================================================
// CONTACT ENQUIRY HANDLER FOR COMPANY (INFO@SAMCHILOWMULTIBIZ.COM)
// ======================================================

const sendContactEmail = async ({
  name,
  email,
  phone,
  subject,
  message,
  website,
}) => {
  // Target company address
  const companyEmail = process.env.ADMIN_EMAIL || "info@samchilowmultibiz.com";

  const isConstruction = website === "construction";
  const websiteName = isConstruction
    ? "Samchilow MultiBiz Construction"
    : "Samchilow Logistics";

  const emailSubject = subject
    ? `[${websiteName}] ${subject}`
    : `New Contact Enquiry - ${websiteName}`;

  const text = `
New Contact Enquiry Received

Source Website: ${websiteName}
Name: ${name || "Not provided"}
Email: ${email || "Not provided"}
Phone: ${phone || "Not provided"}
Subject: ${subject || "No subject"}

Message:
${message || "No message"}

------------------------------------------
Automated notification for Samchilow MultiBiz Ltd.
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #222; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: #000000; border-bottom: 3px solid #D4AF37; color: #ffffff; padding: 24px; }
    .header h2 { margin: 0; font-size: 20px; color: #D4AF37; }
    .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
    .content { padding: 24px; }
    .row { margin-bottom: 16px; }
    .label { font-weight: 600; color: #4b5563; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 14px; color: #111827; }
    .footer { padding: 16px 24px; background: #f9fafb; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Contact Enquiry</h2>
      <p>${escapeHtml(websiteName)}</p>
    </div>
    <div class="content">
      <div class="row">
        <div class="label">Source Site</div>
        <div class="value">${escapeHtml(websiteName)}</div>
      </div>
      <div class="row">
        <div class="label">Client Name</div>
        <div class="value">${escapeHtml(name) || "Not provided"}</div>
      </div>
      <div class="row">
        <div class="label">Client Email</div>
        <div class="value">${escapeHtml(email) || "Not provided"}</div>
      </div>
      <div class="row">
        <div class="label">Phone Number</div>
        <div class="value">${escapeHtml(phone) || "Not provided"}</div>
      </div>
      <div class="row">
        <div class="label">Subject</div>
        <div class="value">${escapeHtml(subject) || "No subject"}</div>
      </div>
      <div class="row">
        <div class="label">Message</div>
        <div class="value" style="white-space: pre-wrap; word-break: break-word;">${
          escapeHtml(message) || "No message"
        }</div>
      </div>
    </div>
    <div class="footer">
      Automated Enquiry Notification &bull; Samchilow MultiBiz Limited
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to: companyEmail,
    subject: emailSubject,
    text,
    html,
    replyTo: email,
    fromName: websiteName,
  });
};

// ======================================================
// CLIENT CONFIRMATION EMAIL HANDLER
// ======================================================

const sendClientConfirmationEmail = async ({ name, email, website }) => {
  const isConstruction = website === "construction";
  const websiteName = isConstruction
    ? "Samchilow MultiBiz Construction"
    : "Samchilow Logistics";

  const emailSubject = `We received your enquiry - ${websiteName}`;

  const text = `
Dear ${name},

Thank you for contacting ${websiteName}.
We have received your enquiry and our team will get back to you shortly.

Best regards,
${websiteName} Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #222; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: #000000; border-bottom: 3px solid #D4AF37; color: #ffffff; padding: 24px; text-align: center; }
    .header h2 { margin: 0; color: #D4AF37; font-size: 22px; }
    .content { padding: 28px; font-size: 15px; line-height: 1.6; color: #333333; }
    .footer { padding: 16px 24px; background: #f9fafb; font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Enquiry Received</h2>
    </div>
    <div class="content">
      <p>Dear <strong>${escapeHtml(name)}</strong>,</p>
      <p>Thank you for reaching out to <strong>${escapeHtml(websiteName)}</strong>.</p>
      <p>We have successfully received your message. Our representative is reviewing your request and will reach out to you shortly via email or phone.</p>
      <br/>
      <p>Best regards,<br/><strong>${escapeHtml(websiteName)} Team</strong></p>
    </div>
    <div class="footer">
      This is an automated acknowledgment. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to: email,
    subject: emailSubject,
    text,
    html,
    fromName: websiteName,
  });
};

// ======================================================
// SIGNUP / WELCOME EMAIL HANDLER
// ======================================================

const sendWelcomeEmail = async ({ name, email, phone, clientOrigin }) => {
  const origin = clientOrigin || process.env.LOGISTICS_URL || "http://localhost:5173";

  return sendEmail({
    fromName: "Samchilow Platform",
    to: email,
    subject: "Welcome to Samchilow",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #000; border: 1px solid #eee;">
        <div style="background: #000; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #D4AF37; font-size: 28px;">SAMCHILOW</h1>
          <div style="width: 60px; height: 3px; background: #D4AF37; margin: 12px auto 0;"></div>
        </div>
        <div style="padding: 35px 30px;">
          <h2 style="color: #000; margin-top: 0;">Welcome, ${escapeHtml(name)}!</h2>
          <p style="font-size: 16px; line-height: 1.7; color: #333;">
            Thank you for creating an account with <strong>Samchilow.</strong>
          </p>
          <div style="background: #f8f8f8; border-left: 4px solid #D4AF37; padding: 18px; margin: 25px 0;">
            <p style="margin: 5px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${origin}/login" style="display: inline-block; background: #D4AF37; color: #000; text-decoration: none; padding: 13px 30px; border-radius: 6px; font-weight: bold; font-size: 15px;">
              Login to Your Account
            </a>
          </div>
        </div>
        <div style="background: #000; padding: 20px; text-align: center;">
          <p style="margin: 0; color: #D4AF37; font-size: 14px; font-weight: bold;">Samchilow Platform</p>
        </div>
      </div>
    `,
  });
};

module.exports = {
  get transporter() {
    return getTransporter();
  },
  verifyEmailTransporter,
  sendEmail,
  sendContactEmail,
  sendClientConfirmationEmail,
  sendWelcomeEmail,
};