const express = require("express");
const router = express.Router();

const menuItems = [
  { name: "Dal Makhani", price_half: 90, price_full: 170 },
  { name: "Butter Chicken", price_half: 275, price_full: 475 },
  { name: "Mutton Rogan Josh", price_half: 350, price_full: 650 },
  { name: "Tandoori Chicken", price_half: 230, price_full: 430 },
  { name: "Paneer Tikka", price_half: 200, price_full: 0 }
];

router.get("/", (req, res) => {
  res.json(menuItems);
});

module.exports = router;
