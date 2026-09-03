const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Contact = require("../models/Contact");
const { protect } = require("../middleware/authMiddleware");

// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET || "samchilow_fallback_secret",
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      token,
      message: "Logged in successfully.",
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET /api/admin/contacts
router.get("/contacts", protect, async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, contacts });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error fetching contacts." });
  }
});

// GET /api/admin/stats
router.get("/stats", protect, async (req, res) => {
  try {
    const [total, newMessages, logistics, construction, inProgress, resolved] =
      await Promise.all([
        Contact.countDocuments(),
        Contact.countDocuments({ status: { $in: ["new", null] } }),
        Contact.countDocuments({ website: "logistics" }),
        Contact.countDocuments({ website: "construction" }),
        Contact.countDocuments({ status: "in-progress" }),
        Contact.countDocuments({ status: "resolved" }),
      ]);

    return res.status(200).json({
      success: true,
      stats: { total, newMessages, logistics, construction, inProgress, resolved },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error loading statistics." });
  }
});

// PUT /api/admin/contacts/:id/status
router.put("/contacts/:id/status", protect, async (req, res) => {
  try {
    const { status } = req.body;
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!contact) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found." });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("contact-updated", contact);
    }

    return res.status(200).json({ success: true, contact });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to update status." });
  }
});

// PUT /api/admin/change-password
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);

    if (!admin || !(await admin.matchPassword(currentPassword))) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect." });
    }

    if (admin.lastPasswordChange) {
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - new Date(admin.lastPasswordChange).getTime() < thirtyDaysInMs) {
        return res.status(400).json({
          success: false,
          message: "Password can only be changed once every 30 days.",
        });
      }
    }

    admin.password = newPassword;
    admin.lastPasswordChange = new Date();
    await admin.save();

    return res
      .status(200)
      .json({ success: true, message: "Password successfully updated." });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Password update failed." });
  }
});

// POST /api/admin/logout
router.post("/logout", protect, (req, res) => {
  return res
    .status(200)
    .json({ success: true, message: "Logout successful." });
});

module.exports = router;