const db = require("./config/db");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hakka Bakka POS Server Running");
});

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
app.get("/db-test", (req, res) => {
  db.query("SELECT * FROM restaurant_tables", (err, result) => {
    if (err) {
      res.send(err);
    } else {
      res.json(result);
    }
  });
});

io.on("connection", (socket) => {
  console.log("User connected");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
