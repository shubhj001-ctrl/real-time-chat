const socket = io();

/* ---------- STATE ---------- */
let isLogin = true;
let currentUser = localStorage.getItem("vibeUser") || "";

/* ---------- SCREENS ---------- */
const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");

/* ---------- AUTH UI ---------- */
const authTitle = document.getElementById("auth-title");
const authSub = document.getElementById("auth-sub");
const authMsg = document.getElementById("auth-msg");

const userInput = document.getElementById("auth-user");
const passInput = document.getElementById("auth-pass");

const primaryBtn = document.getElementById("primary-btn");
const switchBtn = document.getElementById("switch-btn");

/* ---------- CHAT UI ---------- */
const chatBox = document.getElementById("chat-box");
const msgInput = document.getElementById("message");
const typingDiv = document.getElementById("typing");
const onlineCount = document.getElementById("online-count");

/* ---------- PREVENT LOGIN FLASH ---------- */
if (currentUser) {
  authScreen.style.display = "none";
  chatScreen.classList.add("active");

  socket.emit(
    "login",
    { username: currentUser, password: "__auto__" },
    res => {
      if (!res.ok) {
        localStorage.removeItem("vibeUser");
        location.reload();
        return;
      }

      // 🔥 RESTORE CHAT HISTORY
      renderHistory(res.history);
    }
  );
}

/* ---------- AUTH MODE SWITCH ---------- */
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

/* ---------- AUTH ACTION ---------- */
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
      authMsg.textContent = "✅ Signup successful. You can login now.";
      authMsg.style.color = "lightgreen";
      isLogin = true;
      switchBtn.click();
      return;
    }

    currentUser = username;
    localStorage.setItem("vibeUser", username);

    authScreen.style.display = "none";
    chatScreen.classList.add("active");

    renderHistory(res.history);
  });
};

/* ---------- CHAT SEND ---------- */
document.getElementById("chat-form").onsubmit = e => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("chatMessage", text, () => {});
  msgInput.value = "";
};

/* ---------- RECEIVE ---------- */
socket.on("chatMessage", msg => {
  addMessage(msg);
});

/* ---------- ONLINE ---------- */
socket.on("onlineCount", n => {
  onlineCount.textContent = `🟢 ${n} online`;
});

/* ---------- TYPING ---------- */
let typingTimeout;
msgInput.oninput = () => {
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("typing", false), 800);
};

socket.on("typing", data => {
  typingDiv.textContent = data.isTyping ? `${data.user} is typing…` : "";
});

/* ---------- HELPERS ---------- */
function renderHistory(history = []) {
  chatBox.innerHTML = "";
  history.forEach(addMessage);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addMessage(msg) {
  const isMe = msg.user === currentUser;

  const row = document.createElement("div");
  row.className = `message-row ${isMe ? "me" : "other"}`;

  row.innerHTML = `
    ${!isMe ? `<div class="avatar other">${msg.user[0]}</div>` : ""}
    <div class="bubble ${isMe ? "me" : "other"}">
      ${!isMe ? `<div class="user">${msg.user}</div>` : ""}
      <div class="text">${msg.text}</div>
      <div class="meta">${new Date(msg.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div>
    </div>
    ${isMe ? `<div class="avatar me">${currentUser[0]}</div>` : ""}
  `;

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}
