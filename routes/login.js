
const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, result) => {
      if (err) {
        res.send(err);
      } else if (result.length > 0) {
        res.json({
          success: true,
          user: result[0]
        });
      } else {
        res.json({
          success: false,
          message: "Invalid login"
        });
      }
    }
  );
});

module.exports = router;
