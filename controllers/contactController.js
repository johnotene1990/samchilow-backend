const Contact = require("../models/Contact");
const { sendContactEmail, sendClientConfirmationEmail } = require("../utils/email");

const sendContactMessage = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      subject,
      message,
      website,
    } = req.body;

    console.log("====================================");
    console.log("📩 NEW CONTACT ENQUIRY");
    console.log("Website:", website);
    console.log("Name:", name);
    console.log("Email:", email);
    console.log("====================================");

    // ================================
    // VALIDATION
    // ================================

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email and message are required.",
      });
    }

    if (!website || !["logistics", "construction"].includes(website.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid website source. Must be 'logistics' or 'construction'.",
      });
    }

    // ================================
    // SAVE TO DATABASE
    // ================================

    const enquiry = await Contact.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || "",
      subject: subject?.trim() || "General Enquiry",
      message: message.trim(),
      website: website.toLowerCase(),
    });

    console.log("✅ Enquiry saved to MongoDB ID:", enquiry._id);

    // ================================
    // SOCKET.IO REAL-TIME UPDATE (ADMIN PANEL)
    // ================================

    if (req.io) {
      req.io.emit("new-contact", enquiry);
    }

    // ================================
    // ASYNCHRONOUS EMAIL DELIVERIES
    // ================================
    
    // Send email to Admin
    sendContactEmail({
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      subject: enquiry.subject,
      message: enquiry.message,
      website: enquiry.website,
    }).catch((err) => console.error("⚠️ Admin notification email failed:", err.message));

    // Send confirmation email to Client
    sendClientConfirmationEmail({
      name: enquiry.name,
      email: enquiry.email,
      website: enquiry.website,
    }).catch((err) => console.error("⚠️ Client confirmation email failed:", err.message));

    // Return immediate success to client (database record is already secured)
    return res.status(201).json({
      success: true,
      message:
        "Your enquiry has been sent successfully. Our team will contact you shortly.",
      enquiry,
    });
  } catch (error) {
    console.error("❌ CONTACT CONTROLLER ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        "We could not send your enquiry at the moment. Please try again later.",
    });
  }
};

module.exports = {
  sendContactMessage,
};