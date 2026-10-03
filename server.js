const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const orderRoutes = require("./routes/orders");
const menuRoutes = require("./routes/menu");
const loginRoutes = require("./routes/login");
const db = require("./config/db");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, service: "hakkabakka-pos" });
});

app.use("/login", loginRoutes);
app.use("/menu", menuRoutes);
app.use("/orders", orderRoutes);

app.get("/", (req, res) => {
  res.send("Hakka Bakka POS Server Running");
});

app.get("/tables", (req, res) => {
  const tables = [];
  for (let i = 1; i <= 20; i++) {
    tables.push({ table_no: i, status: "Available" });
  }
  res.json(tables);
});

app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1");
    res.json({ success: true, message: "Database Connected", data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

io.on("connection", (socket) => {
  console.log("Client Connected");
  socket.on("disconnect", () => console.log("Client Disconnected"));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
