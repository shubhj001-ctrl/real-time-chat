document.addEventListener("DOMContentLoaded", () => {
  let onlineSet = new Set();
let lastSeenMap = {};
  const socket = io();
  

  /* ========= ELEMENTS ========= */
  const loadingScreen = document.getElementById("loading-screen");
  const loginScreen = document.getElementById("login-screen");
  const app = document.getElementById("app");
  const isMobile = window.innerWidth <= 768;

  const loginBtn = document.getElementById("login-btn");
  const loginError = document.getElementById("login-error");
  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");

  const logoutBtn = document.getElementById("logout-btn");
  const userList = document.getElementById("user-list");
  const chatBox = document.getElementById("chat-box");
  const chatTitle = document.getElementById("chat-title");
  const input = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");

  const emptyChat = document.getElementById("empty-chat");
  const chatFooter = document.getElementById("chat-footer");
  const typingBubble = document.getElementById("typing-bubble");

  const replyPreview = document.getElementById("reply-preview");
  const replyUser = document.getElementById("reply-user");
  const replyText = document.getElementById("reply-text");
  const cancelReplyBtn = document.getElementById("cancel-reply");
  const mediaPreview = document.getElementById("media-preview");
const mediaPreviewImg = document.getElementById("media-preview-img");
const removeMediaBtn = document.getElementById("remove-media");


  /* ========= STATE ========= */
  let currentUser = null;
  let currentChat = null;
  let replyTarget = null;
  let allUsers = [];
  let unreadCounts = JSON.parse(localStorage.getItem("veyon_unread") || "{}");
  let typingTimeout = null;
  let selectedMedia = null;

  const imageOverlay = document.getElementById("image-preview-overlay");
const imageOverlayImg = document.getElementById("image-preview-img");
const imageOverlayClose = document.getElementById("image-preview-close");

function openImagePreview(src) {
  imageOverlayImg.src = src;
  imageOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeImagePreview() {
  imageOverlay.classList.add("hidden");
  imageOverlayImg.src = "";
  document.body.style.overflow = "";
}

imageOverlayClose.onclick = closeImagePreview;
imageOverlay.onclick = (e) => {
  if (e.target === imageOverlay) closeImagePreview();
};

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeImagePreview();
});


  /* ========= LOADER ========= */
  const brand = "Veyon";
let charIndex = 0;
let typingInterval = null;

const loadingWord = document.getElementById("loading-word");

function startTypingOnce(onComplete) {
  if (typingInterval) clearInterval(typingInterval);

  loadingWord.textContent = "";
  charIndex = 0;

  typingInterval = setInterval(() => {
    if (charIndex < brand.length) {
      loadingWord.textContent += brand[charIndex];
      charIndex++;
    } else {
      clearInterval(typingInterval);
      typingInterval = null;

      setTimeout(() => {
        onComplete && onComplete();
      }, 400);
    }
  }, 200);
}
startTypingOnce(() => {
  loadingScreen.classList.add("fade-out");
  setTimeout(() => {
    loadingScreen.style.display = "none";
    loginScreen.classList.remove("hidden");
  }, 600);
});

socket.on("typing", data => {
  if (
    data.from === currentChat &&
    data.to === currentUser
  ) {
    typingBubble.classList.remove("hidden");
    typingBubble.classList.add("show");

    // ensure it stays at bottom of messages
    chatBox.appendChild(typingBubble);
    requestAnimationFrame(() => {
  chatBox.scrollTop = chatBox.scrollHeight;
});
  }
});
socket.on("connect", () => {
  console.log("✅ Socket connected");
});

socket.on("stopTyping", data => {
  if (
    data.from === currentChat &&
    data.to === currentUser
  ) {
    typingBubble.classList.remove("show");
    setTimeout(() => {
      typingBubble.classList.add("hidden");
    }, 200);
  }
});

socket.on("message", msg => {
  // 🔥 Ignore echo of own message (already rendered)
  if (msg.from === currentUser) return;

  if (
    msg.from === currentChat &&
    msg.to === currentUser
  ) {
    renderMessage(msg);
  } else {
    unreadCounts[msg.from] = (unreadCounts[msg.from] || 0) + 1;
    localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
    renderUsers();
  }
});

const backBtn = document.getElementById("back-btn");
if (backBtn) {
backBtn.onclick = () => {
  const sidebar = document.querySelector(".sidebar");
  const chatArea = document.querySelector(".chat-area");

  chatArea.classList.remove("active");
  chatArea.style.display = "none";
  sidebar.style.display = "flex";

  currentChat = null;
};  
}

if (window.visualViewport) {
  const viewport = window.visualViewport;

  function adjustForKeyboard() {
    const keyboardHeight =
      window.innerHeight - viewport.height - viewport.offsetTop;

    if (keyboardHeight > 0) {
      chatFooter.style.bottom = `${keyboardHeight}px`;
    } else {
      chatFooter.style.bottom = "0px";
    }

    // keep messages visible
    requestAnimationFrame(() => {
  chatBox.scrollTop = chatBox.scrollHeight;
});
  }

  viewport.addEventListener("resize", adjustForKeyboard);
  viewport.addEventListener("scroll", adjustForKeyboard);
}

const mediaBtn = document.getElementById("media-btn");
const mediaInput = document.getElementById("media-input");

mediaBtn.onclick = () => mediaInput.click();

  /* ========= LOGIN ========= */
  loginBtn.onclick = () => {
    const u = usernameInput.value.trim();
    const p = passwordInput.value.trim();

    if (!u || !p) {
      loginError.textContent = "Username and password required.";
      loginError.classList.remove("hidden");
      return;
    }

    socket.emit("login", { username: u, password: p }, res => {
      if (!res?.ok) {
        loginError.textContent = "Access denied.";
        loginError.classList.remove("hidden");
        return;
      }

      currentUser = u;
      localStorage.setItem("veyon_user", u);
      localStorage.setItem("veyon_pass", p);

      loginScreen.classList.add("hidden");
      app.classList.remove("hidden");

      allUsers = res.users;
      renderUsers();

      showEmptyChat();
    });
  };

  logoutBtn.onclick = () => {
    localStorage.clear();
    location.reload();
  };

  /* ========= USERS ========= */
  function renderUsers() {
    userList.innerHTML = "";

    allUsers.forEach(u => {
      const div = document.createElement("div");
      div.className = "user-card";
      div.textContent = u;

      if (unreadCounts[u]) {
        const badge = document.createElement("span");
        badge.className = "unread-badge show";
        badge.textContent = unreadCounts[u] > 9 ? "9+" : unreadCounts[u];
        div.appendChild(badge);
      }

      div.onclick = () => openChat(u);
      userList.appendChild(div);
    });
  }

  /* ========= CHAT ========= */
function showEmptyChat() {
  chatTitle.textContent = "Select a chat";
  emptyChat.classList.remove("hidden");
  emptyChat.style.display = "flex";

  chatBox.classList.add("hidden");
  chatFooter.classList.add("hidden");
}

console.log("Opening chat:", user);

 function openChat(user) {
  emptyChat.classList.add("hidden");
emptyChat.style.display = "none"; // 🔥 THIS FIXES IT

  currentChat = user;

  localStorage.setItem("veyon_last_chat", user);

  // avatar letter
document.getElementById("chat-avatar-letter").textContent =
  user.charAt(0).toUpperCase();


  if (isMobile) {
  const sidebar = document.querySelector(".sidebar");
  const chatArea = document.querySelector(".chat-area");

  sidebar.style.display = "none";
  chatArea.classList.add("active");
  chatArea.style.display = "flex"; // 🔥 FORCE REPAINT
}

  chatTitle.textContent = user;
  chatBox.classList.remove("hidden");
  chatFooter.classList.remove("hidden");

  delete unreadCounts[user];
  localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
  renderUsers();

  chatBox.innerHTML = "";

socket.emit("loadMessages", { withUser: user }, msgs => {
  msgs.forEach(renderMessage);
  requestAnimationFrame(() => {
  chatBox.scrollTop = chatBox.scrollHeight;
});
});


  setTimeout(() => {
    input.disabled = false;
    input.focus();
  }, 100);

}

  sendBtn.onclick = sendMessage;
  input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

input.addEventListener("input", () => {
  if (!currentChat) return;

  socket.emit("typing", {
    from: currentUser,
    to: currentChat
  });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", {
      from: currentUser,
      to: currentChat
    });
  }, 900);
});

 async function sendMessage() {
  console.log("🚀 sendMessage triggered");

  if (!currentChat) return;

  const text = input.value.trim();
  if (!text && !selectedMedia) return;

  let mediaPayload = null;

  if (selectedMedia) {
    const formData = new FormData();
    formData.append("file", selectedMedia);

    const res = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (!data.ok) return;

    mediaPayload = {
      url: data.url,
      type: data.type
    };
  }

  const msg = {
    id: "msg_" + Date.now(),
    from: currentUser,
    to: currentChat,
    text: text || null,
    media: mediaPayload,
    replyTo: replyTarget,
    timestamp: Date.now()
  };

  socket.emit("sendMessage", msg);
  renderMessage(msg);

  input.value = "";
  selectedMedia = null;
  mediaInput.value = "";

  mediaPreview.classList.add("hidden");
  mediaPreviewImg.src = "";

  replyTarget = null;
  replyPreview.classList.add("hidden");

  input.focus();
}

function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "message" + (msg.from === currentUser ? " me" : "");
  div.dataset.id = msg.id;

  div.oncontextmenu = (e) => {
    e.preventDefault();
    startReply(msg);
  };

  if (msg.replyTo) {
    const reply = document.createElement("div");
    reply.className = "reply-inside";
    reply.textContent = msg.replyTo.text || "Media message";
    reply.onclick = () => jumpToMessage(msg.replyTo.id);
    div.appendChild(reply);
  }

  if (msg.media) {
  if (msg.media.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = msg.media.url;
    img.style.maxWidth = "220px";
    img.style.borderRadius = "10px";
    img.onclick = () => openImagePreview(msg.media.url);
    div.appendChild(img);
  } else if (msg.media.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = msg.media.url;
    video.controls = true;
    video.style.maxWidth = "240px";
    div.appendChild(video);
  }
}

  if (msg.text) {
    const text = document.createElement("div");
    text.textContent = msg.text;
    div.appendChild(text);
  }

  const time = document.createElement("div");
  time.className = "timestamp";
  const ts = msg.timestamp || msg.createdAt || msg.id.replace("msg_", "");
  time.textContent = new Date(Number(ts)).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  div.appendChild(time);

  chatBox.appendChild(div);
  requestAnimationFrame(() => {
  chatBox.scrollTop = chatBox.scrollHeight;
});
}

  cancelReplyBtn.onclick = () => {
    replyTarget = null;
    replyPreview.classList.add("hidden");
  };

  function startReply(msg) {
  replyTarget = msg;
  replyUser.textContent = msg.from;
  replyText.textContent = msg.text || "Media message";
  replyPreview.classList.remove("hidden");
  input.focus();
}


function jumpToMessage(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("highlight");

  setTimeout(() => el.classList.remove("highlight"), 1200);
}
document.addEventListener("touchend", (e) => {
  if (e.target === input) {
    e.preventDefault();
    input.focus();
  }
}, { passive: false });



mediaInput.addEventListener("change", () => {
  const file = mediaInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    alert("Only images and videos allowed");
    return;
  }

  selectedMedia = file;

  // Preview (image only)
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = () => {
      mediaPreviewImg.src = reader.result;
      mediaPreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }
});

removeMediaBtn.onclick = () => {
  selectedMedia = null;
  mediaInput.value = "";
  mediaPreview.classList.add("hidden");
  mediaPreviewImg.src = "";
};

socket.on("connect", () => {
  const user = localStorage.getItem("veyon_user");
  if (user) {
    socket.emit("reconnectUser", user);
  }
});


});
