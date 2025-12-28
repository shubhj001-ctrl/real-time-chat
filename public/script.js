const socket = io();

/* ---------- STATE ---------- */
let currentUser = localStorage.getItem("vibeUser") || "";

/* ---------- SCREENS ---------- */
const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");

/* ---------- CHAT ---------- */
const chatBox = document.getElementById("chat-box");
const msgInput = document.getElementById("message");
const fileInput = document.getElementById("file-input");
const onlineCount = document.getElementById("online-count");

/* ---------- AUTO LOGIN ---------- */
if (currentUser) {
  authScreen.style.display = "none";
  chatScreen.classList.add("active");

  socket.emit("login", { username: currentUser, password: "__auto__" }, res => {
    if (res.ok) {
      renderHistory(res.history);
    } else {
      localStorage.removeItem("vibeUser");
      location.reload();
    }
  });
}

/* ---------- SEND TEXT ---------- */
document.getElementById("chat-form").onsubmit = e => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("chatMessage", text, () => {});
  msgInput.value = "";
};

/* ---------- SEND MEDIA ---------- */
fileInput.onchange = () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const type = file.type.startsWith("image") ? "image" : "video";

    socket.emit(
      "mediaMessage",
      { type, data: reader.result },
      () => {}
    );
  };
  reader.readAsDataURL(file);

  fileInput.value = "";
};

/* ---------- RECEIVE MESSAGE ---------- */
socket.on("chatMessage", msg => {
  addMessage(msg);
});

/* ---------- ONLINE ---------- */
socket.on("onlineCount", n => {
  onlineCount.textContent = `🟢 ${n} online`;
});

/* ---------- HELPERS ---------- */
function renderHistory(history = []) {
  chatBox.innerHTML = "";
  history.forEach(addMessage);
}

function addMessage(msg) {
  const isMe = msg.user === currentUser;

  const row = document.createElement("div");
  row.className = `message-row ${isMe ? "me" : "other"}`;

  let content = "";
  if (msg.type === "text") {
    content = `<div class="text">${msg.content}</div>`;
  } else if (msg.type === "image") {
    content = `<img src="${msg.content}" />`;
  } else if (msg.type === "video") {
    content = `<video src="${msg.content}" controls></video>`;
  }

  row.innerHTML = `
    ${!isMe ? `<div class="avatar other">${msg.user[0]}</div>` : ""}
    <div class="bubble ${isMe ? "me" : "other"}">
      ${!isMe ? `<div class="user">${msg.user}</div>` : ""}
      ${content}
      <div class="meta">
        ${new Date(msg.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
      </div>
    </div>
    ${isMe ? `<div class="avatar me">${currentUser[0]}</div>` : ""}
  `;

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}
