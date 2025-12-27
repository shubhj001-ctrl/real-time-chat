const socket = io();

function sendMessage() {
  const input = document.getElementById("message");
  const chatBox = document.getElementById("chat-box");

  if (input.value.trim() === "") return;

  socket.emit("chatMessage", input.value);
  input.value = "";
}

socket.on("chatMessage", (msg) => {
  const chatBox = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = "message";
  div.textContent = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});
