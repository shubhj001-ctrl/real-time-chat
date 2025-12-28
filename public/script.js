const socket = io();

let currentUser = localStorage.getItem("vibeUser") || "";
let replyContext = null;

const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");

const chatBox = document.getElementById("chat-box");
const msgInput = document.getElementById("message");
const fileInput = document.getElementById("file-input");
const chatForm = document.getElementById("chat-form");
const onlineCount = document.getElementById("online-count");

const replyBar = document.getElementById("reply-bar");
const replyUser = document.getElementById("reply-user");
const replyText = document.getElementById("reply-text");
const cancelReply = document.getElementById("cancel-reply");

/* ---------- AUTO LOGIN ---------- */
if (currentUser) {
  socket.emit("login", { username: currentUser, password: "__auto__" }, res => {
    if (res.ok) {
      authScreen.style.display = "none";
      chatScreen.classList.add("active");
      res.history.forEach(addMessage);
    }
  });
}

/* ---------- SEND TEXT ---------- */
chatForm.onsubmit = e => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("chatMessage", {
    type: "text",
    content: text,
    replyTo: replyContext
  });

  clearReply();
  msgInput.value = "";
};

/* ---------- SEND MEDIA ---------- */
fileInput.onchange = () => {
  const file = fileInput.files[0];
  if (!file) return;

  const type = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
    ? "video"
    : null;

  if (!type) {
    alert("Unsupported file");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    socket.emit("chatMessage", {
      type,
      content: reader.result,
      replyTo: replyContext
    });
    clearReply();
  };

  reader.readAsDataURL(file);
  fileInput.value = "";
};

/* ---------- RECEIVE ---------- */
socket.on("chatMessage", msg => addMessage(msg));

socket.on("onlineCount", n => {
  onlineCount.textContent = `🟢 ${n} online`;
});

/* ---------- REPLY UI ---------- */
cancelReply.onclick = clearReply;

function setReply(msg) {
  replyContext = {
    user: msg.user,
    content: msg.content,
    type: msg.type
  };

  replyUser.textContent = msg.user;
  replyText.textContent =
    msg.type === "text" ? msg.content : msg.type.toUpperCase();

  replyBar.style.display = "flex";
}

function clearReply() {
  replyContext = null;
  replyBar.style.display = "none";
}

/* ---------- RENDER MESSAGE ---------- */
function addMessage(msg) {
  const isMe = msg.user === currentUser;
  const row = document.createElement("div");
  row.className = `message-row ${isMe ? "me" : "other"}`;

  let mainContent = "";
  if (msg.type === "text") mainContent = `<div>${msg.content}</div>`;
  if (msg.type === "image") mainContent = `<img src="${msg.content}" />`;
  if (msg.type === "video") mainContent = `<video src="${msg.content}" controls></video>`;

  let replyHtml = "";
  if (msg.replyTo) {
    replyHtml = `
      <div class="reply-preview">
        <strong>${msg.replyTo.user}</strong>
        <span>${
          msg.replyTo.type === "text"
            ? msg.replyTo.content
            : msg.replyTo.type.toUpperCase()
        }</span>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="bubble ${isMe ? "me" : "other"}">
      ${replyHtml}
      ${mainContent}
      <div class="meta">${new Date(msg.time).toLocaleTimeString()}</div>
      <button class="reply-btn">↩️</button>
    </div>
  `;

  row.querySelector(".reply-btn").onclick = () => setReply(msg);

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}
