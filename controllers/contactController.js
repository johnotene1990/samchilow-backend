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

    // 2. PARALLEL EMAIL DISPATCH WITH PROMISE.ALLSETTLED
    // Ensures both emails complete before Render suspends the request container,
    // while guaranteeing the user gets a 201 response even if SMTP experiences delay.
    const emailResults = await Promise.allSettled([
      sendContactEmail({
        name,
        email,
        phone,
        subject,
        message,
        website: siteContext,
      }),
      sendClientConfirmationEmail({
        name,
        email,
        website: siteContext,
      }),
    ]);

    // Log any email failures for debugging on Render
    if (emailResults[0].status === "rejected") {
      console.error(
        "⚠️ Company admin notification email failed:",
        emailResults[0].reason?.message || emailResults[0].reason
      );
    }
    if (emailResults[1].status === "rejected") {
      console.error(
        "⚠️ Client confirmation email failed:",
        emailResults[1].reason?.message || emailResults[1].reason
      );
    }

    // 3. Success Response
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