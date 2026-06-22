const express = require("express");
const router = express.Router();

// Temporary static menu for testing
router.get("/", (req, res) => {
  res.json([
    {
      name: "Butter Chicken",
      price_half: 220,
      price_full: 420
    },
    {
      name: "Kadai Paneer",
      price_half: 180,
      price_full: 340
    },
    {
      name: "Dal Makhani",
      price_half: 150,
      price_full: 280
    },
    {
      name: "Tandoori Roti",
      price_half: 15,
      price_full: 30
    }
  ]);
});

module.exports = router;
