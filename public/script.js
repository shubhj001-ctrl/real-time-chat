const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const chatTitle = document.getElementById("chat-title");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

let currentChat = null;

/* USERS */
["boss", "weed", "alex", "sam"].forEach(u => {
  const div = document.createElement("div");
  div.className = "user-card";
  div.innerText = u;
  div.onclick = () => openChat(u);
  userList.appendChild(div);
});

function openChat(user) {
  currentChat = user;
  chatTitle.innerText = user;
  chatBox.innerHTML = "";
}

/* SEND WITH REAL ANIMATION */
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  if (!currentChat) return;

  const text = input.value.trim();
  if (!text) return;

  // 1️⃣ Create floating message at input position
  const floating = document.createElement("div");
  floating.className = "message me floating";
  floating.innerText = text;
  document.body.appendChild(floating);

  const inputRect = input.getBoundingClientRect();
  const chatRect = chatBox.getBoundingClientRect();

  floating.style.left = inputRect.left + "px";
  floating.style.top = inputRect.top + "px";
  floating.style.width = inputRect.width + "px";

  // 2️⃣ Trigger animation
  requestAnimationFrame(() => {
    floating.style.transform = `translateY(${chatRect.top - inputRect.top - 20}px) scale(1)`;
    floating.style.opacity = "0";
  });

  // 3️⃣ After animation, add real message
  setTimeout(() => {
    floating.remove();

    const msg = document.createElement("div");
msg.className = "message me";
msg.innerText = text;

/* force animation restart */
msg.style.animation = "none";
chatBox.appendChild(msg);
msg.offsetHeight; // reflow
msg.style.animation = "";

chatBox.scrollTop = chatBox.scrollHeight;

  }, 300);

  input.value = "";
}
