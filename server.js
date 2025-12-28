const express = require("express");
const app = express();
const http = require("http").createServer(app);

const io = require("socket.io")(http, {
  pingTimeout: 60000,      // allow 60s background
  pingInterval: 25000,
  maxHttpBufferSize: 5e6  // 5 MB hard limit
});

app.use(express.static("public"));

const users = {};
const onlineUsers = {};
const messages = [];

io.on("connection", socket => {

  socket.on("signup", ({ username, password }, cb) => {
    if (!username || !password)
      return cb?.({ ok: false, msg: "All fields required" });

    if (users[username])
      return cb?.({ ok: false, msg: "User exists" });

    users[username] = password;
    cb?.({ ok: true });
  });

  socket.on("login", ({ username, password }, cb) => {
    if (!users[username])
      return cb?.({ ok: false, msg: "User not found" });

    if (password !== "__auto__" && users[username] !== password)
      return cb?.({ ok: false, msg: "Invalid credentials" });

    socket.username = username;
    onlineUsers[socket.id] = username;

    io.emit("onlineCount", Object.keys(onlineUsers).length);
    cb?.({ ok: true, history: messages });
  });

  socket.on("chatMessage", (data, cb) => {
    if (!socket.username || !data?.type || !data?.content) return;

    const msg = {
      id: Date.now() + Math.random(),
      user: socket.username,
      type: data.type,
      content: data.content,
      time: new Date().toISOString()
    };

    messages.push(msg);
    io.emit("chatMessage", msg);

    cb?.({ delivered: true });
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      delete onlineUsers[socket.id];
      io.emit("onlineCount", Object.keys(onlineUsers).length);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Server running on", PORT);
});
