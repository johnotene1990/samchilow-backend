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

console.log("==============================================");
console.log("SHARED SMTP CONFIGURATION (LOGISTICS & CONSTRUCTION)");
console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
console.log("EMAIL_PORT:", emailPort);
console.log("EMAIL_SECURE:", isSecure);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log(
  "EMAIL_PASS:",
  emailPassword
    ? `LOADED (${emailPassword.length} characters)`
    : "NOT LOADED"
);
console.log("==============================================");

let activeTransporter = null;
let isUsingFallback = false;

const createPrimaryTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: emailPort,
    secure: isSecure,
    pool: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPassword,
    },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 4000,
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

    console.log("==============================================");
    console.log("✅ PRIMARY SMTP CONNECTION SUCCESSFUL");
    console.log("==============================================");
    console.log("Email server ready for Logistics & Construction.");
    console.log(`SMTP: ${process.env.EMAIL_HOST}:${emailPort}`);
    console.log(`Mailbox: ${process.env.EMAIL_USER}`);
    console.log("==============================================");

    return true;
  } catch (error) {
    console.warn("==============================================");
    console.warn("⚠️ PRIMARY SMTP TIMED OUT (LOCAL PORT BLOCKED)");
    console.warn("==============================================");
    console.warn(`Reason: ${error.message} (${error.code || "ETIMEDOUT"})`);
    console.warn("👉 Activating Ethereal Email sandbox for local dev...");

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

      isUsingFallback = true;

      console.log("==============================================");
      console.log("✅ DEV FALLBACK TRANSPORTER ACTIVE (ETHEREAL)");
      console.log("==============================================");
      console.log("Enquiries will output clickable preview links in terminal.");
      console.log("==============================================");

      return true;
    } catch (fallbackError) {
      console.error("❌ Failed to initialize fallback transporter:", fallbackError.message);
      return false;
    }
  }
};

// ======================================================
// GENERIC SEND EMAIL FUNCTION
// ======================================================

const sendEmail = async ({ to, subject, text, html, replyTo, fromName }) => {
  try {
    if (!to) {
      throw new Error("Email recipient is required.");
    }

    if (!subject) {
      throw new Error("Email subject is required.");
    }

    const senderTitle = fromName || "Samchilow MultiBiz Limited";

    const mailOptions = {
      from: `"${senderTitle}" <${process.env.EMAIL_USER}>`,
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

    console.log("📧 Sending email to:", to);

    const currentTransporter = getTransporter();
    const info = await currentTransporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully.");
    console.log("Message ID:", info.messageId);

    if (isUsingFallback) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("==============================================");
      console.log("🔗 DEMO EMAIL PREVIEW LINK:");
      console.log(previewUrl);
      console.log("==============================================");
    }

    return info;
  } catch (error) {
    console.error("❌ EMAIL SEND ERROR:", error);
    throw error;
  }
};

// ======================================================
// CONTACT ENQUIRY HANDLER FOR BOTH WEBSITES
// ======================================================

const sendContactEmail = async ({
  name,
  email,
  phone,
  subject,
  message,
  website,
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  const isConstruction = website === "construction";
  const websiteName = isConstruction
    ? "Samchilow MultiBiz Construction"
    : "Samchilow Logistics";

  const emailSubject = subject
    ? `[${websiteName}] ${subject}`
    : `New Contact Enquiry - ${websiteName}`;

  const text = `
New Contact Enquiry

Website Source: ${websiteName}
Name: ${name || "Not provided"}
Email: ${email || "Not provided"}
Phone: ${phone || "Not provided"}
Subject: ${subject || "No subject"}

Message:
${message || "No message"}

------------------------------------------
Automated notification from Samchilow Platform.
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #222; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: ${isConstruction ? "#1e3a8a" : "#111827"}; color: #ffffff; padding: 24px; }
    .header h2 { margin: 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
    .content { padding: 24px; }
    .row { margin-bottom: 16px; }
    .label { font-weight: 600; color: #4b5563; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 14px; color: #111827; }
    .footer { padding: 16px 24px; background: #f9fafb; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
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
        <div class="label">Name</div>
        <div class="value">${escapeHtml(name) || "Not provided"}</div>
      </div>
      <div class="row">
        <div class="label">Email</div>
        <div class="value">${escapeHtml(email) || "Not provided"}</div>
      </div>
      <div class="row">
        <div class="label">Phone</div>
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
      Automated notification sent to ${escapeHtml(adminEmail)}
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to: adminEmail,
    subject: emailSubject,
    text,
    html,
    replyTo: email,
    fromName: websiteName,
  });
};

module.exports = {
  get transporter() {
    return getTransporter();
  },
  verifyEmailTransporter,
  sendEmail,
  sendContactEmail,
};