require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const User = require("./models/User");

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: process.env.ADMIN_EMAIL,
    });

    if (existingAdmin) {
      console.log("An account with this email already exists.");

      process.exit(0);
    }

    // Hash admin password
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      10
    );

    // Create admin
    const admin = await User.create({
      name: "Samchilow Administrator",
      email: process.env.ADMIN_EMAIL,
      phone: "0000000000",
      password: hashedPassword,
      role: "admin",
      status: "active",
    });

    console.log("=================================");
    console.log("ADMIN CREATED SUCCESSFULLY");
    console.log("=================================");
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log("Password: Stored securely as a hash.");
    console.log("=================================");

    process.exit(0);

  } catch (error) {
    console.error("Failed to create admin:", error.message);

    process.exit(1);
  }
};

createAdmin();