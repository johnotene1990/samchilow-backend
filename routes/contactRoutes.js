const express = require("express");
const { sendContactMessage } = require("../controllers/contactController");

const router = express.Router();

// Fallback safety check to prevent route crash on deploy
const handleContact = typeof sendContactMessage === "function" 
  ? sendContactMessage 
  : (req, res) => res.status(500).json({ success: false, message: "Contact controller handler is missing" });

// POST /api/contact
router.post("/", handleContact);

module.exports = router;