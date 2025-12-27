const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User joins with username
  socket.on("join", (username) => {
    if (!username) return;

    socket.username = username;
    socket.joined = true;

    socket.broadcast.emit(
      "systemMessage",
      `${username} joined the chat`
    );
  });

  // Chat message
  socket.on("chatMessage", (msg) => {
    // HARD SAFETY CHECK
    if (!socket.joined || !socket.username) {
      return; // silently ignore invalid messages
    }

    io.emit("chatMessage", {
      user: socket.username,
      text: msg
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.joined && socket.username) {
      socket.broadcast.emit(
        "systemMessage",
        `${socket.username} left the chat`
      );
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
