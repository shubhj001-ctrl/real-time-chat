const socket = io();

let currentUser = localStorage.getItem("user");
let currentChat = null;
let onlineSet = new Set();

const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const chatTitle = document.getElementById("chat-title");
const messageInput = document.getElementById("message-input");

if (currentUser) {
  loginView.style.display = "none";
  appView.style.display = "flex";
}

document.getElementById("login-btn").onclick = () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  socket.emit("login", { username, password }, res => {
    if (!res.ok) return alert("Invalid login");

    currentUser = username;
    localStorage.setItem("user", username);

    loginView.style.display = "none";
    appView.style.display = "flex";

    renderUsers(res.users);
  });
};

function renderUsers(users) {
  userList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="status-dot" data-user="${u}"></span>
      <span>${u}</span>
      <span class="badge" id="badge-${u}"></span>
    `;
    li.onclick = () => openChat(u);
    userList.appendChild(li);
  });
  updatePresenceUI();
}

function openChat(user) {
  currentChat = user;
  chatTitle.innerText = user;
  chatBox.innerHTML = "";

  const badge = document.getElementById(`badge-${user}`);
  if (badge) badge.innerText = "";

  socket.emit("loadMessages", { withUser: user }, msgs => {
    msgs.forEach(renderMessage);
  });

  updatePresenceUI();
}

document.getElementById("send-btn").onclick = sendMessage;
messageInput.onkeydown = e => e.key === "Enter" && sendMessage();

function sendMessage() {
  if (!messageInput.value || !currentChat) return;

  const msg = {
    from: currentUser,
    to: currentChat,
    text: messageInput.value,
    time: Date.now()
  };

  socket.emit("sendMessage", msg);
  renderMessage(msg);
  messageInput.value = "";
}

socket.on("message", msg => {
  if (
    (msg.from === currentUser && msg.to === currentChat) ||
    (msg.from === currentChat && msg.to === currentUser)
  ) {
    renderMessage(msg);
  } else if (msg.to === currentUser) {
    const badge = document.getElementById(`badge-${msg.from}`);
    if (badge) badge.innerText = "●";
  }
});

function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = msg.from === currentUser ? "msg me" : "msg";
  div.innerText = `${msg.from}: ${msg.text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

socket.on("presence", users => {
  onlineSet = new Set(users);
  updatePresenceUI();
});

function updatePresenceUI() {
  document.querySelectorAll(".status-dot").forEach(dot => {
    dot.classList.toggle("online", onlineSet.has(dot.dataset.user));
  });

  const headerDot = document.getElementById("chat-status-dot");
  if (headerDot && currentChat) {
    headerDot.classList.toggle("online", onlineSet.has(currentChat));
  }
}
