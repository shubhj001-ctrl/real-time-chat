const socket = io();

const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const chatTitle = document.getElementById("chat-title");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

let currentUser = "shubh"; // temp
let currentChat = null;

// Fake users for layout testing
["boss", "weed", "alex", "sam"].forEach(u => {
  const div = document.createElement("div");
  div.className = "user-card";
  div.innerText = u;
  div.onclick = () => openChat(u);
  userList.appendChild(div);
});

function openChat(user) {
  currentChat = user;
  chatTitle.innerText = user;
  chatBox.innerHTML = "";
}

sendBtn.onclick = () => {
  if (!input.value) return;

  const msg = document.createElement("div");
  msg.className = "message me";
  msg.innerText = input.value;

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  input.value = "";
};
