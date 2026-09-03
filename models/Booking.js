const mongoose = require("mongoose");

// ============================================================
// BOOKING SCHEMA
// ============================================================

const bookingSchema = new mongoose.Schema(
  {
    // ========================================================
    // ORDER INFORMATION
    // ========================================================

    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ========================================================
    // CUSTOMER INFORMATION
    // ========================================================

    firstname: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },

    lastname: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    // ========================================================
    // LOGISTICS INFORMATION
    // ========================================================

    pickup: {
      type: String,
      required: [true, "Pickup location is required"],
      trim: true,
    },

    delivery: {
      type: String,
      required: [true, "Delivery location is required"],
      trim: true,
    },

    vehicle: {
      type: String,
      required: [true, "Vehicle type is required"],
      trim: true,
    },

    date: {
      type: Date,
      required: [true, "Booking date is required"],
    },

    // ========================================================
    // BOOKING STATUS
    // ========================================================

    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Assigned",
        "In Transit",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },

    // ========================================================
    // ADMIN NOTES
    // ========================================================

    adminNotes: {
      type: String,
      default: "",
      trim: true,
    },

    // ========================================================
    // EMAIL STATUS
    // ========================================================

    adminEmailSent: {
      type: Boolean,
      default: false,
    },

    customerEmailSent: {
      type: Boolean,
      default: false,
    },

    // ========================================================
    // WHATSAPP STATUS
    // ========================================================

    whatsappSent: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  }
);


// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Booking", bookingSchema);