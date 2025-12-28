const socket = io();

/* ======================
   STATE
====================== */
let isLogin = true;
let currentUser = localStorage.getItem("vibeUser") || "";

/* ======================
   ELEMENTS
====================== */
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
const onlineCount = document.getElementById("online-count");

/* ======================
   INITIAL UI STATE
====================== */
authScreen.style.display = "flex";
chatScreen.classList.remove("active");

/* ======================
   AUTO LOGIN
====================== */
if (currentUser) {
  socket.emit(
    "login",
    { username: currentUser, password: "__auto__" },
    res => {
      if (res.ok) {
        authScreen.style.display = "none";
        chatScreen.classList.add("active");
        renderHistory(res.history);
      } else {
        localStorage.removeItem("vibeUser");
      }
    }
  );
}

/* ======================
   AUTH TOGGLE
====================== */
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

/* ======================
   LOGIN / SIGNUP ACTION
====================== */
primaryBtn.onclick = () => {
  const username = userInput.value.trim();
  const password = passInput.value.trim();

  if (!username || !password) {
    authMsg.textContent = "⚠️ Fill all fields";
    authMsg.style.color = "orange";
    return;
  }

  socket.emit(
    isLogin ? "login" : "signup",
    { username, password },
    res => {
      if (!res.ok) {
        authMsg.textContent = res.msg;
        authMsg.style.color = "red";
        return;
      }

      // Signup success → go back to login
      if (!isLogin) {
        authMsg.textContent = "✅ Signup successful. Please login.";
        authMsg.style.color = "lightgreen";
        isLogin = true;
        switchBtn.click();
        return;
      }

      // Login success
      currentUser = username;
      localStorage.setItem("vibeUser", username);

      authScreen.style.display = "none";
      chatScreen.classList.add("active");

      renderHistory(res.history);
    }
  );
};

/* ======================
   SEND TEXT MESSAGE
====================== */
document.getElementById("chat-form").onsubmit = e => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("chatMessage", text);
  msgInput.value = "";
};

/* ======================
   SEND MEDIA
====================== */
fileInput.onchange = () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const type = file.type.startsWith("image") ? "image" : "video";
    socket.emit("mediaMessage", { type, data: reader.result });
  };

  reader.readAsDataURL(file);
  fileInput.value = "";
};

/* ======================
   RECEIVE MESSAGE
====================== */
socket.on("chatMessage", msg => addMessage(msg));

/* ======================
   ONLINE COUNT
====================== */
socket.on("onlineCount", n => {
  onlineCount.textContent = `🟢 ${n} online`;
});

/* ======================
   RENDER HELPERS
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
  if (msg.type === "text") {
    content = `<div class="text">${msg.content}</div>`;
  } else if (msg.type === "image") {
    content = `<img src="${msg.content}" />`;
  } else if (msg.type === "video") {
    content = `<video src="${msg.content}" controls></video>`;
  }

  row.innerHTML = `
    ${!isMe ? `<div class="avatar other">${msg.user[0].toUpperCase()}</div>` : ""}
    <div class="bubble ${isMe ? "me" : "other"}">
      ${!isMe ? `<div class="user">${msg.user}</div>` : ""}
      ${content}
      <div class="meta">
        ${new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
    ${isMe ? `<div class="avatar me">${currentUser[0].toUpperCase()}</div>` : ""}
  `;

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}
