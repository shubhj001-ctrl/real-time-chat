const socket = io();

/* ---------- STATE ---------- */
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

let isLogin = true;

/* ---------- AUTO LOGIN (SAFE) ---------- */
if (currentUser) {
  authScreen.style.display = "none";
  chatScreen.classList.add("active");

  socket.emit(
    "login",
    { username: currentUser, password: "__auto__" },
    res => {
      if (res.ok) {
        renderHistory(res.history);
      } else {
        // 🔥 FIX: reset broken session
        localStorage.removeItem("vibeUser");
        currentUser = "";
        chatScreen.classList.remove("active");
        authScreen.style.display = "flex";
        authMsg.textContent = "Session expired. Please login again.";
        authMsg.style.color = "orange";
      }
    }
  );
}

/* ---------- SWITCH LOGIN / SIGNUP ---------- */
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

/* ---------- CHAT ---------- */
const chatBox = document.getElementById("chat-box");
const msgInput = document.getElementById("message");

document.getElementById("chat-form").onsubmit = e => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("chatMessage", text);
  msgInput.value = "";
};

socket.on("chatMessage", msg => addMessage(msg));

/* ---------- HELPERS ---------- */
function renderHistory(history = []) {
  chatBox.innerHTML = "";
  history.forEach(addMessage);
}

function addMessage(msg) {
  const isMe = msg.user === currentUser;
  const div = document.createElement("div");
  div.textContent = `${msg.user}: ${msg.content}`;
  chatBox.appendChild(div);
}
