const Contact = require("../models/Contact");
const { sendContactEmail, sendClientConfirmationEmail } = require("../utils/email");

// =============================
// SUBMIT CONTACT ENQUIRY
// =============================
const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message, website } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        message: "Please provide name, email, and message",
      });
    }

    // Determine target website context (defaults to logistics if unspecified)
    const siteContext = website || "logistics";

    // 1. Save Enquiry to Database
    const contactEntry = await Contact.create({
      name,
      email: email.toLowerCase(),
      phone: phone || "",
      subject: subject || "New Contact Enquiry",
      message,
      website: siteContext,
    });

    // 2. NON-BLOCKING BACKGROUND EMAIL DISPATCH (ADMIN & CLIENT)
    // Ensures response completes instantly (<200ms) without hanging HTTP request

    // Send notification to company (info@samchilowmultibiz.com)
    sendContactEmail({
      name,
      email,
      phone,
      subject,
      message,
      website: siteContext,
    }).catch((emailErr) => {
      console.error(
        "⚠️ Company admin notification email failed in background:",
        emailErr.message
      );
    });

    // Send acknowledgement to client
    sendClientConfirmationEmail({
      name,
      email,
      website: siteContext,
    }).catch((emailErr) => {
      console.error(
        "⚠️ Client confirmation email failed in background:",
        emailErr.message
      );
    });

    // 3. Instant Success Response
    return res.status(201).json({
      message: "Your enquiry has been sent successfully. Our team will contact you shortly.",
      data: contactEntry,
    });
  } catch (error) {
    console.error("Submit contact enquiry error:", error);
    return res.status(500).json({
      message: "Server error while submitting your enquiry. Please try again later.",
    });
  }
};

// =============================
// GET ALL ENQUIRIES (ADMIN)
// =============================
const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    return res.json({ count: contacts.length, contacts });
  } catch (error) {
    console.error("Get contacts error:", error);
    return res.status(500).json({ message: "Server error while fetching contacts" });
  }
};

module.exports = {
  submitContact,
  getContacts,
};