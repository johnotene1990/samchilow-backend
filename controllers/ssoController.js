const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const SsoCode = require("../models/SsoCode");

// ==========================================
// CREATE SSO CODE
// ==========================================

const createSsoCode = async (req, res) => {
  try {
    const { target } = req.body;

    if (!["logistics", "construction"].includes(target)) {
      return res.status(400).json({
        message: "Invalid portal target",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    // Generate a secure random one-time code
    const rawCode = crypto.randomBytes(32).toString("hex");

    // Store only the hash of the code
    const codeHash = crypto
      .createHash("sha256")
      .update(rawCode)
      .digest("hex");

    // Code expires after 60 seconds
    const expiresAt = new Date(
      Date.now() + 60 * 1000
    );

    await SsoCode.create({
      codeHash,
      userId: req.user._id,
      target,
      expiresAt,
      used: false,
    });

    const targetUrl =
      target === "construction"
        ? process.env.CONSTRUCTION_URL
        : process.env.LOGISTICS_URL;

    const redirectUrl =
      `${targetUrl}/sso/callback?code=${rawCode}`;

    res.json({
      redirectUrl,
    });

  } catch (error) {
    console.error("Create SSO code error:", error);

    res.status(500).json({
      message: "Unable to create SSO session",
    });
  }
};


// ==========================================
// EXCHANGE SSO CODE
// ==========================================

const exchangeSsoCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        message: "SSO code is required",
      });
    }

    // Hash the received code
    const codeHash = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    // Find unused SSO code
    const ssoCode = await SsoCode.findOne({
      codeHash,
      used: false,
    });

    if (!ssoCode) {
      return res.status(401).json({
        message: "Invalid or already used SSO code",
      });
    }

    // Check expiration
    if (ssoCode.expiresAt < new Date()) {
      ssoCode.used = true;
      await ssoCode.save();

      return res.status(401).json({
        message: "SSO code has expired",
      });
    }

    // Find user
    const user = await User.findById(
      ssoCode.userId
    );

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    // Make sure account is active
    if (user.status !== "active") {
      return res.status(403).json({
        message: "Your account has been deactivated",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // IMPORTANT:
    // Mark SSO code as used immediately
    ssoCode.used = true;
    await ssoCode.save();

    // Create authentication cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "SSO login successful",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("SSO exchange error:", error);

    res.status(500).json({
      message: "Unable to complete SSO authentication",
    });
  }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
  createSsoCode,
  exchangeSsoCode,
};