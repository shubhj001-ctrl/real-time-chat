const socket = io();

const usernameContainer = document.getElementById("username-container");
const chatContainer = document.getElementById("chat-container");
const usernameForm = document.getElementById("username-form");
const usernameInput = document.getElementById("username-input");

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message");
const chatBox = document.getElementById("chat-box");

let username = "";

// Join chat
usernameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  username = usernameInput.value.trim();
  if (!username) return;

  socket.emit("join", username);

  usernameContainer.classList.add("hidden");
  chatContainer.classList.remove("hidden");
});

// Send message
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (messageInput.value.trim() === "") return;

  socket.emit("chatMessage", messageInput.value);
  messageInput.value = "";
});

// Receive chat message
socket.on("chatMessage", (data) => {
  const div = document.createElement("div");
  div.classList.add("message");

  if (data.user === username) {
    div.classList.add("me");
    div.textContent = data.text;
  } else {
    div.classList.add("other");
    div.textContent = `${data.user}: ${data.text}`;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// System messages (join / leave)
socket.on("systemMessage", (msg) => {
  const div = document.createElement("div");
  div.className = "system";
  div.textContent = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});
