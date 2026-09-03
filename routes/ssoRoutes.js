const express = require("express");

const {
  createSsoCode,
  exchangeSsoCode,
} = require("../controllers/ssoController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/create",
  protect,
  createSsoCode
);

router.post(
  "/exchange",
  exchangeSsoCode
);

module.exports = router;