const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const connectDB = require("./config/db");

// =============================
// ROUTES
// =============================
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const ssoRoutes = require("./routes/ssoRoutes");
const contactRoutes = require("./routes/contactRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");

// =============================
// EMAIL
// =============================
const { verifyEmailTransporter } = require("./utils/email");

// =============================
// APP & SERVER SETUP
// =============================
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// =============================
// DATABASE
// =============================
connectDB();

// =============================
// CORS CONFIGURATION
// =============================
const allowedOrigins = [
  // "http://localhost:5173",
  // "http://localhost:5174",
  // "http://localhost:5175",
  "https://samchilowlogistics.com",
  "https://www.samchilowlogistics.com",
  "https://samchilowmultibiz.com",
  "https://www.samchilowmultibiz.com",
  process.env.LOGISTICS_URL,
  process.env.CONSTRUCTION_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.error("❌ CORS BLOCKED REQUEST FROM:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// =============================
// SOCKET.IO ATTACHMENT
// =============================
const io = new Server(server, {
  cors: corsOptions,
});

// Middleware to inject `io` into every Express request
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  console.log("⚡ New client connected to Socket.IO:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// =============================
// BODY & COOKIE PARSERS
// =============================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// =============================
// API ROUTES
// =============================
app.use("/api/bookings", bookingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sso", ssoRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);

// =============================
// HEALTH & TEST ROUTES
// =============================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Samchilow Platform API is running",
    services: {
      logistics: true,
      construction: true,
      admin: true,
      contact: true,
      bookings: true,
    },
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
    database: "Connected",
    timestamp: new Date().toISOString(),
  });
});

// =============================
// 404 & ERROR HANDLERS
// =============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Request blocked by CORS policy.",
    });
  }

  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request.",
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
});

// =============================
// START SERVER
// =============================
server.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  try {
    await verifyEmailTransporter();
  } catch (error) {
    console.error("❌ Email transporter verification failed:", error);
  }
});
