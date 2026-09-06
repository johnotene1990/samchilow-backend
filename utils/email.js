import { Resend } from 'resend';

// Initialize Resend with key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Universal email helper using Resend API
 * @param {Object} options
 * @param {string} options.from - Formatted sender string, e.g. "Name <info@domain.com>"
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Subject line
 * @param {string} options.html - HTML content
 */
export const sendEmail = async ({ from, to, subject, html }) => {
  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Resend Email Error:', error);
    throw new Error(error.message || 'Failed to send email via Resend.');
  }
};

/**
 * Sender helper for Samchilow MultiBiz
 */
export const sendMultiBizEnquiry = async ({ clientEmail, clientName, message }) => {
  return await sendEmail({
    from: 'Samchilow MultiBiz <info@samchilowmultibiz.com>',
    to: process.env.ADMIN_EMAIL || 'info@samchilowmultibiz.com',
    subject: `New MultiBiz Enquiry from ${clientName}`,
    html: `
      <h3>New Enquiry Received</h3>
      <p><strong>Name:</strong> ${clientName}</p>
      <p><strong>Email:</strong> ${clientEmail}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `,
  });
};

/**
 * Sender helper for Samchilow Logistics
 */
export const sendLogisticsEnquiry = async ({ clientEmail, clientName, message }) => {
  return await sendEmail({
    from: 'Samchilow Logistics <info@samchilowlogistics.com>',
    to: process.env.ADMIN_EMAIL || 'info@samchilowlogistics.com',
    subject: `New Logistics Enquiry from ${clientName}`,
    html: `
      <h3>New Logistics Enquiry</h3>
      <p><strong>Name:</strong> ${clientName}</p>
      <p><strong>Email:</strong> ${clientEmail}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `,
  });
};