// const express = require("express");

// const {
//   sendContactMessage,
// } = require("../controllers/contactController");

// const router = express.Router();

// // ============================================================
// // CONTACT API
// // ============================================================

// router.post("/", (req, res, next) => {
//   console.log("==============================================");
//   console.log("📩 POST /api/contact RECEIVED");
//   console.log("Request body:", req.body);
//   console.log("==============================================");

//   next();
// }, sendContactMessage);

// module.exports = router;


// const express = require("express");

// const {
//   sendContactMessage,
// } = require("../controllers/contactController");

// const router = express.Router();

// router.post("/", sendContactMessage);

// module.exports = router;




const express = require("express");
const { sendContactMessage } = require("../controllers/contactController");

const router = express.Router();

// Matches POST /api/contact
router.post("/", sendContactMessage);

module.exports = router;