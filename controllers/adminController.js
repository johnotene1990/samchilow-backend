const jwt = require("jsonwebtoken");
const Contact = require("../models/Contact");
// Note: If you have an Admin model for changePassword, uncomment the line below:
// const Admin = require("../models/Admin");

// ======================================================
// ADMIN LOGIN
// ======================================================

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (
      email.toLowerCase() !==
      process.env.ADMIN_EMAIL.toLowerCase()
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }

    const token = jwt.sign(
      {
        email,
        role: "admin",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Admin login successful.",
    });
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};


// ======================================================
// ADMIN LOGOUT
// ======================================================

const adminLogout = async (req, res) => {
  try {
    res.clearCookie("adminToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
    });

    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("ADMIN LOGOUT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to logout.",
    });
  }
};


// ======================================================
// CHANGE PASSWORD
// ======================================================

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin?._id; // Extracted from Auth Middleware

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin user not found." });
    }

    // Check 30-day constraint
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (admin.lastPasswordChange) {
      const timeSinceLastChange = Date.now() - new Date(admin.lastPasswordChange).getTime();

      if (timeSinceLastChange < THIRTY_DAYS_MS) {
        const daysRemaining = Math.ceil(
          (THIRTY_DAYS_MS - timeSinceLastChange) / (1000 * 60 * 60 * 24)
        );
        return res.status(400).json({
          success: false,
          message: `Password can only be updated once every 30 days. Please wait ${daysRemaining} day(s).`,
        });
      }
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    // Update password and lastPasswordChange timestamp
    admin.password = newPassword;
    admin.lastPasswordChange = new Date();
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ success: false, message: "Server error changing password." });
  }
};


// ======================================================
// GET ALL CONTACT ENQUIRIES
// ======================================================

const getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Contact.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: enquiries.length,
      enquiries,
    });
  } catch (error) {
    console.error("GET ALL ENQUIRIES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve enquiries.",
    });
  }
};


// ======================================================
// GET CONTACTS
// Kept for compatibility with existing frontend/routes
// ======================================================

const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find()
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      contacts,
    });
  } catch (error) {
    console.error("GET CONTACTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve enquiries.",
    });
  }
};


// ======================================================
// UPDATE CONTACT STATUS
// ======================================================

const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "new",
      "read",
      "in-progress",
      "resolved",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      {
        status,
        isRead: status !== "new",
      },
      {
        new: true,
      }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found.",
      });
    }

    if (req.io) {
      req.io.emit("contact-updated", contact);
    }

    return res.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error("UPDATE CONTACT STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update enquiry.",
    });
  }
};


// ======================================================
// DELETE CONTACT ENQUIRY
// ======================================================

const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found.",
      });
    }

    if (req.io) {
      req.io.emit("contact-deleted", { id });
    }

    return res.json({
      success: true,
      message: "Enquiry deleted successfully.",
      id,
    });
  } catch (error) {
    console.error("DELETE CONTACT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete enquiry.",
    });
  }
};


// ======================================================
// DASHBOARD STATISTICS
// ======================================================

const getDashboardStats = async (req, res) => {
  try {
    const total = await Contact.countDocuments();

    const newMessages = await Contact.countDocuments({
      status: "new",
    });

    const logistics = await Contact.countDocuments({
      website: "logistics",
    });

    const construction = await Contact.countDocuments({
      website: "construction",
    });

    const inProgress = await Contact.countDocuments({
      status: "in-progress",
    });

    const resolved = await Contact.countDocuments({
      status: "resolved",
    });

    return res.json({
      success: true,
      stats: {
        total,
        newMessages,
        logistics,
        construction,
        inProgress,
        resolved,
      },
    });
  } catch (error) {
    console.error("DASHBOARD STATISTICS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve dashboard statistics.",
    });
  }
};


// ======================================================
// GET ALL BOOKINGS
// TEMPORARY SAFE HANDLER
// ======================================================

const getAllBookings = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      count: 0,
      bookings: [],
      message:
        "Booking controller is ready. Connect the existing Booking model.",
    });
  } catch (error) {
    console.error("GET ALL BOOKINGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve bookings.",
    });
  }
};


// ======================================================
// GET ALL CUSTOMERS
// TEMPORARY SAFE HANDLER
// ======================================================

const getAllCustomers = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      count: 0,
      customers: [],
      message:
        "Customer controller is ready. Connect the existing customer model.",
    });
  } catch (error) {
    console.error("GET ALL CUSTOMERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve customers.",
    });
  }
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  adminLogin,
  adminLogout,
  changePassword,

  getContacts,
  getAllEnquiries,
  updateContactStatus,
  deleteContact,

  getDashboardStats,

  getAllBookings,
  getAllCustomers,
};