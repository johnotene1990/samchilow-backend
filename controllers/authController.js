const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const { sendEmail } = require("../utils/email");

// =============================
// REGISTER USER
// =============================
const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: "Please provide name, email, phone and password",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
    });

    // Detect client origin for login link in email
    const clientOrigin = req.headers.origin || process.env.LOGISTICS_URL || "http://localhost:5173";

    try {
      await sendEmail({
        fromName: "Samchilow Platform",
        to: user.email,
        subject: "Welcome to Samchilow",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #000; border: 1px solid #eee;">
            <div style="background: #000; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #D4AF37; font-size: 28px;">SAMCHILOW</h1>
              <div style="width: 60px; height: 3px; background: #D4AF37; margin: 12px auto 0;"></div>
            </div>
            <div style="padding: 35px 30px;">
              <h2 style="color: #000; margin-top: 0;">Welcome, ${user.name}!</h2>
              <p style="font-size: 16px; line-height: 1.7; color: #333;">
                Thank you for creating an account with <strong>Samchilow.</strong>
              </p>
              <div style="background: #f8f8f8; border-left: 4px solid #D4AF37; padding: 18px; margin: 25px 0;">
                <p style="margin: 5px 0;"><strong>Name:</strong> ${user.name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
                <p style="margin: 5px 0;"><strong>Phone:</strong> ${user.phone}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${clientOrigin}/login" style="display: inline-block; background: #D4AF37; color: #000; text-decoration: none; padding: 13px 30px; border-radius: 6px; font-weight: bold; font-size: 15px;">
                  Login to Your Account
                </a>
              </div>
            </div>
            <div style="background: #000; padding: 20px; text-align: center;">
              <p style="margin: 0; color: #D4AF37; font-size: 14px; font-weight: bold;">Samchilow Platform</p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Welcome email could not be sent:", emailError);
    }

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// =============================
// LOGIN USER
// =============================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Your account has been deactivated" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const isProduction = process.env.NODE_ENV === "production";

    // Cross-domain cookie configuration
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction, 
      sameSite: isProduction ? "none" : "lax", // 'none' allows cookies across distinct domains on HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// =============================
// LOGOUT USER
// =============================
const logoutUser = (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    expires: new Date(0),
  });

  res.json({ message: "Logout successful" });
};

// =============================
// FORGOT PASSWORD
// =============================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide your email address" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.role !== "user") {
      return res.json({
        message: "If an account exists with this email, a password reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Dynamically build reset link using request origin header
    const origin = req.headers.origin || "http://localhost:5173";
    const resetUrl = `${origin}/reset-password/${resetToken}`;

    await sendEmail({
      fromName: "Samchilow Support",
      to: user.email,
      subject: "Reset Your Samchilow Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #ffffff; color: #000000;">
          <h2 style="color: #D4AF37;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password.</p>
          <p>Click the button below to create a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 25px; background: #D4AF37; color: #000000; text-decoration: none; font-weight: bold; border-radius: 5px;">
            Reset Password
          </a>
          <p style="margin-top: 25px;">This link will expire in 15 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Unable to process password reset request" });
  }
};

// =============================
// RESET PASSWORD
// =============================
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Please provide a new password" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
      role: "user",
    });

    if (!user) {
      return res.status(400).json({
        message: "Password reset link is invalid or has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Unable to reset password" });
  }
};

// =============================
// CHANGE PASSWORD
// =============================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Please provide your current and new password",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      return res.status(400).json({
        message: "New password must be different from your current password",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Unable to change password" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  changePassword,
};