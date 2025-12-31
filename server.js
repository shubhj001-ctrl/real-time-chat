const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const USERS = require("./defaultUsers");

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
  console.log("🔌 New socket connected:", socket.id);

  socket.on("login", (data, cb) => {
    console.log("➡️ Login attempt:", data);
  socket.on("typing", data => {
  if (!currentChat || !currentUser) return;

  if (data.from === currentChat && data.to === currentUser) {
    typingIndicator.textContent = `${data.from} is typing`;
    typingIndicator.classList.remove("hidden");
  }
});

socket.on("stopTyping", data => {
  if (!currentChat || !currentUser) return;

  if (data.from === currentChat && data.to === currentUser) {
    typingIndicator.classList.add("hidden");
  }
});




    // 🔒 HARD VALIDATION
    if (
      !data ||
      !data.username ||
      !data.password ||
      !USERS[data.username] ||
      USERS[data.username] !== data.password
    ) {
      console.log("❌ Login failed for:", data?.username);
      if (cb) cb({ ok: false });
      return;
    }

    socket.username = data.username;
    onlineUsers.add(data.username);

    console.log("✅ Login success:", data.username);

    if (cb) {
      cb({
        ok: true,
        users: Object.keys(USERS).filter(u => u !== data.username)
      });
    }

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
    console.log("❌ Disconnected:", socket.username);
    onlineUsers.delete(socket.username);
    io.emit("online", [...onlineUsers]);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
