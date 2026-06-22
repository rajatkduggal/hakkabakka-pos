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

// Socket.io connection
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Port
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
