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
const io = new Server(server);

app.use(cors());
app.use(express.json());

// Routes
app.use("/login", loginRoutes);
app.use("/menu", menuRoutes);
app.use("/orders", orderRoutes);

// Home route
app.get("/", (req, res) => {
  res.send("Hakka Bakka POS Server Running");
});

// Tables route
app.get("/tables", (req, res) => {
  const tables = [];

  for (let i = 1; i <= 20; i++) {
    tables.push({
      table_no: i,
      status: "Available"
    });
  }

  res.json(tables);
});

// Database test route
app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1");
    res.json({
      success: true,
      message: "Database Connected",
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Socket.io
io.on("connection", (socket) => {
  console.log("Client Connected");

  socket.on("disconnect", () => {
    console.log("Client Disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
