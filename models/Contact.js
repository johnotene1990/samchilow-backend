const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    subject: {
      type: String,
      trim: true,
      default: "General Enquiry",
    },

    message: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
    },

    website: {
      type: String,
      enum: {
        values: ["logistics", "construction"],
        message: "{VALUE} is not a supported website category",
      },
      required: [true, "Website source is required"],
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: ["new", "read", "in-progress", "resolved"],
        message: "{VALUE} is not a valid status",
      },
      default: "new",
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to optimize sorting contacts by date per website on Admin Dashboard
contactSchema.index({ website: 1, createdAt: -1 });
contactSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Contact", contactSchema);