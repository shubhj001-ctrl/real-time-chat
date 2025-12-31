const socket = io();

/* LOGIN ELEMENTS */
const loginScreen = document.getElementById("login-screen");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const usernameInput = document.getElementById("login-username");
const passwordInput = document.getElementById("login-password");

/* APP ELEMENTS */
const app = document.getElementById("app");
const logoutBtn = document.getElementById("logout-btn");
const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const chatTitle = document.getElementById("chat-title");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

/* STATE */
let currentUser = null;
let currentChat = null;

/* ===== AUTO LOGIN ON REFRESH ===== */
const savedUser = localStorage.getItem("veyon_user");
const savedPass = localStorage.getItem("veyon_pass");

if (savedUser && savedPass) {
  attemptLogin(savedUser, savedPass, true);
}

/* LOGIN CLICK */
loginBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  loginError.classList.add("hidden");

  if (!username || !password) {
    loginError.textContent = "Username and password are required.";
    loginError.classList.remove("hidden");
    return;
  }

  attemptLogin(username, password, false);
});

/* LOGIN FUNCTION */
function attemptLogin(username, password, silent) {
  socket.emit("login", { username, password }, res => {
    if (!res || !res.ok) {
      if (!silent) {
        loginError.textContent = "You don’t have access to this portal.";
        loginError.classList.remove("hidden");
      }
      localStorage.clear();
      return;
    }

    currentUser = username;

    localStorage.setItem("veyon_user", username);
    localStorage.setItem("veyon_pass", password);

    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");

    renderUsers(res.users);
  });
}

/* LOGOUT */
logoutBtn.onclick = () => {
  localStorage.removeItem("veyon_user");
  localStorage.removeItem("veyon_pass");
  location.reload();
};

/* USERS */
function renderUsers(users) {
  userList.innerHTML = "";

  if (!users || users.length === 0) {
    userList.innerHTML = `
      <div style="opacity:.6;padding:14px">
        No users available
      </div>`;
    return;
  }

  users.forEach(u => {
    const div = document.createElement("div");
    div.className = "user-card";
    div.innerText = u;
    div.onclick = () => openChat(u);
    userList.appendChild(div);
  });
}

/* OPEN CHAT */
function openChat(user) {
  currentChat = user;
  chatTitle.innerText = user;
  chatBox.innerHTML = "";

  socket.emit("loadMessages", { withUser: user }, msgs => {
    msgs.forEach(renderMessage);
  });
}

/* SEND MESSAGE */
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  if (!currentChat) return;

  const text = input.value.trim();
  if (!text) return;

  socket.emit("sendMessage", {
    from: currentUser,
    to: currentChat,
    text,
    time: Date.now()
  });

  input.value = "";
}

/* RECEIVE MESSAGE */
socket.on("message", msg => {
  if (
    (msg.from === currentChat && msg.to === currentUser) ||
    (msg.from === currentUser && msg.to === currentChat)
  ) {
    renderMessage(msg);
  }
});

/* RENDER MESSAGE */
function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "message" + (msg.from === currentUser ? " me" : "");
  div.innerText = msg.text;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
