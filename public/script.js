const socket = io();

/* ELEMENTS */
const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");
const loginBtn = document.getElementById("login-btn");
const loginMsg = document.getElementById("login-msg");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const userList = document.getElementById("user-list");
const chatTitle = document.getElementById("chat-title");
const chatWelcome = document.getElementById("chat-welcome");
const messages = document.getElementById("messages");
const chatInput = document.getElementById("chat-input");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

/* STATE */
let currentUser = null;
let currentChat = null;

/* LOGIN */
loginBtn.onclick = () => {
  socket.emit(
    "login",
    {
      username: usernameInput.value,
      password: passwordInput.value
    },
    res => {
      if (!res.ok) {
        loginMsg.innerText = res.msg;
        return;
      }

      currentUser = usernameInput.value;
      loginScreen.classList.add("hidden");
      app.classList.remove("hidden");

      renderUsers(res.users);
      showWelcome();
    }
  );
};

/* USERS */
function renderUsers(users) {
  userList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.innerText = u;
    li.onclick = () => openChat(u);
    userList.appendChild(li);
  });
}

/* CHAT */
function openChat(user) {
  currentChat = user;
  chatTitle.innerText = user;
  showChatUI();

  socket.emit("loadChat", { withUser: user }, res => {
    messages.innerHTML = "";
    res.history.forEach(m => addMessage(m));
  });
}

/* SEND */
sendBtn.onclick = () => {
  if (!messageInput.value || !currentChat) return;
  socket.emit("sendMessage", {
    to: currentChat,
    text: messageInput.value
  });
  messageInput.value = "";
};

/* RECEIVE */
socket.on("message", msg => {
  if (
    (msg.from === currentUser && msg.to === currentChat) ||
    (msg.from === currentChat && msg.to === currentUser)
  ) {
    addMessage(msg);
  }
});

/* UI HELPERS */
function addMessage(msg) {
  const div = document.createElement("div");
  div.className = "message";
  div.innerText = `${msg.from}: ${msg.text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showWelcome() {
  chatWelcome.classList.remove("hidden");
  messages.classList.add("hidden");
  chatInput.classList.add("hidden");
}

function showChatUI() {
  chatWelcome.classList.add("hidden");
  messages.classList.remove("hidden");
  chatInput.classList.remove("hidden");
}
