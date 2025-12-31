const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const USERS = require("./defaultUsers"); // 👈 IMPORTANT

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let onlineUsers = new Set();
let messages = {};

function chatKey(a, b) {
  return [a, b].sort().join("|");
}

io.on("connection", socket => {

  socket.on("login", username => {
    if (!USERS[username]) return;

    socket.username = username;
    onlineUsers.add(username);

    // ✅ ALWAYS send full user list except self
    socket.emit(
      "users",
      Object.keys(USERS).filter(u => u !== username)
    );

    io.emit("online", [...onlineUsers]);
  });

  socket.on("loadMessages", ({ withUser }, cb) => {
    const key = chatKey(socket.username, withUser);
    cb(messages[key] || []);
  });

  socket.on("sendMessage", msg => {
    const key = chatKey(msg.from, msg.to);
    if (!messages[key]) messages[key] = [];
    messages[key].push(msg);

    io.emit("message", msg);
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.username);
    io.emit("online", [...onlineUsers]);
  });
});

server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
