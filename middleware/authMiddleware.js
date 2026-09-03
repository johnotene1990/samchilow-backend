const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");

// ======================================================
// PROTECT ROUTES
// ======================================================

const protect = async (req, res, next) => {
  try {
    // --------------------------------------------------
    // 1. EXTRACT TOKEN (BEARER HEADER OR COOKIES)
    // --------------------------------------------------
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.cookies?.adminToken) {
      token = req.cookies.adminToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    // --------------------------------------------------
    // 2. CHECK JWT SECRET
    // --------------------------------------------------
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is missing from environment variables.");
      return res.status(500).json({
        success: false,
        message: "Authentication configuration error.",
      });
    }

    // --------------------------------------------------
    // 3. VERIFY TOKEN
    // --------------------------------------------------
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token payload.",
      });
    }

    // --------------------------------------------------
    // 4. FIND ACCOUNT (CHECK ADMIN FIRST, THEN USER)
    // --------------------------------------------------
    let account = await Admin.findById(decoded.id).select("-password");

    if (account) {
      req.admin = account;
      req.user = account; // Backwards compatibility for req.user access
      return next();
    }

    // Fallback to User model
    account = await User.findById(decoded.id).select("-password");

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Account associated with token no longer exists.",
      });
    }

    // --------------------------------------------------
    // 5. CHECK ACCOUNT STATUS (FOR USER MODEL)
    // --------------------------------------------------
    if (account.isActive === false) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been deactivated. Please contact administrator.",
      });
    }

    // --------------------------------------------------
    // 6. ATTACH TO REQUEST
    // --------------------------------------------------
    req.user = account;
    next();
  } catch (error) {
    console.error("❌ Authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token. Please log in again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

// ======================================================
// ADMIN ONLY MIDDLEWARE
// ======================================================

const adminOnly = (req, res, next) => {
  // If req.admin is already set by protect middleware, grant access
  if (req.admin) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  next();
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  protect,
  adminOnly,
};