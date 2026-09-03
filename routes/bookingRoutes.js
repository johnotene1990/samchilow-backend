const express = require("express");

const {
  submitBooking,
} = require("../controllers/bookingController");

const router = express.Router();

// ============================================================
// POST BOOKING
// ============================================================

router.post("/", submitBooking);

module.exports = router;