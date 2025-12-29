const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

/* ======================
   STATE
====================== */
let currentUser = "";
let isUploading = false;
let replyContext = null;
let keepAliveTimer = null;

/* ======================
   ELEMENTS
====================== */
const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");

const authMsg = document.getElementById("auth-msg");
const userInput = document.getElementById("auth-user");
const passInput = document.getElementById("auth-pass");
const primaryBtn = document.getElementById("primary-btn");

const chatBox = document.getElementById("chat-box");
const msgInput = document.getElementById("message");
const fileInput = document.getElementById("file-input");
const chatForm = document.getElementById("chat-form");
const onlineCount = document.getElementById("online-count");

const replyBar = document.getElementById("reply-bar");
const replyUser = document.getElementById("reply-user");
const replyText = document.getElementById("reply-text");
const cancelReply = document.getElementById("cancel-reply");

/* ======================
   KEEP ALIVE (CRITICAL)
====================== */
function startKeepAlive() {
  stopKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (socket.connected) {
      socket.emit("keepAlive");
    }
  }, 20000); // every 20 seconds
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

/* ======================
   LOGIN
====================== */
primaryBtn.onclick = () => {
  const username = userInput.value.trim();
  const password = passInput.value.trim();

  if (!username || !password) {
    authMsg.textContent = "⚠️ Enter username & password";
    authMsg.style.color = "orange";
    return;
  }

  socket.emit("login", { username, password }, res => {
    if (!res?.ok) {
      authMsg.textContent = res.msg || "Login failed";
      authMsg.style.color = "red";
      return;
    }

    currentUser = username;

    authScreen.style.display = "none";
    chatScreen.classList.add("active");

    renderHistory(res.history);
    startKeepAlive();
  });
};

/* ======================
   AUTO REJOIN AFTER DISCONNECT
====================== */
socket.on("connect", () => {
  if (currentUser) {
    socket.emit("login", { username: currentUser, password: "jaggibaba" }, res => {
      if (res?.ok) {
        renderHistory(res.history);
        startKeepAlive();
      }
    });
  }
});

socket.on("disconnect", () => {
  stopKeepAlive();
});

/* ======================
   SEND TEXT
====================== */
chatForm.onsubmit = e => {
  e.preventDefault();
  if (isUploading) return;

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

/* ======================
   SEND MEDIA
====================== */
fileInput.onchange = () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    alert("Unsupported file");
    return;
  }

  const maxSize = isImage ? 2 * 1024 * 1024 : 4 * 1024 * 1024;
  if (file.size > maxSize) {
    alert(isImage ? "Image max 2MB" : "Video max 4MB");
    return;
  }

  isUploading = true;
  msgInput.disabled = true;

  const reader = new FileReader();
  reader.onload = () => {
    socket.emit("chatMessage", {
      type: isImage ? "image" : "video",
      content: reader.result,
      replyTo: replyContext
    });

    isUploading = false;
    msgInput.disabled = false;
    clearReply();
  };

  reader.readAsDataURL(file);
  fileInput.value = "";
};

/* ======================
   RECEIVE
====================== */
socket.on("chatMessage", msg => addMessage(msg));

socket.on("onlineCount", n => {
  onlineCount.textContent = `🟢 ${n} online`;
});

/* ======================
   REPLY
====================== */
cancelReply.onclick = clearReply;

function setReply(msg) {
  replyContext = {
    user: msg.user,
    type: msg.type,
    content: msg.content
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

/* ======================
   RENDER
====================== */
function renderHistory(history = []) {
  chatBox.innerHTML = "";
  history.forEach(addMessage);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addMessage(msg) {
  const isMe = msg.user === currentUser;
  const row = document.createElement("div");
  row.className = `message-row ${isMe ? "me" : "other"}`;

  let content = "";
  if (msg.type === "text") content = `<div class="text">${msg.content}</div>`;
  if (msg.type === "image") content = `<img src="${msg.content}" />`;
  if (msg.type === "video") content = `<video src="${msg.content}" controls></video>`;

  let replyHtml = "";
  if (msg.replyTo) {
    replyHtml = `
      <div class="reply-preview">
        <strong>${msg.replyTo.user}</strong><br/>
        <span>${msg.replyTo.type === "text" ? msg.replyTo.content : msg.replyTo.type.toUpperCase()}</span>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="bubble ${isMe ? "me" : "other"}">
      ${replyHtml}
      ${content}
      <div class="meta">${new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      <button class="reply-btn">↩️</button>
    </div>
  `;

  row.querySelector(".reply-btn").onclick = () => setReply(msg);

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}
