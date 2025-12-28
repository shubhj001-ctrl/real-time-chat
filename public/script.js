const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

/* ---------- STATE ---------- */
let isLogin = true;
let currentUser = localStorage.getItem("vibeUser") || "";
let isUploading = false;

/* ---------- ELEMENTS ---------- */
const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");

const authTitle = document.getElementById("auth-title");
const authSub = document.getElementById("auth-sub");
const authMsg = document.getElementById("auth-msg");

const userInput = document.getElementById("auth-user");
const passInput = document.getElementById("auth-pass");

const primaryBtn = document.getElementById("primary-btn");
const switchBtn = document.getElementById("switch-btn");

const chatBox = document.getElementById("chat-box");
const msgInput = document.getElementById("message");
const fileInput = document.getElementById("file-input");
const chatForm = document.getElementById("chat-form");
const onlineCount = document.getElementById("online-count");

/* ---------- AUTO LOGIN ---------- */
if (currentUser) {
  socket.emit("login", { username: currentUser, password: "__auto__" }, res => {
    if (res.ok) {
      authScreen.style.display = "none";
      chatScreen.classList.add("active");
      res.history.forEach(addMessage);
    } else {
      localStorage.removeItem("vibeUser");
    }
  });
}

/* ---------- AUTH TOGGLE ---------- */
switchBtn.onclick = () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? "Welcome back 👋" : "Create account ✨";
  authSub.textContent = isLogin ? "Login to continue" : "Signup to get started";
  primaryBtn.textContent = isLogin ? "Login" : "Signup";
  switchBtn.textContent = isLogin
    ? "Don’t have an account? Signup"
    : "Already have an account? Login";
  authMsg.textContent = "";
};

/* ---------- LOGIN / SIGNUP ---------- */
primaryBtn.onclick = () => {
  const username = userInput.value.trim();
  const password = passInput.value.trim();

  if (!username || !password) {
    authMsg.textContent = "⚠️ Fill all fields";
    authMsg.style.color = "orange";
    return;
  }

  socket.emit(isLogin ? "login" : "signup", { username, password }, res => {
    if (!res.ok) {
      authMsg.textContent = res.msg;
      authMsg.style.color = "red";
      return;
    }

    if (!isLogin) {
      authMsg.textContent = "✅ Signup successful. Please login.";
      authMsg.style.color = "lightgreen";
      isLogin = true;
      switchBtn.click();
      return;
    }

    currentUser = username;
    localStorage.setItem("vibeUser", username);

    authScreen.style.display = "none";
    chatScreen.classList.add("active");

    res.history.forEach(addMessage);
  });
};

/* ---------- SEND TEXT ---------- */
chatForm.onsubmit = e => {
  e.preventDefault();
  if (isUploading) return;

  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("chatMessage", {
    type: "text",
    content: text
  });

  msgInput.value = "";
};

/* ---------- SEND MEDIA (SAFE) ---------- */
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
    fileInput.value = "";
    return;
  }

  isUploading = true;
  msgInput.disabled = true;

  const reader = new FileReader();
  reader.onload = () => {
    socket.emit(
      "chatMessage",
      {
        type: isImage ? "image" : "video",
        content: reader.result
      },
      () => {
        isUploading = false;
        msgInput.disabled = false;
      }
    );
  };

  reader.readAsDataURL(file);
  fileInput.value = "";
};

/* ---------- RECEIVE ---------- */
socket.on("chatMessage", msg => addMessage(msg));

socket.on("onlineCount", n => {
  onlineCount.textContent = `🟢 ${n} online`;
});

/* ---------- RENDER ---------- */
function addMessage(msg) {
  const isMe = msg.user === currentUser;
  const row = document.createElement("div");
  row.className = `message-row ${isMe ? "me" : "other"}`;

  let content = "";
  if (msg.type === "text") content = `<div class="text">${msg.content}</div>`;
  if (msg.type === "image") content = `<img src="${msg.content}" />`;
  if (msg.type === "video") content = `<video src="${msg.content}" controls></video>`;

  row.innerHTML = `
    ${!isMe ? `<div class="avatar other">${msg.user[0]}</div>` : ""}
    <div class="bubble ${isMe ? "me" : "other"}">
      ${!isMe ? `<div class="user">${msg.user}</div>` : ""}
      ${content}
      <div class="meta">${new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
    </div>
    ${isMe ? `<div class="avatar me">${currentUser[0]}</div>` : ""}
  `;

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}
