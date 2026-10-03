const express = require("express");
const router = express.Router();
const db = require("../config/db");

function cleanOrder(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  return {
    order_no: String(body.order_no || "").trim(),
    source: String(body.source || "ONLINE").trim().toUpperCase(),
    order_type: String(body.order_type || "").trim(),
    customer_name: String(body.customer_name || "").trim(),
    customer_phone: String(body.customer_phone || "").trim(),
    address: body.address ? String(body.address).trim() : null,
    pincode: body.pincode ? String(body.pincode).trim() : null,
    food_total: Number(body.food_total || 0),
    delivery_charges: Number(body.delivery_charges || 0),
    total: Number(body.total_amount ?? body.total ?? 0),
    payment_status: String(body.payment_status || "UNPAID").trim().toUpperCase(),
    special_instructions: body.special_instructions ? String(body.special_instructions).trim() : null,
    items: items.map((x) => ({
      name: String(x.name || "").trim(),
      qty: Math.max(1, Number(x.qty || 1)),
      price: Number(x.price || 0)
    })).filter((x) => x.name && Number.isFinite(x.price) && x.price >= 0)
  };
}

router.post("/online", async (req, res) => {
  const o = cleanOrder(req.body);
  if (!o.order_no || !o.order_type || !o.customer_name || !/^\d{10}$/.test(o.customer_phone)) {
    return res.status(400).json({ success: false, message: "Missing or invalid order/customer details." });
  }
  if (!o.items.length || !Number.isFinite(o.total) || o.total <= 0) {
    return res.status(400).json({ success: false, message: "Order items and total are required." });
  }
  const calculatedFood = o.items.reduce((sum, x) => sum + (x.price * x.qty), 0);
  if (Math.abs(calculatedFood - o.food_total) > 0.01 || Math.abs((o.food_total + o.delivery_charges) - o.total) > 0.01) {
    return res.status(400).json({ success: false, message: "Order total validation failed." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query("SELECT id, order_no FROM orders WHERE order_no=? LIMIT 1", [o.order_no]);
    if (existing.length) {
      await conn.rollback();
      return res.status(200).json({ success: true, duplicate: true, order_id: existing[0].id, order_no: existing[0].order_no });
    }
    const [result] = await conn.query(
      `INSERT INTO orders
      (order_no, source, order_type, customer_name, customer_phone, address, pincode, food_total, delivery_charges, total, payment_status, status, special_instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?)`,
      [o.order_no, o.source, o.order_type, o.customer_name, o.customer_phone, o.address, o.pincode, o.food_total, o.delivery_charges, o.total, o.payment_status, o.special_instructions]
    );
    for (const item of o.items) {
      await conn.query("INSERT INTO order_items (order_id, item_name, qty, price) VALUES (?, ?, ?, ?)",
        [result.insertId, item.name, item.qty, item.price]);
    }
    await conn.commit();
    return res.status(201).json({ success: true, order_id: result.insertId, order_no: o.order_no, status: "NEW" });
  } catch (error) {
    await conn.rollback();
    console.error("Online order error:", error);
    return res.status(500).json({ success: false, message: "Could not save online order." });
  } finally {
    conn.release();
  }
});

router.post("/test", async (req, res) => {
  const o = cleanOrder(req.body);
  if (!o.order_no || !o.order_type || !o.customer_name || !/^\\d{10}$/.test(o.customer_phone)) {
    return res.status(400).json({ success: false, message: "Missing or invalid test order/customer details." });
  }
  if (!o.items.length || !Number.isFinite(o.total) || o.total <= 0) {
    return res.status(400).json({ success: false, message: "Test order items and total are required." });
  }
  const calculatedFood = o.items.reduce((sum, x) => sum + (x.price * x.qty), 0);
  if (Math.abs(calculatedFood - o.food_total) > 0.01 || Math.abs((o.food_total + o.delivery_charges) - o.total) > 0.01) {
    return res.status(400).json({ success: false, message: "Test order total validation failed." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO orders
      (order_no, source, order_type, customer_name, customer_phone, address, pincode, food_total, delivery_charges, total, payment_status, status, special_instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?)`,
      [o.order_no, "TEST", o.order_type, o.customer_name, o.customer_phone, o.address, o.pincode, o.food_total, o.delivery_charges, o.total, "TEST_NOT_CHARGED", "POS_TEST"]
    );
    for (const item of o.items) {
      await conn.query("INSERT INTO order_items (order_id, item_name, qty, price) VALUES (?, ?, ?, ?)",
        [result.insertId, item.name, item.qty, item.price]);
    }
    await conn.rollback();
    return res.status(200).json({
      success: true,
      test: true,
      rolled_back: true,
      message: "POS test passed. Database transaction was rolled back; no order was saved.",
      validated_items: o.items.length
    });
  } catch (error) {
    await conn.rollback();
    console.error("POS test error:", error);
    return res.status(500).json({ success: false, message: "POS test failed." });
  } finally {
    conn.release();
  }
});

router.get("/", async (req, res) => {
  try {
    const source = String(req.query.source || "").trim().toUpperCase();
    const status = String(req.query.status || "").trim().toUpperCase();
    const params = [];
    const where = [];
    if (source) { where.push("source=?"); params.push(source); }
    if (status) { where.push("status=?"); params.push(status); }
    const sql = `SELECT * FROM orders${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC`;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load orders." });
  }
});

router.get("/:id/items", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM order_items WHERE order_id=? ORDER BY id", [req.params.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load order items." });
  }
});

router.put("/:id/status", async (req, res) => {
  const allowed = ["NEW", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"];
  const status = String(req.body.status || "").toUpperCase();
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: "Invalid status." });
  try {
    const [result] = await db.query("UPDATE orders SET status=? WHERE id=?", [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Order not found." });
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not update order status." });
  }
});

module.exports = router;
