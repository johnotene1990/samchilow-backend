const { Resend } = require('resend');

// Initialize Resend API client using environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Dynamic domain & branding config resolver
 */
const getDomainConfig = (website) => {
  const isLogistics = website && website.toLowerCase().includes('logistics');

  if (isLogistics) {
    return {
      senderName: 'Samchilow Logistics',
      fromEmail: 'info@samchilowmultibiz.com',
      adminEmail: process.env.ADMIN_EMAIL || 'info@samchilowmultibiz.com',
      brandName: 'Samchilow Logistics',
    };
  }

  return {
    senderName: 'Samchilow MultiBiz',
    fromEmail: 'info@samchilowmultibiz.com',
    adminEmail: process.env.ADMIN_EMAIL || 'info@samchilowmultibiz.com',
    brandName: 'Samchilow MultiBiz Nig. Ltd.',
  };
};

/**
 * 1. Admin Notification Email
 */
const sendContactEmail = async ({ name, email, phone, subject, message, website }) => {
  const config = getDomainConfig(website);

  return await resend.emails.send({
    from: `${config.senderName} <${config.fromEmail}>`,
    to: config.adminEmail,
    subject: `[New Enquiry] ${subject || 'Contact Form Submission'} - ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #1a365d; margin-top: 0;">New Contact Enquiry (${config.brandName})</h2>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
        <p><strong>Source Website:</strong> ${website}</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p><strong>Message:</strong></p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #0284c7;">
          ${message}
        </div>
      </div>
    `,
  });
};

/**
 * 2. Client Auto-Reply Confirmation Email
 */
const sendClientConfirmationEmail = async ({ name, email, website }) => {
  const config = getDomainConfig(website);

  return await resend.emails.send({
    from: `${config.senderName} <${config.fromEmail}>`,
    to: email,
    subject: `Thank you for contacting ${config.brandName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #1a365d; margin-top: 0;">Hello ${name},</h2>
        <p>Thank you for reaching out to <strong>${config.brandName}</strong>.</p>
        <p>We have successfully received your enquiry. Our team will review your message and get back to you shortly.</p>
        <br />
        <p style="margin-bottom: 0;">Best regards,</p>
        <p style="margin-top: 0;"><strong>${config.brandName} Team</strong></p>
      </div>
    `,
  });
};

module.exports = {
  sendContactEmail,
  sendClientConfirmationEmail,
};