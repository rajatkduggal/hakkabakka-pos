
const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/", (req, res) => {
    const { table_no, order_type, total_amount } = req.body;

    db.query(
        "INSERT INTO orders (table_no, order_type, total_amount) VALUES (?, ?, ?)",
        [table_no, order_type, total_amount],
        (err, result) => {
            if (err) {
                res.send(err);
            } else {
                res.json({
                    success: true,
                    order_id: result.insertId
                });
            }
        }
    );
});

router.get("/", (req, res) => {
    db.query("SELECT * FROM orders", (err, result) => {
        if (err) {
            res.send(err);
        } else {
            res.json(result);
        }
    });
});

module.exports = router;
