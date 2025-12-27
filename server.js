const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("join", (username) => {
    socket.username = username;
    socket.broadcast.emit("systemMessage", `${username} joined the chat`);
  });

  socket.on("chatMessage", (msg) => {
    io.emit("chatMessage", {
      user: socket.username,
      text: msg
    });
  });

  socket.on("disconnect", () => {
    if (socket.username) {
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
