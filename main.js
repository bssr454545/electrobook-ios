// ═══════════════════════════════════════════════
// ELECTROBOOK — main.js (v3, только личные чаты, все функции)
// ═══════════════════════════════════════════════
import { supabase } from "./supabase.js";

/* ═══════════ ЭКРАНЫ ═══════════ */
const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");

/* ═══════════ АВТОРИЗАЦИЯ ═══════════ */
const form = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");
const title = document.getElementById("title");
const toggleMode = document.getElementById("toggle-mode");
const errorEl = document.getElementById("error");
const messageEl = document.getElementById("message");
const passwordWarning = document.getElementById("password-warning");

let isLogin = true;
if (passwordWarning) passwordWarning.classList.add("hidden-warning");

toggleMode.addEventListener("click", () => {
  isLogin = !isLogin;
  title.textContent = isLogin ? "Вход в Electrobook" : "Регистрация";
  submitBtn.textContent = isLogin ? "Войти" : "Создать аккаунт";
  toggleMode.textContent = isLogin
    ? "Нет аккаунта? Зарегистрироваться"
    : "Уже есть аккаунт? Войти";
  if (passwordWarning) passwordWarning.classList.toggle("hidden-warning", isLogin);
  errorEl.textContent = "";
  messageEl.textContent = "";
  form.reset();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  errorEl.textContent = "";
  messageEl.textContent = "";
  submitBtn.disabled = true;

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const username = email.split("@")[0];

  try {
    if (!supabase) throw new Error("Supabase не подключён. Проверьте supabase.js");

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { username, full_name: username } }
      });
      if (error) throw error;
      messageEl.textContent = "Аккаунт создан! Входим...";
    }
  } catch (err) {
    console.error("Auth error:", err);
    errorEl.textContent = translateSupabaseError(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

function translateSupabaseError(msg) {
  if (!msg) return "Неизвестная ошибка";
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Неверный email или пароль.";
  if (m.includes("already registered")) return "Этот email уже зарегистрирован.";
  if (m.includes("email not confirmed")) return "Подтвердите email (проверьте почту).";
  if (m.includes("password") && m.includes("6")) return "Пароль должен быть минимум 6 символов.";
  if (m.includes("invalid email")) return "Некорректный email.";
  if (m.includes("rate limit")) return "Слишком много попыток. Попробуйте позже.";
  if (m.includes("network")) return "Ошибка сети. Проверьте интернет.";
  return msg;
}

/* ═══════════ DOM ═══════════ */
const listEl = document.getElementById("list");
const searchInput = document.getElementById("search-input");
const placeholderEl = document.getElementById("placeholder");
const chatWindowEl = document.getElementById("chat-window");
const chatAvatarEl = document.getElementById("chat-avatar");
const chatNameEl = document.getElementById("chat-name");
const chatStatusEl = document.getElementById("chat-status");
const messagesEl = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const logoutBtn = document.getElementById("logout-btn");
const backBtn = document.getElementById("back-btn");

const scrollDownBtn    = document.getElementById("scroll-down-btn");
const chatSearch       = document.getElementById("chat-search");
const chatSearchInput  = document.getElementById("chat-search-input");
const chatSearchClose  = document.getElementById("chat-search-close");
const searchInChatBtn  = document.getElementById("search-in-chat-btn");
const reactionsBar     = document.getElementById("reactions-bar");

const attachBtn      = document.getElementById("attach-btn");
const fileInput      = document.getElementById("file-input");
const attachMenu     = document.getElementById("attach-menu");
const micBtn         = document.getElementById("mic-btn");
const previewModal   = document.getElementById("preview-modal");
const previewContent = document.getElementById("preview-content");
const previewClose   = document.getElementById("preview-close");
const recordingBar   = document.getElementById("recording-bar");
const recordingTime  = document.getElementById("recording-time");
const cancelRecording = document.getElementById("cancel-recording");
const sendRecording  = document.getElementById("send-recording");

const chatMenuBtn         = document.getElementById("chat-menu-btn");
const chatMenuDropdown    = document.getElementById("chat-menu-dropdown");

const profileModal       = document.getElementById("profile-modal");
const profileModalClose  = document.getElementById("modal-close");
const profileCancel      = document.getElementById("profile-cancel");
const profileSave        = document.getElementById("profile-save");
const profileDelete      = document.getElementById("profile-delete");
const myProfileBtn       = document.getElementById("my-profile-btn");

const modalAvatar        = document.getElementById("modal-avatar");
const modalTitle         = document.getElementById("modal-title");
const modalMessage       = document.getElementById("modal-message");
const fieldFullname      = document.getElementById("profile-fullname");
const fieldUsername      = document.getElementById("profile-username");
const fieldStatus        = document.getElementById("profile-status");
const fieldBio           = document.getElementById("profile-bio");
const fieldEmail         = document.getElementById("profile-email");
const fieldCreated       = document.getElementById("profile-created");
const fieldPrivacy       = document.getElementById("profile-privacy");

/* ═══════════ STATE ═══════════ */
let currentUser = null;
let currentChat = null;
let unsubMessages = null;
let currentMessages = [];
let replyingTo = null;
let currentFilter = "chats";
let viewingOtherUser = false;
let chatPrefsCache = {};
let showArchived = false;
let unreadCount = 0;
let typingTimeout = null;
let typingChannel = null;
let lastTypingSent = 0;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/* ═══════════ УТИЛИТЫ ═══════════ */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 10;
}

function formatTimeShort(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "сейчас";
  if (diff < 3600) return Math.floor(diff / 60) + "м";
  if (diff < 86400) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " Б";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
}

function getFileIcon(name, type) {
  if (type === "image") return "🖼️";
  if (type === "video") return "🎥";
  if (type === "audio") return "🎵";
  const ext = (name || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return "📄";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx"].includes(ext)) return "📊";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  if (["mp3", "wav", "ogg"].includes(ext)) return "🎵";
  if (ext === "txt") return "📃";
  return "📎";
}

/* ═══════════ ФОРМАТИРОВАНИЕ ТЕКСТА (B4) ═══════════ */
function parseMessageText(text) {
  if (!text) return "";
  let html = escapeHtml(text);
  
  // **жирный**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  
  // *курсив*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  
  // `код`
  html = html.replace(/`([^`]+?)`/g, '<code class="inline-code">$1</code>');
  
  // ~~зачеркнутый~~
  html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");
  
  // __подчеркнутый__
  html = html.replace(/__(.+?)__/g, "<u>$1</u>");
  
  // Ссылки (http/https)
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>'
  );
  
  // Переносы строк
  html = html.replace(/\n/g, "<br>");
  
  return html;
}

/* ═══════════ АВТОРИЗАЦИЯ: отслеживание сессии ═══════════ */
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    const user = session.user;
    const username = user.user_metadata?.username || user.email.split("@")[0];

    currentUser = { uid: user.id, email: user.email, username };

    const myEmailEl = document.getElementById("my-email");
    const myUsernameEl = document.getElementById("my-username");
    const myAvatarEl = document.getElementById("my-avatar");

    if (myEmailEl) myEmailEl.textContent = user.email;
    if (myUsernameEl) myUsernameEl.textContent = "@" + username;
    if (myAvatarEl) myAvatarEl.textContent = username[0].toUpperCase();

    authScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");

    setTimeout(() => {
      updateLastSeen();
      loadChatsList();
      updateOnlineStatus();
      listenIncomingCalls();
    }, 500);
  } else {
    chatScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
    currentUser = null;
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

async function updateLastSeen() {
  if (!currentUser) return;
  try {
    await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", currentUser.uid);
  } catch (e) { console.error("last_seen:", e); }
}

setInterval(updateLastSeen, 60000);

/* ═══════════ ПОИСК ═══════════ */
let searchDebounce = null;

searchInput.addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  const term = e.target.value.trim().toLowerCase();
  searchDebounce = setTimeout(() => {
    if (term.length < 2) {
      if (currentFilter === "chats") loadChatsList();
      else if (currentFilter === "contacts") loadContactsList();
      return;
    }
    searchUsers(term);
  }, 250);
});

async function searchUsers(term) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
      .limit(20);

    if (error) throw error;
    const results = (data || []).filter((p) => p.id !== currentUser.uid);

    if (results.length === 0) {
      showEmptyState("Ничего не найдено", "Попробуйте другой запрос");
      return;
    }
    renderSearchResults(results);
  } catch (e) {
    console.error(e);
    showEmptyState("Ошибка поиска", e.message);
  }
}

function renderSearchResults(items) {
  listEl.innerHTML = "";
  items.forEach((item) => {
    const name = item.username || item.full_name || "user";
    const color = getAvatarColor(name);
    const el = document.createElement("div");
    el.className = "list-item";
    el.innerHTML = `
      <div class="avatar-wrapper">
        <div class="avatar" data-color="${color}">${name[0].toUpperCase()}</div>
      </div>
      <div class="list-item-info">
        <div class="list-item-name">${escapeHtml(name)}</div>
        <div class="list-item-sub">@${escapeHtml(item.username || "user")}</div>
      </div>
    `;
    el.addEventListener("click", () => openChat(item));
    listEl.appendChild(el);
  });
}

function showEmptyState(title, subtitle) {
  listEl.innerHTML = `
    <div class="empty-state">
      <p>${title}</p>
      <span>${subtitle}</span>
    </div>
  `;
}

/* ═══════════ ФИЛЬТРЫ ═══════════ */
document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    searchInput.value = "";

    if (currentFilter === "chats") await loadChatsList();
    else if (currentFilter === "contacts") await loadContactsList();
  });
});

/* ═══════════ СПИСОК ЧАТОВ ═══════════ */
async function loadChatsList() {
  if (!currentUser) return;
  listEl.innerHTML = `<div class="empty-state"><p>Загрузка...</p></div>`;

  try {
    const { data: chats } = await supabase
      .from("chats").select("*")
      .or(`user1_id.eq.${currentUser.uid},user2_id.eq.${currentUser.uid}`)
      .order("last_message_at", { ascending: false });

    const otherIds = (chats || []).map(c => c.user1_id === currentUser.uid ? c.user2_id : c.user1_id);
    const { data: profiles } = otherIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", otherIds)
      : { data: [] };

    const items = [];

    (chats || []).forEach(chat => {
      const otherId = chat.user1_id === currentUser.uid ? chat.user2_id : chat.user1_id;
      const profile = profiles?.find(p => p.id === otherId);
      items.push({
        type: "chat",
        id: chat.id,
        lastAt: chat.last_message_at,
        user: profile || { id: otherId, username: "user", full_name: "" },
        lastMessage: chat.last_message,
        chat: chat
      });
    });

    items.sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0));

    if (items.length === 0) {
      showEmptyState("Пока пусто", "Найдите пользователя и начните переписку");
      return;
    }

    listEl.innerHTML = "";
    items.forEach(item => renderChatItem(item.user, item.chat, item.lastMessage));

  } catch (e) {
    console.error(e);
    showEmptyState("Ошибка загрузки", e.message);
  }
}

function renderChatItem(user, chat, lastMessage) {
  const name = user.full_name || user.username || "user";
  const color = getAvatarColor(name);
  const lastMsg = lastMessage
    ? (lastMessage.length > 30 ? lastMessage.slice(0, 30) + "..." : lastMessage)
    : "Нет сообщений";
  const timeStr = chat.last_message_at ? formatTimeShort(chat.last_message_at) : "";

  const el = document.createElement("div");
  el.className = "list-item";
  el.dataset.chatId = chat.id;
  el.innerHTML = `
    <div class="avatar-wrapper">
      <div class="avatar" data-color="${color}">${name[0].toUpperCase()}</div>
    </div>
    <div class="list-item-info">
      <div class="list-item-name">${escapeHtml(name)}</div>
      <div class="list-item-sub">${escapeHtml(lastMsg)}</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
      <span style="font-size:11px;color:rgba(180,200,240,0.5);">${timeStr}</span>
    </div>
  `;

  el.addEventListener("click", () => openChat(user, chat.id));
  el.addEventListener("contextmenu", (e) => { e.preventDefault(); showChatContextMenu(e, chat, user); });
  listEl.appendChild(el);
}

async function loadContactsList() {
  if (!currentUser) return;
  listEl.innerHTML = `<div class="empty-state"><p>Загрузка...</p></div>`;
  try {
    const { data, error } = await supabase.from("profiles").select("*").neq("id", currentUser.uid).limit(100);
    if (error) throw error;
    if (!data || data.length === 0) {
      showEmptyState("Контактов нет", "Зарегистрируйте ещё пользователей");
      return;
    }
    listEl.innerHTML = "";
    data.forEach(user => {
      const name = user.full_name || user.username || "user";
      const color = getAvatarColor(name);
      const el = document.createElement("div");
      el.className = "list-item";
      el.innerHTML = `
        <div class="avatar-wrapper">
          <div class="avatar" data-color="${color}">${name[0].toUpperCase()}</div>
        </div>
        <div class="list-item-info">
          <div class="list-item-name">${escapeHtml(name)}</div>
          <div class="list-item-sub">@${escapeHtml(user.username || "user")}</div>
        </div>
      `;
      el.addEventListener("click", () => openUserProfile(user.id));
      listEl.appendChild(el);
    });
  } catch (e) {
    console.error(e);
    showEmptyState("Ошибка загрузки", e.message);
  }
}

/* ═══════════ ОТКРЫТИЕ ЧАТА ═══════════ */
async function openChat(user, chatId) {
  currentChat = { ...user, chatId, isGroup: false, isChannel: false };

  placeholderEl.classList.add("hidden");
  chatWindowEl.classList.remove("hidden");
  chatScreen.classList.add("chat-open");

  const name = user.full_name || user.username || "user";
  const color = getAvatarColor(name);

  chatAvatarEl.textContent = name[0].toUpperCase();
  chatAvatarEl.dataset.color = color;
  chatNameEl.textContent = name;
  chatStatusEl.textContent = "@" + (user.username || "user");
  messageForm.style.display = "flex";

  chatSearch.classList.add("hidden");
  chatSearchInput.value = "";
  document.querySelectorAll(".message.highlight").forEach(m => m.classList.remove("highlight"));

  if (!chatId) {
    const newChatId = [currentUser.uid, user.id].sort().join("_");
    await supabase.from("chats").upsert(
      { id: newChatId, user1_id: [currentUser.uid, user.id].sort()[0], user2_id: [currentUser.uid, user.id].sort()[1] },
      { onConflict: "id" }
    );
    currentChat.chatId = newChatId;
  }

  loadMessages();
  setTimeout(() => updateChatStatus(user.id), 300);
}

backBtn.addEventListener("click", () => {
  chatScreen.classList.remove("chat-open");
});

/* ═══════════ СООБЩЕНИЯ ═══════════ */
async function loadMessages() {
  if (unsubMessages) unsubMessages();
  const chatId = currentChat.chatId;
  if (!chatId) return;

  const { data, error } = await supabase
    .from("messages").select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) { console.error(error); return; }
  renderMessages(data);

  const channel = supabase
    .channel("messages-" + chatId)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
      (payload) => {
        if (payload.eventType === "INSERT") {
          if (payload.new.sender_id !== currentUser.uid) {
            playNotificationSound();
            showBrowserNotification(
              currentChat.full_name || currentChat.username || "Новое сообщение",
              payload.new.text || "📎 Вложение"
            );
          }
          appendMessage(payload.new);
          supabase.from("chats").update({
            last_message: payload.new.text || "📎 Вложение",
            last_message_at: payload.new.created_at
          }).eq("id", chatId).then(() => {});
        } else if (payload.eventType === "UPDATE") {
          updateMessageInUI(payload.new);
        } else if (payload.eventType === "DELETE") {
          const wrapper = document.querySelector(`[data-msg-id="${payload.old.id}"]`);
          if (wrapper) wrapper.remove();
        }
      }
    )
    .subscribe();

  unsubMessages = () => supabase.removeChannel(channel);

  if (currentChat && currentChat.chatId) {
    setTimeout(() => markChatAsRead(currentChat.chatId), 500);
  }

  if (typingChannel) {
    supabase.removeChannel(typingChannel);
    typingChannel = null;
  }

  typingChannel = supabase
    .channel("typing-" + chatId)
    .on("postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "typing_status",
        filter: `chat_id=eq.${chatId}`
      },
      async (payload) => {
        const data = payload.new;
        if (!data || data.user_id === currentUser.uid) return;

        const updated = new Date(data.updated_at).getTime();
        if (Date.now() - updated > 5000) return;

        const userName = currentChat.username || "Собеседник";

        const typingUserEl = document.getElementById("typing-user");
        const typingIndicatorEl = document.getElementById("typing-indicator");

        if (typingUserEl) typingUserEl.textContent = userName;
        if (typingIndicatorEl) {
          typingIndicatorEl.classList.remove("hidden");
          typingIndicatorEl.classList.add("active");
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          if (typingIndicatorEl) {
            typingIndicatorEl.classList.add("hidden");
            typingIndicatorEl.classList.remove("active");
          }
        }, 4000);
      }
    )
    .subscribe();
}

function renderMessages(messages) {
  messagesEl.innerHTML = "";
  currentMessages = [];

  if (!messages || messages.length === 0) {
    messagesEl.innerHTML = `
      <div class="empty-state" style="margin:auto;">
        <p>Пока нет сообщений</p>
        <span>Напишите первым!</span>
      </div>
    `;
    return;
  }

  messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  let lastDate = null;
  messages.forEach((msg) => {
    const msgDate = msg.created_at ? new Date(msg.created_at).toDateString() : null;
    if (msgDate && msgDate !== lastDate) {
      const divider = document.createElement("div");
      divider.className = "date-divider";
      divider.textContent = formatDate(msg.created_at);
      messagesEl.appendChild(divider);
      lastDate = msgDate;
    }
    currentMessages.push(msg);
    renderMessageElement(msg);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderMessageElement(msg) {
  if (document.querySelector(`[data-msg-id="${msg.id}"]`)) return;
  messagesEl.appendChild(buildMessageWrapper(msg));
}

function buildMessageWrapper(msg) {
  const isMine = msg.sender_id === currentUser.uid;

  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper " + (isMine ? "mine" : "theirs");
  wrapper.dataset.msgId = msg.id;

  if (msg.reply_to_id) {
    const replyMsg = currentMessages.find(m => m.id === msg.reply_to_id);
    if (replyMsg) {
      const replyEl = document.createElement("div");
      replyEl.className = "message-reply";
      const replyName = replyMsg.sender_id === currentUser.uid ? "Вы" : (currentChat.username || "user");

      replyEl.innerHTML = `
        <strong>${escapeHtml(replyName)}</strong>
        <span class="message-reply-text">${escapeHtml((replyMsg.text || "").slice(0, 50))}</span>
      `;
      wrapper.appendChild(replyEl);
    }
  }

  if (msg.is_system) {
    const sysEl = document.createElement("div");
    sysEl.className = "system-message";
    sysEl.textContent = msg.text;
    wrapper.appendChild(sysEl);
    return wrapper;
  }

  const el = document.createElement("div");
  el.className = "message " + (isMine ? "mine" : "theirs");

  if (msg.is_deleted) {
    el.classList.add("deleted");
    el.innerHTML = `<div>🚫 Сообщение удалено</div>`;
  } else {
    const time = msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : "";
    const editedLabel = msg.edited_at ? '<span class="edited-label">(ред.)</span>' : "";
    const readCheck = isMine ? '<span class="read-check">✓✓</span>' : "";
    const pinnedLabel = msg.is_pinned ? '<span class="pinned-label">📌</span>' : "";

    if (msg.text && msg.text.trim()) {
      const textEl = document.createElement("div");
      textEl.innerHTML = parseMessageText(msg.text);
      el.appendChild(textEl);
    }

    const attachment = buildAttachment(msg);
    if (attachment) el.appendChild(attachment);

    const timeEl = document.createElement("span");
    timeEl.className = "message-time";
    timeEl.innerHTML = `${pinnedLabel}${time}${editedLabel}${readCheck}`;
    el.appendChild(timeEl);
  }

  if (msg.reactions && Object.keys(msg.reactions).length > 0) {
    const reactionsEl = document.createElement("div");
    reactionsEl.className = "message-reactions";
    Object.entries(msg.reactions).forEach(([emoji, users]) => {
      const count = Array.isArray(users) ? users.length : 0;
      if (count === 0) return;
      const isMineReact = Array.isArray(users) && users.includes(currentUser.uid);
      const badge = document.createElement("span");
      badge.className = "reaction-badge" + (isMineReact ? " mine" : "");
      badge.textContent = `${emoji} ${count}`;
      badge.addEventListener("click", () => toggleReaction(msg.id, emoji));
      reactionsEl.appendChild(badge);
    });
    el.appendChild(reactionsEl);
  }

  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showMessageContextMenu(e, msg, isMine);
  });
  el.addEventListener("dblclick", () => {
    if (msg.is_deleted) return;
    startReply(msg);
  });

  wrapper.appendChild(el);
  return wrapper;
}

function updateMessageInUI(msg) {
  const idx = currentMessages.findIndex(m => m.id === msg.id);
  if (idx >= 0) currentMessages[idx] = msg;
  const oldWrapper = document.querySelector(`[data-msg-id="${msg.id}"]`);
  if (!oldWrapper) return;
  const newWrapper = buildMessageWrapper(msg);
  oldWrapper.replaceWith(newWrapper);
}

function appendMessage(msg) {
  if (document.querySelector(`[data-msg-id="${msg.id}"]`)) return;
  currentMessages.push(msg);
  renderMessageElement(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* ═══════════ ОТПРАВКА СООБЩЕНИЯ ═══════════ */
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentChat) return;

  const chatId = currentChat.chatId;
  const insertData = { chat_id: chatId, sender_id: currentUser.uid, text };
  if (replyingTo) insertData.reply_to_id = replyingTo.id;

  const { error } = await supabase.from("messages").insert(insertData);

  if (error) {
    console.error(error);
    alert("Ошибка отправки: " + error.message);
  } else {
    messageInput.value = "";
    if (replyingTo) {
      replyingTo = null;
      const replyBar = document.getElementById("reply-bar");
      if (replyBar) replyBar.remove();
    }
    if (!currentChat.isGroup && !currentChat.isChannel) {
      await supabase.from("chats").update({
        last_message: text,
        last_message_at: new Date().toISOString()
      }).eq("id", chatId);
    }
  }
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    messageForm.dispatchEvent(new Event("submit"));
  }
});

/* ═══════════ КОНТЕКСТНОЕ МЕНЮ ЧАТА ═══════════ */
function showChatContextMenu(event, chat, user) {
  document.querySelectorAll(".context-menu").forEach(m => m.remove());
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = event.pageX + "px";
  menu.style.top = event.pageY + "px";
  menu.innerHTML = `
    <div class="context-menu-item" data-action="open">💬 Открыть</div>
    <div class="context-menu-item" data-action="profile">👤 Профиль</div>
    <div class="context-menu-item danger" data-action="delete">🗑️ Удалить чат</div>
  `;
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener("click", closeContextMenu, { once: true }), 10);

  menu.addEventListener("click", (e) => {
    const action = e.target.closest(".context-menu-item")?.dataset.action;
    if (!action) return;
    if (action === "open") openChat(user, chat.id);
    if (action === "profile") openUserProfile(user.id);
    if (action === "delete") deleteChat(chat.id);
    closeContextMenu();
  });
}

function closeContextMenu() {
  document.querySelectorAll(".context-menu").forEach(m => m.remove());
}

async function deleteChat(chatId) {
  if (!confirm("Удалить чат? Все сообщения будут удалены.")) return;
  try {
    await supabase.from("messages").delete().eq("chat_id", chatId);
    await supabase.from("chats").delete().eq("id", chatId);
    loadChatsList();
    if (currentChat && currentChat.chatId === chatId) {
      chatWindowEl.classList.add("hidden");
      placeholderEl.classList.remove("hidden");
      currentChat = null;
    }
  } catch (e) {
    console.error(e);
    alert("Ошибка удаления: " + e.message);
  }
}

/* ═══════════ КОНТЕКСТНОЕ МЕНЮ СООБЩЕНИЯ ═══════════ */
function showMessageContextMenu(event, msg, isMine) {
  document.querySelectorAll(".context-menu").forEach(m => m.remove());
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = event.pageX + "px";
  menu.style.top = event.pageY + "px";

  let items = `<div class="context-menu-item" data-action="reply">↩️ Ответить</div>`;
  if (!msg.is_deleted) {
    items += `<div class="context-menu-item" data-action="react">😀 Реакция</div>`;
    items += `<div class="context-menu-item" data-action="copy">📋 Копировать</div>`;
    items += `<div class="context-menu-item" data-action="forward">📤 Переслать</div>`;
    items += `<div class="context-menu-item" data-action="select">☑️ Выделить</div>`;
    items += `<div class="context-menu-item" data-action="pin">📌 ${msg.is_pinned ? 'Открепить' : 'Закрепить'}</div>`;
    items += `<div class="context-menu-item" data-action="link">🔗 Ссылка</div>`;
    if (isMine) items += `<div class="context-menu-item" data-action="edit">✏️ Изменить</div>`;
    if (isMine) items += `<div class="context-menu-item danger" data-action="delete">🗑️ Удалить</div>`;
  }
  menu.innerHTML = items;
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener("click", closeContextMenu, { once: true }), 10);

  menu.addEventListener("click", (e) => {
    const action = e.target.closest(".context-menu-item")?.dataset.action;
    if (!action) return;

    if (action === "reply")  startReply(msg);
    if (action === "react")  showReactionsBar(null, msg, event);
    if (action === "copy")   copyMessage(msg);
    if (action === "forward") {
      console.log("📤 Клик по Переслать, msg.id =", msg.id);
      if (typeof window.openForwardModal === "function") {
        window.openForwardModal([msg]);
      } else {
        alert("Функция пересылки не загружена. Проверьте консоль (F12)");
        console.error("window.openForwardModal не найдена");
      }
    }
    if (action === "select") toggleMessageSelection(msg.id);
    if (action === "pin")    togglePinMessage(msg);
    if (action === "link")   copyMessageLink(msg);
    if (action === "edit")   editMessage(msg);
    if (action === "delete") deleteMessage(msg);
    closeContextMenu();
  });
}

async function togglePinMessage(msg) {
  try {
    const newVal = !msg.is_pinned;
    const { error } = await supabase.from("messages")
      .update({ is_pinned: newVal })
      .eq("id", msg.id);
    if (error) throw error;
    msg.is_pinned = newVal;
    updateMessageInUI(msg);
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

function copyMessageLink(msg) {
  const link = `${window.location.origin}${window.location.pathname}#msg-${msg.id}`;
  navigator.clipboard.writeText(link).then(() => {
    alert("🔗 Ссылка скопирована:\n" + link);
  });
}

function startReply(msg) {
  replyingTo = msg;
  const name = msg.sender_id === currentUser.uid ? "Вы" : (currentChat.username || "user");
  let replyBar = document.getElementById("reply-bar");
  if (!replyBar) {
    replyBar = document.createElement("div");
    replyBar.id = "reply-bar";
    replyBar.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      padding: 10px 20px;
      background: rgba(80, 150, 255, 0.15);
      border-top: 1px solid rgba(120, 170, 255, 0.3);
      font-size: 13px;
    `;
    messageForm.parentElement.insertBefore(replyBar, messageForm);
  }
  replyBar.innerHTML = `
    <div style="flex:1;">
      <strong style="color:#4a90e2;display:block;font-size:12px;">Ответ ${escapeHtml(name)}</strong>
      <span style="color:rgba(180, 200, 240, 0.7);font-size:12px;">${escapeHtml((msg.text||"").slice(0,50))}</span>
    </div>
    <button class="icon-btn" id="cancel-reply">✕</button>
  `;
  document.getElementById("cancel-reply").onclick = () => {
    replyingTo = null;
    replyBar.remove();
  };
  messageInput.focus();
}

function copyMessage(msg) {
  navigator.clipboard.writeText(msg.text || "").then(() => {
    const toast = document.createElement("div");
    toast.textContent = "✅ Скопировано";
    toast.style.cssText = `
      position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
      padding: 10px 20px; border-radius: 20px;
      background: linear-gradient(135deg, #4a90e2, #357abd); color: #fff;
      font-size: 13px; font-weight: 700; z-index: 99999;
      box-shadow: 0 8px 30px rgba(80, 150, 255, 0.6);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  });
}

async function editMessage(msg) {
  const newText = prompt("Изменить сообщение:", msg.text);
  if (newText === null || newText.trim() === "" || newText === msg.text) return;
  try {
    const { error } = await supabase.from("messages")
      .update({ text: newText.trim(), edited_at: new Date().toISOString() })
      .eq("id", msg.id);
    if (error) throw error;
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

async function deleteMessage(msg) {
  if (!confirm("Удалить сообщение?")) return;
  try {
    const { error } = await supabase.from("messages")
      .update({ is_deleted: true, text: "" })
      .eq("id", msg.id);
    if (error) throw error;
  } catch (e) {
    console.error(e);
    alert("Ошибка: " + e.message);
  }
}

/* ═══════════ РЕАКЦИИ ═══════════ */
function showReactionsBar(targetEl, msg, event) {
  reactionsBar.classList.remove("hidden");
  if (event) {
    reactionsBar.style.left = event.pageX + "px";
    reactionsBar.style.top = (event.pageY - 60) + "px";
  } else if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    reactionsBar.style.left = (rect.left + rect.width / 2 - 140) + "px";
    reactionsBar.style.top = (rect.top - 60) + "px";
  }
  reactionsBar.dataset.msgId = msg.id;
  reactionsBar.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      toggleReaction(msg.id, btn.dataset.emoji);
      reactionsBar.classList.add("hidden");
    };
  });
}

document.addEventListener("click", (e) => {
  if (!reactionsBar.contains(e.target)) reactionsBar.classList.add("hidden");
});

async function toggleReaction(msgId, emoji) {
  const msg = currentMessages.find(m => m.id === msgId);
  if (!msg) return;

  const reactions = { ...(msg.reactions || {}) };
  const users = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];

  const idx = users.indexOf(currentUser.uid);
  if (idx >= 0) users.splice(idx, 1);
  else users.push(currentUser.uid);

  if (users.length === 0) delete reactions[emoji];
  else reactions[emoji] = users;

  msg.reactions = reactions;
  updateMessageInUI(msg);

  try {
    const { error } = await supabase.from("messages").update({ reactions }).eq("id", msgId);
    if (error) console.error("Ошибка реакции:", error);
  } catch (e) { console.error("Ошибка реакции:", e); }
}

/* ═══════════ ПОИСК В ЧАТЕ ═══════════ */
messagesEl.addEventListener("scroll", () => {
  const atBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 100;
  scrollDownBtn.classList.toggle("hidden", atBottom);
});

scrollDownBtn.addEventListener("click", () => {
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

searchInChatBtn.addEventListener("click", () => {
  chatSearch.classList.toggle("hidden");
  if (!chatSearch.classList.contains("hidden")) chatSearchInput.focus();
});

chatSearchClose.addEventListener("click", () => {
  chatSearch.classList.add("hidden");
  chatSearchInput.value = "";
  document.querySelectorAll(".message.highlight").forEach(m => m.classList.remove("highlight"));
});

chatSearchInput.addEventListener("input", (e) => {
  const term = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".message.highlight").forEach(m => m.classList.remove("highlight"));
  if (term.length < 2) return;

  document.querySelectorAll(".message-wrapper").forEach(wrapper => {
    const msgEl = wrapper.querySelector(".message");
    if (!msgEl) return;
    const text = msgEl.textContent.toLowerCase();
    if (text.includes(term)) msgEl.classList.add("highlight");
  });

  const first = document.querySelector(".message.highlight");
  if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
});

/* ═══════════ ГЛОБАЛЬНЫЙ ПОИСК (B6) ═══════════ */
window.globalSearchMessages = async function(term) {
  if (!term || term.length < 2) {
    alert("Введите минимум 2 символа");
    return;
  }
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*, chats!inner(user1_id, user2_id)")
      .or(`user1_id.eq.${currentUser.uid},user2_id.eq.${currentUser.uid}`, { foreignTable: "chats" })
      .ilike("text", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const results = data || [];
    if (results.length === 0) {
      alert("Ничего не найдено");
      return;
    }

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal">
        <header class="modal-header">
          <h2>🔍 Найдено: ${results.length}</h2>
          <button class="icon-btn" id="global-search-close">✕</button>
        </header>
        <div class="modal-body">
          <div class="global-search-results">
            ${results.map(m => `
              <div class="global-search-item" data-chat-id="${m.chat_id}" data-msg-id="${m.id}">
                <div class="global-search-text">${escapeHtml((m.text || "📎 Вложение").slice(0, 100))}</div>
                <div class="global-search-date">${formatDate(m.created_at)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("global-search-close").onclick = () => modal.remove();
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelectorAll(".global-search-item").forEach(item => {
      item.addEventListener("click", () => {
        const chatId = item.dataset.chatId;
        const msgId = item.dataset.msgId;
        modal.remove();
        // Открываем чат и скроллим к сообщению
        const otherId = chatId.split("_").find(id => id !== currentUser.uid);
        openChat({ id: otherId, username: "user" }, chatId);
        setTimeout(() => {
          const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
          if (msgEl) {
            msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
            msgEl.classList.add("highlight");
            setTimeout(() => msgEl.classList.remove("highlight"), 3000);
          }
        }, 1000);
      });
    });
  } catch (e) {
    console.error(e);
    alert("Ошибка поиска: " + e.message);
  }
};

/* ═══════════ ПРОФИЛЬ ═══════════ */
myProfileBtn.addEventListener("click", () => openProfile(currentUser));

function openUserProfile(userId) {
  supabase.from("profiles").select("*").eq("id", userId).single()
    .then(({ data, error }) => {
      if (error || !data) { console.error(error); return; }
      openProfile({
        uid: data.id, email: "(скрыт)",
        username: data.username, full_name: data.full_name,
        bio: data.bio, status: data.status,
        created_at: data.created_at, privacy: data.privacy,
        isOther: true
      });
    });
}

function openProfile(user) {
  viewingOtherUser = !!user.isOther;
  const displayName = user.full_name || user.username || "user";
  modalAvatar.textContent = displayName[0].toUpperCase();
  modalTitle.textContent = viewingOtherUser ? `Профиль @${user.username || "user"}` : "Мой профиль";

  fieldFullname.value = user.full_name || "";
  fieldUsername.value = user.username || "";
  fieldStatus.value   = user.status || "";
  fieldBio.value      = user.bio || "";
  fieldEmail.textContent = viewingOtherUser ? "(скрыт)" : (currentUser.email || "—");

  if (user.created_at) {
    const d = new Date(user.created_at);
    fieldCreated.textContent = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
  } else {
    fieldCreated.textContent = "—";
  }

  fieldPrivacy.value = user.privacy || "public";

  const inputs = [fieldFullname, fieldUsername, fieldStatus, fieldBio, fieldPrivacy];
  const actionsBlock = document.querySelector(".modal-actions");
  const dangerBlock  = document.querySelector(".danger-zone");

  inputs.forEach(inp => { inp.disabled = viewingOtherUser; });
  actionsBlock.style.display = viewingOtherUser ? "none" : "flex";
  dangerBlock.style.display  = viewingOtherUser ? "none" : "block";

  modalMessage.textContent = "";
  modalMessage.className = "modal-message";
  profileModal.classList.remove("hidden");
}

profileModalClose.addEventListener("click", closeProfileModal);
profileCancel.addEventListener("click", closeProfileModal);
profileModal.addEventListener("click", (e) => { if (e.target === profileModal) closeProfileModal(); });

function closeProfileModal() {
  profileModal.classList.add("hidden");
  modalMessage.textContent = "";
  modalMessage.className = "modal-message";
}

profileSave.addEventListener("click", async () => {
  const fullName = fieldFullname.value.trim();
  const username = fieldUsername.value.trim().toLowerCase();
  const status   = fieldStatus.value.trim();
  const bio      = fieldBio.value.trim();
  const privacy  = fieldPrivacy.value;

  if (!username) { showModalMessage("Username не может быть пустым.", "error"); return; }
  if (username.length < 3) { showModalMessage("Username минимум 3 символа.", "error"); return; }
  if (!/^[a-z0-9_]+$/.test(username)) { showModalMessage("Username: только буквы, цифры, _", "error"); return; }

  profileSave.disabled = true;
  showModalMessage("Сохранение...", "");

  try {
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, username, status, bio, privacy,
      last_seen: new Date().toISOString()
    }).eq("id", currentUser.uid);

    if (error) throw error;

    currentUser.username = username;
    currentUser.full_name = fullName;
    document.getElementById("my-username").textContent = "@" + username;
    document.getElementById("my-avatar").textContent = (fullName || username)[0].toUpperCase();
    modalAvatar.textContent = (fullName || username)[0].toUpperCase();
    showModalMessage("✅ Профиль сохранён!", "success");
  } catch (err) {
    console.error(err);
    showModalMessage("Ошибка: " + err.message, "error");
  } finally {
    profileSave.disabled = false;
  }
});

function showModalMessage(text, type) {
  modalMessage.textContent = text;
  modalMessage.className = "modal-message " + (type || "");
}

profileDelete.addEventListener("click", async () => {
  if (!confirm("⚠️ Вы уверены, что хотите удалить аккаунт?")) return;
  if (!confirm("Это действие НЕОБРАТИМО. Продолжить?")) return;
  try {
    await supabase.from("profiles").delete().eq("id", currentUser.uid);
    await supabase.auth.signOut();
  } catch (err) {
    console.error(err);
    alert("Ошибка удаления: " + err.message);
  }
});

document.getElementById("chat-avatar").addEventListener("click", () => {
  if (currentChat && !currentChat.isGroup && !currentChat.isChannel && currentChat.id) openUserProfile(currentChat.id);
});

/* ═══════════ ВЛОЖЕНИЯ ═══════════ */
attachBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = attachBtn.getBoundingClientRect();
  attachMenu.style.left = rect.left + "px";
  attachMenu.style.bottom = (window.innerHeight - rect.top + 8) + "px";
  attachMenu.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!attachMenu.contains(e.target) && e.target !== attachBtn) {
    attachMenu.classList.add("hidden");
  }
});

attachMenu.querySelectorAll(".attach-menu-item").forEach(item => {
  item.addEventListener("click", () => {
    const type = item.dataset.type;
    attachMenu.classList.add("hidden");
    if (type === "image") fileInput.accept = "image/*";
    else if (type === "video") fileInput.accept = "video/*";
    else fileInput.accept = "*/*";
    fileInput.click();
  });
});

fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files);
  if (files.length === 0) return;
  for (const file of files) await uploadAndSendFile(file);
  fileInput.value = "";
});

async function uploadAndSendFile(file) {
  if (!currentChat) { alert("Откройте чат для отправки файла"); return; }

  if (file.size > MAX_FILE_SIZE) {
    alert(`Файл слишком большой. Максимум 50 МБ (ваш: ${formatFileSize(file.size)})`);
    return;
  }

  const progressEl = document.createElement("div");
  progressEl.className = "message-wrapper mine";
  progressEl.innerHTML = `
    <div class="upload-progress">
      <div class="upload-progress-bar"></div>
      <div class="upload-progress-text">📤 Загрузка ${escapeHtml(file.name)}...</div>
    </div>
  `;
  messagesEl.appendChild(progressEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `${currentUser.uid}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    let fileType = "file";
    if (file.type.startsWith("image/")) fileType = "image";
    else if (file.type.startsWith("video/")) fileType = "video";
    else if (file.type.startsWith("audio/")) fileType = "audio";

    const { error: msgError } = await supabase.from("messages").insert({
      chat_id: currentChat.chatId,
      sender_id: currentUser.uid,
      text: "",
      attachment_url: publicUrl,
      attachment_type: fileType,
      attachment_name: file.name,
      attachment_size: file.size
    });

    if (msgError) throw msgError;

    const label = fileType === "image" ? "🖼️ Фото" 
      : fileType === "video" ? "🎥 Видео" 
      : fileType === "audio" ? "🎤 Голосовое" 
      : `📎 ${file.name}`;

    await supabase.from("chats").update({
      last_message: label,
      last_message_at: new Date().toISOString()
    }).eq("id", currentChat.chatId);

    progressEl.remove();
  } catch (e) {
    console.error(e);
    progressEl.remove();
    alert("Ошибка загрузки: " + e.message);
  }
}

function buildAttachment(msg) {
  if (!msg.attachment_url) return null;

  const container = document.createElement("div");
  container.className = "message-attachment";

  const type = msg.attachment_type || "file";
  const url = msg.attachment_url;
  const name = msg.attachment_name || "file";
  const size = msg.attachment_size ? formatFileSize(msg.attachment_size) : "";

  if (type === "image") {
    const img = document.createElement("img");
    img.src = url;
    img.alt = name;
    img.loading = "lazy";
    img.addEventListener("click", () => openPreview(url, "image"));
    container.appendChild(img);
  } else if (type === "video") {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.preload = "metadata";
    container.appendChild(video);
  } else if (type === "audio") {
    const audio = document.createElement("audio");
    audio.src = url;
    audio.controls = true;
    audio.style.cssText = "width: 100%; max-width: 300px; border-radius: 12px;";
    container.appendChild(audio);
  } else {
    const fileEl = document.createElement("div");
    fileEl.className = "attachment-file";
    fileEl.innerHTML = `
      <div class="attachment-file-icon">${getFileIcon(name, type)}</div>
      <div class="attachment-file-info">
        <div class="attachment-file-name">${escapeHtml(name)}</div>
        <div class="attachment-file-size">${size} · Нажмите для скачивания</div>
      </div>
    `;
    fileEl.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.target = "_blank";
      a.click();
    });
    container.appendChild(fileEl);
  }
  return container;
}

function openPreview(url, type) {
  previewContent.innerHTML = "";
  if (type === "image") {
    const img = document.createElement("img");
    img.src = url;
    previewContent.appendChild(img);
  } else if (type === "video") {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    previewContent.appendChild(video);
  }
  previewModal.classList.remove("hidden");
}

previewClose.addEventListener("click", () => {
  previewModal.classList.add("hidden");
  previewContent.innerHTML = "";
});

previewModal.addEventListener("click", (e) => {
  if (e.target === previewModal) {
    previewModal.classList.add("hidden");
    previewContent.innerHTML = "";
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !previewModal.classList.contains("hidden")) {
    previewModal.classList.add("hidden");
    previewContent.innerHTML = "";
  }
});

let dragCounter = 0;
messagesEl.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;
  messagesEl.classList.add("drag-over");
});
messagesEl.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; messagesEl.classList.remove("drag-over"); }
});
messagesEl.addEventListener("dragover", (e) => e.preventDefault());
messagesEl.addEventListener("drop", async (e) => {
  e.preventDefault();
  dragCounter = 0;
  messagesEl.classList.remove("drag-over");
  const files = Array.from(e.dataTransfer.files);
  for (const file of files) await uploadAndSendFile(file);
});

document.addEventListener("paste", async (e) => {
  if (!currentChat) return;
  const items = Array.from(e.clipboardData?.items || []);
  const files = items.filter(item => item.kind === "file").map(item => item.getAsFile()).filter(Boolean);
  if (files.length === 0) return;
  e.preventDefault();
  for (const file of files) await uploadAndSendFile(file);
});

/* Голосовые */
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let recordingSeconds = 0;
let audioStream = null;

micBtn.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording();
    return;
  }
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(audioStream);
    audioChunks = [];
    recordingSeconds = 0;

    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      await sendVoiceMessage(audioBlob);
      cleanupRecording();
    };

    mediaRecorder.start();
    micBtn.classList.add("recording");
    recordingBar.classList.remove("hidden");

    recordingInterval = setInterval(() => {
      recordingSeconds++;
      const mm = String(Math.floor(recordingSeconds / 60)).padStart(2, "0");
      const ss = String(recordingSeconds % 60).padStart(2, "0");
      recordingTime.textContent = `${mm}:${ss}`;
    }, 1000);
  } catch (err) {
    console.error("Ошибка доступа к микрофону:", err);
    alert("Не удалось получить доступ к микрофону: " + err.message);
  }
});

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
}

function cleanupRecording() {
  if (audioStream) { audioStream.getTracks().forEach(t => t.stop()); audioStream = null; }
  clearInterval(recordingInterval);
  micBtn.classList.remove("recording");
  recordingBar.classList.add("hidden");
  recordingTime.textContent = "00:00";
  recordingSeconds = 0;
  audioChunks = [];
  mediaRecorder = null;
}

cancelRecording.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
  }
  cleanupRecording();
});

sendRecording.addEventListener("click", () => stopRecording());

async function sendVoiceMessage(audioBlob) {
  if (!currentChat) return;
  try {
    const fileName = `voice_${Date.now()}.webm`;
    const filePath = `${currentUser.uid}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(filePath, audioBlob, { contentType: "audio/webm", cacheControl: "3600" });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(filePath);

    const { error: msgError } = await supabase.from("messages").insert({
      chat_id: currentChat.chatId,
      sender_id: currentUser.uid,
      text: "",
      attachment_url: urlData.publicUrl,
      attachment_type: "audio",
      attachment_name: fileName,
      attachment_size: audioBlob.size
    });

    if (msgError) throw msgError;

    await supabase.from("chats").update({
      last_message: "🎤 Голосовое сообщение",
      last_message_at: new Date().toISOString()
    }).eq("id", currentChat.chatId);
  } catch (e) {
    console.error(e);
    alert("Ошибка отправки голосового: " + e.message);
  }
}

/* ═══════════ НАСТРОЙКИ ═══════════ */

const settingsBtn       = document.getElementById("settings-btn");
const settingsModal     = document.getElementById("settings-modal");
const settingsClose     = document.getElementById("settings-close");
const settingsMessage   = document.getElementById("settings-message");

const setTheme          = document.getElementById("set-theme");
const setCompact        = document.getElementById("set-compact");
const setAnimations     = document.getElementById("set-animations");
const setFontSize       = document.getElementById("set-font-size");
const setSound          = document.getElementById("set-sound");
const setTyping         = document.getElementById("set-typing");
const setOnline         = document.getElementById("set-online");
const setTime           = document.getElementById("set-time");
const setReadCheck      = document.getElementById("set-readcheck");
const setLanguage       = document.getElementById("set-language");
const setReset          = document.getElementById("set-reset");

const SETTINGS_KEY = "electrobook_settings";

const defaultSettings = {
  theme: "dark",
  compact: false,
  animations: true,
  fontSize: "medium",
  sound: true,
  typing: true,
  online: true,
  time: true,
  readCheck: true,
  language: "ru"
};

let settings = { ...defaultSettings };

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) settings = { ...defaultSettings, ...JSON.parse(saved) };
  } catch (e) { console.error("Ошибка загрузки настроек:", e); }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  catch (e) { console.error("Ошибка сохранения:", e); }
}

function applySettings() {
  document.body.classList.toggle("light-theme", settings.theme === "light");
  document.body.classList.toggle("compact-mode", settings.compact);
  document.body.classList.toggle("no-animations", !settings.animations);

  document.body.classList.remove("font-small", "font-medium", "font-large");
  document.body.classList.add(`font-${settings.fontSize}`);

  document.body.classList.toggle("hide-time", !settings.time);
  document.body.classList.toggle("hide-readcheck", !settings.readCheck);
  document.body.classList.toggle("hide-typing", !settings.typing);
  document.body.classList.toggle("hide-online", !settings.online);

  if (setTheme) setTheme.checked = settings.theme === "light";
  if (setCompact) setCompact.checked = settings.compact;
  if (setAnimations) setAnimations.checked = settings.animations;
  if (setFontSize) setFontSize.value = settings.fontSize;
  if (setSound) setSound.checked = settings.sound;
  if (setTyping) setTyping.checked = settings.typing;
  if (setOnline) setOnline.checked = settings.online;
  if (setTime) setTime.checked = settings.time;
  if (setReadCheck) setReadCheck.checked = settings.readCheck;
  if (setLanguage) setLanguage.value = settings.language;
}

settingsBtn.addEventListener("click", () => {
  applySettings();
  settingsModal.classList.remove("hidden");
});

settingsClose.addEventListener("click", () => settingsModal.classList.add("hidden"));
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) settingsModal.classList.add("hidden");
});

setTheme.addEventListener("change", (e) => {
  settings.theme = e.target.checked ? "light" : "dark";
  saveSettings(); applySettings();
  showSettingsMessage("✅ Тема изменена", "success");
});

setCompact.addEventListener("change", (e) => {
  settings.compact = e.target.checked;
  saveSettings(); applySettings();
});

setAnimations.addEventListener("change", (e) => {
  settings.animations = e.target.checked;
  saveSettings(); applySettings();
});

setFontSize.addEventListener("change", (e) => {
  settings.fontSize = e.target.value;
  saveSettings(); applySettings();
});

setSound.addEventListener("change", (e) => { settings.sound = e.target.checked; saveSettings(); });
setTyping.addEventListener("change", (e) => { settings.typing = e.target.checked; saveSettings(); applySettings(); });
setOnline.addEventListener("change", (e) => { settings.online = e.target.checked; saveSettings(); applySettings(); });
setTime.addEventListener("change", (e) => { settings.time = e.target.checked; saveSettings(); applySettings(); });
setReadCheck.addEventListener("change", (e) => { settings.readCheck = e.target.checked; saveSettings(); applySettings(); });

setLanguage.addEventListener("change", (e) => {
  settings.language = e.target.value;
  saveSettings();
  showSettingsMessage(`✅ Язык: ${e.target.value === "ru" ? "Русский" : "English"}`, "success");
});

setReset.addEventListener("click", () => {
  if (!confirm("Сбросить все настройки?")) return;
  settings = { ...defaultSettings };
  saveSettings(); applySettings();
  showSettingsMessage("✅ Настройки сброшены", "success");
});

function showSettingsMessage(text, type) {
  settingsMessage.textContent = text;
  settingsMessage.className = "modal-message " + (type || "");
  setTimeout(() => {
    settingsMessage.textContent = "";
    settingsMessage.className = "modal-message";
  }, 2000);
}

function playNotificationSound() {
  if (!settings.sound) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) { console.error("Ошибка звука:", e); }
}

loadSettings();
applySettings();

window.addEventListener("storage", (e) => {
  if (e.key === SETTINGS_KEY) { loadSettings(); applySettings(); }
});

/* ═══════════ УВЕДОМЛЕНИЯ ═══════════ */

const setNotifications = document.getElementById("set-notifications");

if (setNotifications) {
  setNotifications.checked = localStorage.getItem("notifications_enabled") === "true";
}

setNotifications?.addEventListener("change", async (e) => {
  if (e.target.checked) {
    if (!("Notification" in window)) {
      alert("Браузер не поддерживает уведомления");
      e.target.checked = false;
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem("notifications_enabled", "true");
      showSettingsMessage("✅ Уведомления включены", "success");
      new Notification("Electrobook", {
        body: "Уведомления успешно включены!",
        icon: "public/icon.png"
      });
    } else {
      e.target.checked = false;
      localStorage.setItem("notifications_enabled", "false");
      showSettingsMessage("❌ Разрешение не выдано", "error");
    }
  } else {
    localStorage.setItem("notifications_enabled", "false");
    showSettingsMessage("🔕 Уведомления выключены", "success");
  }
});

function showBrowserNotification(title, body) {
  if (localStorage.getItem("notifications_enabled") !== "true") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notif = new Notification(title, {
      body: body,
      icon: "public/icon.png",
      badge: "public/icon.png",
      tag: "electrobook-message",
      requireInteraction: false,
      silent: false
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    setTimeout(() => notif.close(), 5000);
  } catch (e) {
    console.error("Ошибка уведомления:", e);
  }
}

function updateTabTitle() {
  const baseTitle = "Electrobook";
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
}

function incrementUnread() {
  unreadCount++;
  updateTabTitle();
}

async function markChatAsRead(chatId) {
  if (!currentUser || !chatId) return;

  try {
    const chat = await supabase.from("chats").select("*").eq("id", chatId).single();
    if (chat.data) {
      const isUser1 = chat.data.user1_id === currentUser.uid;
      const updateField = isUser1 ? "user1_last_read" : "user2_last_read";
      await supabase.from("chats")
        .update({ [updateField]: new Date().toISOString(), unread_count: 0 })
        .eq("id", chatId);
    }

    unreadCount = Math.max(0, unreadCount - 1);
    updateTabTitle();
  } catch (e) {
    console.error("Ошибка отметки прочитанного:", e);
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    unreadCount = 0;
    updateTabTitle();
  }
});

updateTabTitle();

/* ═══════════ UX-УЛУЧШЕНИЯ ═══════════ */

const archiveBtn = document.getElementById("archive-btn");

async function loadChatPrefs() {
  if (!currentUser) return {};
  try {
    const { data } = await supabase
      .from("chat_prefs")
      .select("*")
      .eq("user_id", currentUser.uid);

    chatPrefsCache = {};
    (data || []).forEach(p => {
      chatPrefsCache[p.chat_id] = {
        is_pinned: p.is_pinned,
        is_archived: p.is_archived,
        is_muted: p.is_muted
      };
    });
    return chatPrefsCache;
  } catch (e) {
    console.error("Ошибка загрузки prefs:", e);
    return {};
  }
}

async function saveChatPref(chatId, field, value) {
  if (!currentUser) return;
  try {
    const existing = chatPrefsCache[chatId] || { is_pinned: false, is_archived: false, is_muted: false };
    existing[field] = value;

    await supabase.from("chat_prefs").upsert({
      user_id: currentUser.uid,
      chat_id: chatId,
      ...existing
    }, { onConflict: "user_id,chat_id" });

    chatPrefsCache[chatId] = existing;
  } catch (e) {
    console.error("Ошибка сохранения prefs:", e);
  }
}

if (archiveBtn) {
  archiveBtn.addEventListener("click", () => {
    showArchived = !showArchived;
    archiveBtn.textContent = showArchived ? "📂" : "📦";
    archiveBtn.title = showArchived ? "Скрыть архив" : "Показать архив";
    loadChatsList();
  });
}

messageInput.addEventListener("input", async () => {
  if (!currentChat || !currentChat.chatId) return;
  const now = Date.now();
  if (now - lastTypingSent < 2000) return;
  lastTypingSent = now;

  try {
    await supabase.from("typing_status").upsert({
      chat_id: currentChat.chatId,
      user_id: currentUser.uid,
      updated_at: new Date().toISOString()
    }, { onConflict: "chat_id,user_id" });
  } catch (e) { /* Игнорируем */ }
});

setInterval(async () => {
  if (!currentChat || !currentChat.chatId) return;
  try {
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    await supabase.from("typing_status")
      .delete()
      .eq("chat_id", currentChat.chatId)
      .lt("updated_at", fiveSecondsAgo);
  } catch (e) { /* Игнорируем */ }
}, 5000);

/* ═══════════ ДЕЙСТВИЯ С СООБЩЕНИЯМИ ═══════════ */

let selectedMessages = new Set();

function toggleMessageSelection(msgId) {
  if (selectedMessages.has(msgId)) {
    selectedMessages.delete(msgId);
  } else {
    selectedMessages.add(msgId);
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  document.querySelectorAll(".message-wrapper").forEach(w => {
    if (selectedMessages.has(w.dataset.msgId)) {
      w.classList.add("selected");
    } else {
      w.classList.remove("selected");
    }
  });

  let header = document.getElementById("messages-header");
  if (selectedMessages.size > 0) {
    if (!header) {
      header = document.createElement("div");
      header.id = "messages-header";
      header.className = "messages-header";
      chatWindowEl.insertBefore(header, messagesEl);
    }
    header.innerHTML = `
      <button class="icon-btn" id="close-selection">✕</button>
      <span class="count">Выбрано: ${selectedMessages.size}</span>
      <button class="icon-btn" id="forward-selected" title="Переслать">📤</button>
      <button class="icon-btn" id="copy-selected" title="Копировать">📋</button>
      <button class="icon-btn" id="delete-selected" title="Удалить">🗑️</button>
    `;

    document.getElementById("close-selection").onclick = clearSelection;
    document.getElementById("forward-selected").onclick = () => {
      console.log("📤 Клик по Переслать выделенные, кол-во:", selectedMessages.size);
      const messages = [];
      selectedMessages.forEach(id => {
        const msg = currentMessages.find(m => m.id === id);
        if (msg) messages.push(msg);
      });
      clearSelection();
      if (typeof window.openForwardModal === "function") {
        window.openForwardModal(messages);
      } else {
        alert("Функция пересылки не загружена");
      }
    };
    document.getElementById("copy-selected").onclick = copySelectedMessages;
    document.getElementById("delete-selected").onclick = deleteSelectedMessages;
  } else {
    if (header) header.remove();
  }
}

function clearSelection() {
  selectedMessages.clear();
  updateSelectionUI();
}

async function deleteSelectedMessages() {
  if (!confirm(`Удалить ${selectedMessages.size} сообщений?`)) return;
  try {
    for (const msgId of selectedMessages) {
      await supabase.from("messages").update({ is_deleted: true, text: "" }).eq("id", msgId);
    }
    clearSelection();
  } catch (e) { alert("Ошибка: " + e.message); }
}

async function copySelectedMessages() {
  const texts = [];
  for (const msgId of selectedMessages) {
    const msg = currentMessages.find(m => m.id === msgId);
    if (msg && msg.text) texts.push(msg.text);
  }
  navigator.clipboard.writeText(texts.join("\n\n"));
  alert("📋 Скопировано сообщений: " + texts.length);
  clearSelection();
}

async function forwardSelectedMessages() {
  if (selectedMessages.size === 0) return;
  const firstMsg = currentMessages.find(m => selectedMessages.has(m.id));
  if (firstMsg) forwardMessage(firstMsg);
}

document.addEventListener("click", (e) => {
  const msgWrapper = e.target.closest(".message-wrapper");
  if (!msgWrapper) return;

  if (selectedMessages.size > 0) {
    toggleMessageSelection(msgWrapper.dataset.msgId);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && selectedMessages.size > 0) {
    clearSelection();
  }
});

async function forwardMessage(msg) {
  if (!confirm("Переслать сообщение в другой чат?\n\nВыберите чат из списка слева.")) return;

  window.forwardingMessage = msg;
  showForwardBanner(msg);
}

function showForwardBanner(msg) {
  let banner = document.getElementById("forward-banner");
  if (banner) banner.remove();

  banner = document.createElement("div");
  banner.id = "forward-banner";
  banner.style.cssText = `
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #4a90e2, #357abd); color: #fff;
    padding: 12px 20px; border-radius: 12px; z-index: 99999;
    box-shadow: 0 8px 30px rgba(80, 150, 255, 0.6);
    display: flex; align-items: center; gap: 12px;
    font-size: 13px; font-weight: 600;
  `;
  banner.innerHTML = `
    <span>📤 Переслать в выбранный чат...</span>
    <button id="cancel-forward" style="background:transparent;border:none;color:#fff;cursor:pointer;font-size:16px;padding:0;width:auto;margin:0;">✕</button>
  `;
  document.body.appendChild(banner);

  document.getElementById("cancel-forward").onclick = () => {
    window.forwardingMessage = null;
    banner.remove();
  };
}

async function blockCurrentUser() {
  if (!currentChat || !currentChat.id) return;
  if (!confirm(`Заблокировать ${currentChat.full_name || currentChat.username}?\n\nВы не будете получать сообщения от него.`)) return;

  try {
    await supabase.from("blocked_users").insert({
      user_id: currentUser.uid,
      blocked_id: currentChat.id
    });
    alert("🚫 Пользователь заблокирован");
    chatWindowEl.classList.add("hidden");
    placeholderEl.classList.remove("hidden");
    currentChat = null;
    loadChatsList();
  } catch (e) {
    alert("Ошибка: " + e.message);
  }
}

async function isUserBlocked(userId) {
  try {
    const { data } = await supabase
      .from("blocked_users")
      .select("*")
      .eq("user_id", currentUser.uid)
      .eq("blocked_id", userId)
      .single();
    return !!data;
  } catch (e) { return false; }
}

async function amIBlockedBy(userId) {
  try {
    const { data } = await supabase
      .from("blocked_users")
      .select("*")
      .eq("user_id", userId)
      .eq("blocked_id", currentUser.uid)
      .single();
    return !!data;
  } catch (e) { return false; }
}

async function unblockUser(userId) {
  if (!confirm("Разблокировать пользователя?")) return;

  try {
    await supabase
      .from("blocked_users")
      .delete()
      .eq("user_id", currentUser.uid)
      .eq("blocked_id", userId);

    alert("🔓 Пользователь разблокирован");
    if (currentChat && currentChat.id === userId) {
      updateChatStatus(userId);
    }
  } catch (e) { alert("Ошибка: " + e.message); }
}

/* ═══════════ ОНЛАЙН-СТАТУС ═══════════ */

async function updateOnlineStatus() {
  if (!currentUser) return;
  try {
    await supabase
      .from("profiles")
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq("id", currentUser.uid);
  } catch (e) { console.error("online:", e); }
}

setInterval(updateOnlineStatus, 30000);

document.addEventListener("visibilitychange", () => {
  if (!currentUser) return;
  updateOnlineStatus();
});

function formatLastSeen(isoStr) {
  if (!isoStr) return "давно";
  const d = new Date(isoStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;

  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
}

async function getUserStatus(userId) {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("is_online, last_seen")
      .eq("id", userId)
      .single();

    if (!data) return { online: false, lastSeen: "неизвестно" };

    const lastSeen = new Date(data.last_seen).getTime();
    const isReallyOnline = data.is_online && (Date.now() - lastSeen < 120000);

    return {
      online: isReallyOnline,
      lastSeen: data.last_seen
    };
  } catch (e) {
    return { online: false, lastSeen: null };
  }
}

async function updateChatStatus(userId) {
  if (!currentChat || currentChat.isGroup || currentChat.isChannel) return;

  const statusEl = document.getElementById("chat-status");
  if (!statusEl) return;

  const blockedByThem = await amIBlockedBy(userId);
  const iBlockedHim = await isUserBlocked(userId);

  if (blockedByThem || iBlockedHim) {
    statusEl.textContent = "заблокирован";
    statusEl.className = "chat-status blocked";
    return;
  }

  const status = await getUserStatus(userId);
  if (status.online) {
    statusEl.textContent = "в сети";
    statusEl.className = "chat-status online";
  } else {
    statusEl.textContent = "был(а) " + formatLastSeen(status.lastSeen);
    statusEl.className = "chat-status offline";
  }
}

/* ═══════════ КНОПКА "МЕНЮ ЧАТА" ═══════════ */
chatMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = chatMenuBtn.getBoundingClientRect();
  chatMenuDropdown.style.right = "20px";
  chatMenuDropdown.style.top = (rect.bottom + 8) + "px";
  chatMenuDropdown.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!chatMenuDropdown.contains(e.target) && e.target !== chatMenuBtn) {
    chatMenuDropdown.classList.add("hidden");
  }
});

chatMenuDropdown.addEventListener("click", async (e) => {
  const action = e.target.closest(".chat-menu-item")?.dataset.action;
  if (!action) return;
  chatMenuDropdown.classList.add("hidden");

  if (action === "profile" && currentChat?.id) openUserProfile(currentChat.id);
  if (action === "search-chat") {
    chatSearch.classList.remove("hidden");
    chatSearchInput.focus();
  }
  if (action === "block-user") blockCurrentUser();
  if (action === "clear-chat") clearChatHistory();
  if (action === "delete-chat") deleteChat(currentChat?.chatId);
});

async function clearChatHistory() {
  if (!confirm("Очистить всю историю?")) return;
  try {
    await supabase.from("messages").delete().eq("chat_id", currentChat.chatId);
    currentMessages = [];
    messagesEl.innerHTML = `<div class="empty-state" style="margin:auto;"><p>История очищена</p></div>`;
  } catch (e) { alert("Ошибка: " + e.message); }
}

/* ═══════════ БЫСТРЫЕ ЭМОДЗИ ═══════════ */
const emojiBtn = document.getElementById("emoji-btn");
const quickEmojis = document.getElementById("quick-emojis");

if (emojiBtn && quickEmojis) {
  emojiBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    quickEmojis.classList.toggle("hidden");
  });

  quickEmojis.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      messageInput.value += btn.dataset.emoji;
      messageInput.focus();
    });
  });

  document.addEventListener("click", (e) => {
    if (!quickEmojis.contains(e.target) && e.target !== emojiBtn) {
      quickEmojis.classList.add("hidden");
    }
  });
}

/* ═══════════ ПЕРЕСЫЛКА СООБЩЕНИЙ (B1) ═══════════ */

console.log("🚀 Загрузка блока B1...");

window.forwardingMessages = [];

window.openForwardModal = function(messages) {
  if (!messages || messages.length === 0) {
    alert("Нет сообщений для пересылки");
    return;
  }

  window.forwardingMessages = messages;

  const old = document.getElementById("forward-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "forward-modal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal">
      <header class="modal-header">
        <h2>📤 Переслать (${messages.length})</h2>
        <button class="icon-btn" id="forward-modal-close">✕</button>
      </header>
      <div class="modal-body">
        <div class="field">
          <input type="text" id="forward-search" placeholder="Поиск по чатам..." />
        </div>
        <div class="forward-list" id="forward-list">
          <div class="empty-state"><p>Загрузка...</p></div>
        </div>
        <p class="modal-message" id="forward-message"></p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  window.loadForwardList("");

  document.getElementById("forward-modal-close").onclick = window.closeForwardModal;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) window.closeForwardModal();
  });

  const searchInput = document.getElementById("forward-search");
  let timeout = null;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => window.loadForwardList(e.target.value.trim()), 250);
  });
  searchInput.focus();
};

window.closeForwardModal = function() {
  const modal = document.getElementById("forward-modal");
  if (modal) modal.remove();
  window.forwardingMessages = [];
};

window.loadForwardList = async function(term) {
  const listEl = document.getElementById("forward-list");
  if (!listEl) return;

  try {
    const { data: chats } = await supabase
      .from("chats").select("*")
      .or(`user1_id.eq.${currentUser.uid},user2_id.eq.${currentUser.uid}`)
      .order("last_message_at", { ascending: false });

    const otherIds = (chats || []).map(c =>
      c.user1_id === currentUser.uid ? c.user2_id : c.user1_id
    );
    const { data: profiles } = otherIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", otherIds)
      : { data: [] };

    const items = [];

    (chats || []).forEach(chat => {
      const otherId = chat.user1_id === currentUser.uid ? chat.user2_id : chat.user1_id;
      const profile = profiles?.find(p => p.id === otherId);
      if (!profile) return;

      const name = profile.full_name || profile.username || "user";
      if (term && !name.toLowerCase().includes(term.toLowerCase())) return;

      items.push({
        type: "user",
        name,
        username: profile.username,
        color: getAvatarColor(name),
        chatId: chat.id,
        isGroup: false
      });
    });

    if (items.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>Ничего не найдено</p></div>`;
      return;
    }

    listEl.innerHTML = "";
    items.forEach(item => {
      const el = document.createElement("div");
      el.className = "forward-item";
      el.innerHTML = `
        <div class="avatar" data-color="${item.color}">
          ${item.name[0].toUpperCase()}
        </div>
        <div class="forward-item-info">
          <div class="forward-item-name">${escapeHtml(item.name)}</div>
          <div class="forward-item-sub">
            @${escapeHtml(item.username || "user")}
          </div>
        </div>
        <span class="forward-item-arrow">→</span>
      `;
      el.onclick = () => window.forwardToChat(item);
      listEl.appendChild(el);
    });

  } catch (e) {
    console.error("Ошибка загрузки списка для пересылки:", e);
    listEl.innerHTML = `<div class="empty-state"><p>Ошибка: ${e.message}</p></div>`;
  }
};

window.forwardToChat = async function(target) {
  const messages = window.forwardingMessages;
  if (!messages || messages.length === 0) return;

  const msgEl = document.getElementById("forward-message");
  if (msgEl) {
    msgEl.textContent = "Пересылка...";
    msgEl.className = "modal-message";
  }

  try {
    for (const msg of messages) {
      let senderName = "пользователя";
      if (msg.sender_id === currentUser.uid) {
        senderName = "вас";
      } else {
        senderName = currentChat?.username || "пользователя";
      }

      const insertData = {
        chat_id: target.chatId,
        sender_id: currentUser.uid,
        text: msg.text || "",
        forwarded_from: senderName
      };

      if (msg.attachment_url) {
        insertData.attachment_url = msg.attachment_url;
        insertData.attachment_type = msg.attachment_type;
        insertData.attachment_name = msg.attachment_name;
        insertData.attachment_size = msg.attachment_size;
      }

      const { error } = await supabase.from("messages").insert(insertData);
      if (error) throw error;
    }

    if (msgEl) {
      msgEl.textContent = "✅ Переслано!";
      msgEl.className = "modal-message success";
    }

    await supabase.from("chats").update({
      last_message: "📤 Пересланное сообщение",
      last_message_at: new Date().toISOString()
    }).eq("id", target.chatId);

    setTimeout(() => {
      window.closeForwardModal();
      if (currentChat && currentChat.chatId === target.chatId) {
        loadMessages();
      }
    }, 600);

  } catch (e) {
    console.error("Ошибка пересылки:", e);
    if (msgEl) {
      msgEl.textContent = "Ошибка: " + e.message;
      msgEl.className = "modal-message error";
    }
  }
};

// Переопределяем локальную forwardMessage
forwardMessage = function(msg) {
  console.log("📤 forwardMessage вызвана:", msg.id);
  window.openForwardModal([msg]);
};

forwardSelectedMessages = function() {
  if (selectedMessages.size === 0) return;
  const messages = [];
  selectedMessages.forEach(id => {
    const msg = currentMessages.find(m => m.id === id);
    if (msg) messages.push(msg);
  });
  clearSelection();
  window.openForwardModal(messages);
};

// Отображение метки «Переслано от»
const _originalBuildWrapper = buildMessageWrapper;
buildMessageWrapper = function(msg) {
  const wrapper = _originalBuildWrapper(msg);

  if (msg.forwarded_from) {
    const msgEl = wrapper.querySelector(".message");
    if (msgEl) {
      const label = document.createElement("div");
      label.className = "forwarded-label";
      label.innerHTML = `📤 Переслано от <strong>${escapeHtml(msg.forwarded_from)}</strong>`;
      msgEl.insertBefore(label, msgEl.firstChild);
    }
  }

  return wrapper;
};

// CSS для пересылки
const forwardStyles = document.createElement("style");
forwardStyles.textContent = `
  .forward-list { max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
  .forward-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
  .forward-item:hover { background: rgba(100, 160, 255, 0.08); border-color: rgba(100, 160, 255, 0.2); transform: translateX(4px); }
  .forward-item .avatar { width: 44px; height: 44px; font-size: 16px; flex-shrink: 0; }
  .forward-item-info { flex: 1; overflow: hidden; }
  .forward-item-name { font-size: 14.5px; font-weight: 600; color: #fff; margin-bottom: 2px; }
  .forward-item-sub { font-size: 12px; color: rgba(180, 200, 240, 0.6); }
  .forward-item-arrow { font-size: 20px; color: rgba(100, 160, 255, 0.6); transition: all 0.2s; }
  .forward-item:hover .forward-item-arrow { color: #4a90e2; transform: translateX(4px); }
  .forwarded-label { font-size: 12px; color: #4a90e2; font-weight: 600; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed rgba(80, 150, 255, 0.2); display: flex; align-items: center; gap: 4px; }
  .global-search-results { max-height: 400px; overflow-y: auto; }
  .global-search-item { padding: 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 6px; }
  .global-search-item:hover { background: rgba(100, 160, 255, 0.08); border-color: rgba(100, 160, 255, 0.2); }
  .global-search-text { font-size: 14px; color: #fff; margin-bottom: 4px; }
  .global-search-date { font-size: 11px; color: rgba(180, 200, 240, 0.5); }
  .inline-code { background: rgba(80, 150, 255, 0.15); padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px; }
  .pinned-label { color: #ffd700; margin-right: 4px; }
`;
document.head.appendChild(forwardStyles);

console.log("✅ Блок B1: Пересылка сообщений загружена");

/* ═══════════ АВАТАРКИ ПРОФИЛЯ (B2) ═══════════ */

console.log("🚀 Загрузка блока B2...");

window.avatarCache = {};

window.uploadAvatar = async function(file) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) { alert("❌ Только изображения!"); return null; }
  if (file.size > 5 * 1024 * 1024) { alert("❌ Файл слишком большой. Максимум 5 МБ"); return null; }

  try {
    const ext = file.name.split(".").pop() || "png";
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${currentUser.uid}/${fileName}`;

    const { data: existing } = await supabase.storage.from("avatars").list(currentUser.uid);
    if (existing && existing.length > 0) {
      await supabase.storage.from("avatars").remove(existing.map(f => `${currentUser.uid}/${f.name}`));
    }

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", currentUser.uid);

    if (updateError) throw updateError;

    window.avatarCache[currentUser.uid] = publicUrl;
    console.log("✅ Аватарка загружена:", publicUrl);
    return publicUrl;
  } catch (e) {
    console.error("Ошибка загрузки аватарки:", e);
    alert("Ошибка: " + e.message);
    return null;
  }
};

window.deleteAvatar = async function() {
  if (!confirm("Удалить аватарку?")) return;
  try {
    const { data: existing } = await supabase.storage.from("avatars").list(currentUser.uid);
    if (existing && existing.length > 0) {
      await supabase.storage.from("avatars").remove(existing.map(f => `${currentUser.uid}/${f.name}`));
    }

    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", currentUser.uid);
    if (error) throw error;

    delete window.avatarCache[currentUser.uid];
    alert("✅ Аватарка удалена");
    loadChatsList();
    closeProfileModal();
  } catch (e) {
    console.error("Ошибка удаления аватарки:", e);
    alert("Ошибка: " + e.message);
  }
};

window.preloadAvatars = async function(userIds) {
  if (!userIds || userIds.length === 0) return;
  const unknown = userIds.filter(id => !(id in window.avatarCache));
  if (unknown.length === 0) return;

  try {
    const { data } = await supabase.from("profiles").select("id, avatar_url").in("id", unknown);
    (data || []).forEach(p => {
      window.avatarCache[p.id] = p.avatar_url || null;
    });
  } catch (e) {
    console.error("Ошибка предзагрузки аватарок:", e);
  }
};

window.applyAvatarToElement = function(el, userId, fallbackName) {
  if (!el) return;
  const url = window.avatarCache[userId];
  if (url) {
    el.classList.add("avatar-with-image");
    el.innerHTML = `<img src="${url}" alt="${escapeHtml(fallbackName || "")}" loading="lazy" />`;
  }
};

// Патч renderChatItem
const _origRenderChatItemB2 = renderChatItem;
renderChatItem = function(user, chat, lastMessage) {
  _origRenderChatItemB2(user, chat, lastMessage);
  const el = listEl.querySelector(`[data-chat-id="${chat.id}"]`);
  if (!el || !user || !user.id) return;
  const avatarEl = el.querySelector(".avatar");
  if (!avatarEl) return;
  if (user.id in window.avatarCache) {
    window.applyAvatarToElement(avatarEl, user.id, user.username);
  } else {
    window.preloadAvatars([user.id]).then(() => {
      window.applyAvatarToElement(avatarEl, user.id, user.username);
    });
  }
};

// Патч openChat
const _origOpenChatB2 = openChat;
openChat = async function(user, chatId) {
  await _origOpenChatB2(user, chatId);
  if (!user || !user.id) return;
  if (user.id in window.avatarCache) {
    window.applyAvatarToElement(chatAvatarEl, user.id, user.username);
  } else {
    window.preloadAvatars([user.id]).then(() => {
      window.applyAvatarToElement(chatAvatarEl, user.id, user.username);
    });
  }
};

// Патч openProfile
const _origOpenProfileB2 = openProfile;
openProfile = function(user) {
  _origOpenProfileB2(user);
  const modalAvatarEl = document.getElementById("modal-avatar");
  if (!modalAvatarEl) return;
  const userId = user.uid || user.id;
  const name = user.full_name || user.username || "user";

  if (userId in window.avatarCache) {
    window.applyAvatarToElement(modalAvatarEl, userId, name);
  } else {
    window.preloadAvatars([userId]).then(() => {
      window.applyAvatarToElement(modalAvatarEl, userId, name);
    });
  }

  if (!viewingOtherUser) {
    document.getElementById("avatar-actions")?.remove();
    const actions = document.createElement("div");
    actions.id = "avatar-actions";
    actions.style.cssText = `display: flex; gap: 8px; justify-content: center; margin: 12px 0 20px;`;
    actions.innerHTML = `
      <button class="btn-secondary" id="upload-avatar-btn" style="padding: 8px 16px; font-size: 13px;">📷 Загрузить</button>
      <button class="btn-secondary" id="delete-avatar-btn" style="padding: 8px 16px; font-size: 13px; color: #ff6b6b; border-color: rgba(255,107,107,0.3);">🗑️ Удалить</button>
    `;

    const profileHeader = document.querySelector("#profile-modal .profile-header");
    if (profileHeader) profileHeader.after(actions);

    document.getElementById("upload-avatar-btn").onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = await window.uploadAvatar(file);
        if (url) {
          alert("✅ Аватарка загружена!");
          closeProfileModal();
          loadChatsList();
        }
      };
      input.click();
    };

    document.getElementById("delete-avatar-btn").onclick = window.deleteAvatar;
  }
};

// Загрузка своей аватарки при старте
setTimeout(async () => {
  if (!currentUser) return;
  await window.preloadAvatars([currentUser.uid]);
  const myAvatarEl = document.getElementById("my-avatar");
  if (myAvatarEl) {
    window.applyAvatarToElement(myAvatarEl, currentUser.uid, currentUser.username);
  }
}, 2000);

// CSS для аватарок
const avatarStylesB2 = document.createElement("style");
avatarStylesB2.textContent = `
  .avatar.avatar-with-image { padding: 0; overflow: hidden; background: none; }
  .avatar.avatar-with-image img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block; }
  .profile-avatar-big.avatar-with-image { padding: 0; overflow: hidden; background: none; }
  .profile-avatar-big.avatar-with-image img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block; }
  #avatar-actions button { cursor: pointer; transition: all 0.2s; }
  #avatar-actions button:hover { transform: translateY(-2px); }
`;
document.head.appendChild(avatarStylesB2);

console.log("✅ Блок B2: Аватарки профиля загружены");

/* ═══════════ ЗВОНКИ (WebRTC) ═══════════ */

const incomingCallModal = document.getElementById("incoming-call-modal");
const activeCallModal   = document.getElementById("active-call-modal");
const incomingCallAvatar = document.getElementById("incoming-call-avatar");
const incomingCallName  = document.getElementById("incoming-call-name");
const incomingCallType  = document.getElementById("incoming-call-type");
const acceptCallBtn     = document.getElementById("accept-call-btn");
const declineCallBtn    = document.getElementById("decline-call-btn");
const endCallBtn        = document.getElementById("end-call-btn");
const muteBtn           = document.getElementById("mute-btn");
const cameraBtn         = document.getElementById("camera-btn");
const remoteVideo       = document.getElementById("remote-video");
const localVideo        = document.getElementById("local-video");
const activeCallAvatar  = document.getElementById("active-call-avatar");
const activeCallName    = document.getElementById("active-call-name");
const callTimerEl       = document.getElementById("call-timer");

window.currentCall = {
  id: null, type: "audio", peerId: null, peerName: null,
  isInitiator: false, startedAt: null, timerInterval: null,
  isMuted: false, isCameraOff: false
};

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let callRealtimeChannel = null;
let pendingIceCandidates = [];
let isRemoteDescriptionSet = false;
let callTimeout = null;
const callTimeoutDuration = 30000;

async function getLocalStream(type) {
  try {
    const constraints = {
      audio: true,
      video: type === "video" ? { width: 640, height: 480 } : false
    };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    localVideo.srcObject = localStream;
    localVideo.muted = true;
    return localStream;
  } catch (e) {
    console.error("Ошибка доступа к медиа:", e);
    alert("Не удалось получить доступ: " + e.message);
    return null;
  }
}

function createPeerConnection(callId, isInitiator) {
  peerConnection = new RTCPeerConnection(RTC_CONFIG);
  if (localStream) {
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  }
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => {
      if (!remoteStream.getTracks().includes(track)) remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      const field = isInitiator ? "caller_candidates" : "callee_candidates";
      try {
        const { data } = await supabase.from("calls").select(field).eq("id", callId).single();
        const existing = Array.isArray(data?.[field]) ? data[field] : [];
        existing.push(event.candidate.toJSON());
        await supabase.from("calls").update({ [field]: existing }).eq("id", callId);
      } catch (e) { console.error("Ошибка отправки ICE:", e); }
    }
  };

  peerConnection.onconnectionstatechange = () => {
    console.log("🔗 Состояние соединения:", peerConnection.connectionState);
    if (peerConnection.connectionState === "connected") {
      console.log("✅ ЗВОНОК СОЕДИНЁН!");
      if (callTimeout) { clearTimeout(callTimeout); callTimeout = null; }
    }
  };

  return peerConnection;
}

async function initiateCall(type) {
  if (!currentChat) return;
  const peerId = currentChat.id;
  const peerName = currentChat.full_name || currentChat.username || "Пользователь";

  const iBlocked = await isUserBlocked(peerId);
  const blockedBy = await amIBlockedBy(peerId);
  if (iBlocked || blockedBy) { alert("🚫 Нельзя позвонить этому пользователю"); return; }

  const stream = await getLocalStream(type);
  if (!stream) return;

  const callId = "call_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

  try {
    await supabase.from("calls").insert({
      id: callId, caller_id: currentUser.uid, callee_id: peerId,
      call_type: type, status: "ringing",
      caller_candidates: [], callee_candidates: []
    });

    window.currentCall.id = callId;
    window.currentCall.type = type;
    window.currentCall.peerId = peerId;
    window.currentCall.peerName = peerName;
    window.currentCall.isInitiator = true;

    createPeerConnection(callId, true);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await supabase.from("calls").update({ caller_sdp: offer }).eq("id", callId);

    showActiveCallModal(peerName, type);
    startCallTimer();
    subscribeToCall(callId, true);

    callTimeout = setTimeout(async () => {
      console.log("⏰ Таймаут звонка");
      try {
        await supabase.from("calls").update({ status: "missed", ended_at: new Date().toISOString() }).eq("id", callId);
      } catch (e) { /* игнор */ }
      alert("📞 Собеседник не ответил");
      endCall();
    }, callTimeoutDuration);

  } catch (e) {
    console.error("Ошибка инициации:", e);
    alert("Не удалось позвонить: " + e.message);
    endCall();
  }
}

function subscribeToCall(callId, isInitiator) {
  if (callRealtimeChannel) supabase.removeChannel(callRealtimeChannel);
  pendingIceCandidates = [];
  isRemoteDescriptionSet = false;

  callRealtimeChannel = supabase
    .channel("call-" + callId)
    .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
      async (payload) => {
        const call = payload.new;
        console.log("📞 Call update:", call.status, call);

        if (call.status === "declined") {
          clearTimeout(callTimeout);
          alert("📞 Звонок отклонён");
          endCall();
          return;
        }
        if (call.status === "ended" || call.status === "missed") {
          clearTimeout(callTimeout);
          endCall();
          return;
        }

        if (isInitiator && call.callee_sdp && peerConnection && !isRemoteDescriptionSet) {
          console.log("📥 Получен answer");
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(call.callee_sdp));
            isRemoteDescriptionSet = true;
            for (const candidate of pendingIceCandidates) {
              try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
            }
            pendingIceCandidates = [];
            clearTimeout(callTimeout);
            console.log("✅ Соединение установлено (звонящий)");
          } catch (e) { console.error("Ошибка setRemoteDescription:", e); }
        }

        if (!isInitiator) {
          const remoteCandidates = call.caller_candidates || [];
          for (const candidate of remoteCandidates) {
            if (!candidate) continue;
            if (isRemoteDescriptionSet && peerConnection) {
              try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
            } else {
              pendingIceCandidates.push(candidate);
            }
          }
        }

        if (isInitiator) {
          const remoteCandidates = call.callee_candidates || [];
          for (const candidate of remoteCandidates) {
            if (!candidate) continue;
            if (isRemoteDescriptionSet && peerConnection) {
              try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
            } else {
              pendingIceCandidates.push(candidate);
            }
          }
        }
      }
    )
    .subscribe((status) => {
      console.log("📡 Подписка на звонок:", status);
    });
}

async function acceptIncomingCall() {
  const callId = window.currentCall.id;
  const type = window.currentCall.type;
  const stream = await getLocalStream(type);
  if (!stream) return;

  const { data: call } = await supabase.from("calls").select("*").eq("id", callId).single();
  if (!call || !call.caller_sdp) { alert("Ошибка: не найден SDP звонящего"); return; }

  createPeerConnection(callId, false);
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(call.caller_sdp));
    isRemoteDescriptionSet = true;
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await supabase.from("calls").update({ callee_sdp: answer, status: "accepted" }).eq("id", callId);

    for (const candidate of pendingIceCandidates) {
      try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
    }
    pendingIceCandidates = [];

    hideCallModals();
    showActiveCallModal(window.currentCall.peerName, type);
    startCallTimer();
    subscribeToCall(callId, false);
    console.log("✅ Answer отправлен");
  } catch (e) {
    console.error("Ошибка принятия звонка:", e);
    alert("Ошибка соединения: " + e.message);
    endCall();
  }
}

function endCall() {
  if (callTimeout) { clearTimeout(callTimeout); callTimeout = null; }
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (remoteStream) { remoteStream.getTracks().forEach(t => t.stop()); remoteStream = null; }
  if (peerConnection) { peerConnection.close(); peerConnection = null; }
  if (callRealtimeChannel) { supabase.removeChannel(callRealtimeChannel); callRealtimeChannel = null; }

  pendingIceCandidates = [];
  isRemoteDescriptionSet = false;

  stopCallTimer();
  hideCallModals();
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;

  window.currentCall = {
    ...window.currentCall, id: null, peerId: null,
    isInitiator: false, isMuted: false, isCameraOff: false
  };

  muteBtn.classList.remove("muted");
  muteBtn.textContent = "🎤";
  cameraBtn.classList.remove("muted");
  cameraBtn.textContent = "🎥";
}

function showActiveCallModal(peerName, type) {
  activeCallModal.classList.remove("hidden");
  activeCallName.textContent = peerName;
  activeCallAvatar.textContent = peerName[0].toUpperCase();

  if (type === "audio") {
    remoteVideo.style.display = "none";
    localVideo.style.display = "none";
    document.getElementById("audio-call-bg").style.display = "flex";
  } else {
    remoteVideo.style.display = "block";
    localVideo.style.display = "block";
    document.getElementById("audio-call-bg").style.display = "none";
  }
}

function hideCallModals() {
  incomingCallModal.classList.add("hidden");
  activeCallModal.classList.add("hidden");
}

function startCallTimer() {
  const startTime = Date.now();
  window.currentCall.startedAt = startTime;
  if (window.currentCall.timerInterval) clearInterval(window.currentCall.timerInterval);
  window.currentCall.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    callTimerEl.textContent = `${mm}:${ss}`;
  }, 1000);
}

function stopCallTimer() {
  if (window.currentCall.timerInterval) {
    clearInterval(window.currentCall.timerInterval);
    window.currentCall.timerInterval = null;
  }
  callTimerEl.textContent = "00:00";
}

endCallBtn.onclick = async () => {
  const callId = window.currentCall.id;
  if (callId) {
    try { await supabase.from("calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", callId); } catch (e) {}
  }
  endCall();
};

declineCallBtn.onclick = async () => {
  const callId = window.currentCall.id;
  if (callId) {
    try { await supabase.from("calls").update({ status: "declined", ended_at: new Date().toISOString() }).eq("id", callId); } catch (e) {}
  }
  endCall();
};

acceptCallBtn.onclick = () => acceptIncomingCall();

muteBtn.onclick = () => {
  if (!localStream) return;
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    window.currentCall.isMuted = !audioTrack.enabled;
    muteBtn.classList.toggle("muted", window.currentCall.isMuted);
    muteBtn.textContent = window.currentCall.isMuted ? "🔇" : "🎤";
  }
};

cameraBtn.onclick = () => {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    window.currentCall.isCameraOff = !videoTrack.enabled;
    cameraBtn.classList.toggle("muted", window.currentCall.isCameraOff);
    cameraBtn.textContent = window.currentCall.isCameraOff ? "🚫" : "🎥";
  }
};

function listenIncomingCalls() {
  if (!currentUser) return;
  supabase
    .channel("incoming-calls")
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${currentUser.uid}` },
      async (payload) => {
        const call = payload.new;
        if (call.status !== "ringing") return;
        if (window.currentCall.id) return;

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", call.caller_id).single();
        const callerName = profile?.full_name || profile?.username || "Пользователь";

        window.currentCall.id = call.id;
        window.currentCall.type = call.call_type;
        window.currentCall.peerId = call.caller_id;
        window.currentCall.peerName = callerName;
        window.currentCall.isInitiator = false;

        incomingCallAvatar.textContent = callerName[0].toUpperCase();
        incomingCallName.textContent = callerName;
        incomingCallType.textContent = call.call_type === "video" ? "🎥 Видео-звонок" : "📞 Аудио-звонок";
        incomingCallModal.classList.remove("hidden");

        subscribeToCall(call.id, false);
      }
    )
    .subscribe();
}

const callBtnEl = document.getElementById("call-btn");
const videoBtnEl = document.getElementById("video-btn");

if (callBtnEl) {
  callBtnEl.onclick = () => {
    if (!currentChat || currentChat.isGroup || currentChat.isChannel) {
      alert("Звонки доступны только в личных чатах");
      return;
    }
    initiateCall("audio");
  };
}

if (videoBtnEl) {
  videoBtnEl.onclick = () => {
    if (!currentChat || currentChat.isGroup || currentChat.isChannel) {
      alert("Звонки доступны только в личных чатах");
      return;
    }
    initiateCall("video");
  };
}

// Проверка блокировки при отправке
messageForm.addEventListener("submit", async (e) => {
  if (currentChat && !currentChat.isGroup && !currentChat.isChannel) {
    const iBlocked = await isUserBlocked(currentChat.id);
    const blockedBy = await amIBlockedBy(currentChat.id);
    if (iBlocked || blockedBy) {
      e.preventDefault();
      e.stopPropagation();
      alert("🚫 Вы не можете отправлять сообщения этому пользователю");
      return;
    }
  }
}, true);

/* ═══════════ ПРОВЕРКА СЕССИИ ПРИ ЗАГРУЗКЕ ═══════════ */
(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      console.log("✅ Сессия найдена:", session.user.email);
    } else {
      console.log("ℹ️ Сессия не найдена, показываем форму входа");
    }
  } catch (e) {
    console.error("Ошибка проверки сессии:", e);
  }
})();

console.log("✅ main.js загружен успешно");
console.log("📦 Все блоки: B1 (пересылка), B2 (аватарки), B4 (формат), B5 (закреп), B6 (поиск), B7 (уведомления), B8 (ссылки), B9 (эмодзи)");

/* ═══════════════════════════════════════════════
   БЛОК B10: ПОЛНАЯ СИСТЕМА БЛОКИРОВОК
   ═══════════════════════════════════════════════ */

console.log("🚀 Загрузка блока B10 (блокировки)...");

// ─── 1. Универсальная функция: обновить статус чата ───
window.refreshBlockStatus = async function(userId) {
  if (!currentChat || currentChat.id !== userId) return;
  
  const statusEl = document.getElementById("chat-status");
  const formEl = document.getElementById("message-form");
  const inputEl = document.getElementById("message-input");
  if (!statusEl || !formEl || !inputEl) return;

  // Проверяем оба направления блокировки
  const iBlockedHim = await isUserBlocked(userId);
  const blockedByThem = await amIBlockedBy(userId);

  // Убираем старый баннер
  document.getElementById("block-banner")?.remove();

  if (!iBlockedHim && !blockedByThem) {
    // Всё ок — возвращаем к нормальному состоянию
    formEl.classList.remove("blocked");
    inputEl.placeholder = "Написать сообщение...";
    inputEl.disabled = false;
    return;
  }

  // Заблокировано — отключаем ввод
  formEl.classList.add("blocked");
  inputEl.disabled = true;

  // Создаём баннер
  const banner = document.createElement("div");
  banner.id = "block-banner";
  banner.className = "block-banner";

  if (iBlockedHim && blockedByThem) {
    banner.innerHTML = `
      <span class="block-icon">🚫</span>
      <span class="block-text">Вы и этот пользователь заблокированы друг другом</span>
      <button class="block-unblock-btn" id="unblock-from-banner">🔓 Разблокировать</button>
    `;
  } else if (iBlockedHim) {
    banner.innerHTML = `
      <span class="block-icon">🚫</span>
      <span class="block-text">Вы заблокировали этого пользователя</span>
      <button class="block-unblock-btn" id="unblock-from-banner">🔓 Разблокировать</button>
    `;
  } else if (blockedByThem) {
    banner.innerHTML = `
      <span class="block-icon">🚫</span>
      <span class="block-text">Пользователь заблокировал вас</span>
    `;
  }

  // Вставляем баннер после chat-header
  const chatHeader = document.querySelector(".chat-header");
  if (chatHeader) {
    chatHeader.after(banner);
  }

  // Обработчик кнопки разблокировки
  const unblockBtn = document.getElementById("unblock-from-banner");
  if (unblockBtn) {
    unblockBtn.onclick = async () => {
      await window.unblockUser(userId);
      await window.refreshBlockStatus(userId);
    };
  }
};

// ─── 2. Разблокировать пользователя (переписываем) ───
window.unblockUser = async function(userId) {
  if (!confirm("Разблокировать пользователя?")) return;

  try {
    await supabase
      .from("blocked_users")
      .delete()
      .eq("user_id", currentUser.uid)
      .eq("blocked_id", userId);

    alert("🔓 Пользователь разблокирован");

    // Обновляем статус чата
    if (currentChat && currentChat.id === userId) {
      await window.refreshBlockStatus(userId);
    }

    // Обновляем список чатов
    loadChatsList();
  } catch (e) {
    console.error("Ошибка разблокировки:", e);
    alert("Ошибка: " + e.message);
  }
};

// ─── 3. Заблокировать пользователя (переписываем) ───
window.blockCurrentUser = async function() {
  if (!currentChat || !currentChat.id) return;
  const name = currentChat.full_name || currentChat.username || "пользователя";

  if (!confirm(`Заблокировать ${name}?\n\nВы не сможете писать ему, пока не разблокируете.`)) return;

  try {
    // Проверяем, не заблокирован ли уже
    const already = await isUserBlocked(currentChat.id);
    if (already) {
      alert("Пользователь уже заблокирован");
      return;
    }

    await supabase.from("blocked_users").insert({
      user_id: currentUser.uid,
      blocked_id: currentChat.id
    });

    alert("🚫 Пользователь заблокирован");

    // Обновляем статус прямо в открытом чате
    await window.refreshBlockStatus(currentChat.id);

    // Обновляем список чатов
    loadChatsList();
  } catch (e) {
    console.error("Ошибка блокировки:", e);
    alert("Ошибка: " + e.message);
  }
};

// ─── 4. Обновляем контекстное меню чата ───
const _originalShowChatMenuB10 = showChatContextMenu;
showChatContextMenu = function(event, chat, user) {
  document.querySelectorAll(".context-menu").forEach(m => m.remove());
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = event.pageX + "px";
  menu.style.top = event.pageY + "px";

  menu.innerHTML = `
    <div class="context-menu-item" data-action="open">💬 Открыть</div>
    <div class="context-menu-item" data-action="profile">👤 Профиль</div>
    <div class="context-menu-item danger" data-action="delete">🗑️ Удалить чат</div>
  `;
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener("click", closeContextMenu, { once: true }), 10);

  menu.addEventListener("click", (e) => {
    const action = e.target.closest(".context-menu-item")?.dataset.action;
    if (!action) return;
    if (action === "open") openChat(user, chat.id);
    if (action === "profile") openUserProfile(user.id);
    if (action === "delete") deleteChat(chat.id);
    closeContextMenu();
  });
};

// ─── 5. Обновляем меню чата (⋮) ───
chatMenuDropdown.addEventListener("click", async (e) => {
  const action = e.target.closest(".chat-menu-item")?.dataset.action;
  if (!action) return;
  chatMenuDropdown.classList.add("hidden");

  if (action === "profile" && currentChat?.id) openUserProfile(currentChat.id);
  if (action === "search-chat") {
    chatSearch.classList.remove("hidden");
    chatSearchInput.focus();
  }
  if (action === "block-user") await window.blockCurrentUser();
  if (action === "unblock-user") await window.unblockUser(currentChat.id);
  if (action === "clear-chat") clearChatHistory();
  if (action === "delete-chat") deleteChat(currentChat?.chatId);
});

// ─── 6. Патч openChat — при открытии проверяем блокировку ───
const _originalOpenChatB10 = openChat;
openChat = async function(user, chatId) {
  await _originalOpenChatB10(user, chatId);
  
  // После открытия чата сразу проверяем блокировку
  if (user && user.id) {
    setTimeout(() => window.refreshBlockStatus(user.id), 500);
  }
};

// ─── 7. CSS для баннера блокировки ───
const blockStyles = document.createElement("style");
blockStyles.textContent = `
  .block-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background: rgba(255, 107, 107, 0.1);
    border-bottom: 1px solid rgba(255, 107, 107, 0.3);
    font-size: 13px;
    color: #ff6b6b;
    font-weight: 500;
    animation: fadeIn 0.3s ease;
  }
  .block-banner .block-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
  .block-banner .block-text {
    flex: 1;
  }
  .block-banner .block-unblock-btn {
    width: auto;
    padding: 6px 14px;
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    background: rgba(80, 200, 120, 0.15);
    color: #51cf66;
    border: 1px solid rgba(80, 200, 120, 0.4);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: none;
  }
  .block-banner .block-unblock-btn:hover {
    background: rgba(80, 200, 120, 0.3);
    transform: scale(1.05);
  }
  .message-form.blocked {
    opacity: 0.6;
    pointer-events: none;
  }
  .message-form.blocked input::placeholder {
    color: #ff6b6b;
  }
`;
document.head.appendChild(blockStyles);

// ─── 8. Также обновляем статус при загрузке чата ───
const _originalLoadMessagesB10 = loadMessages;
loadMessages = async function() {
  await _originalLoadMessagesB10();
  if (currentChat && currentChat.id && !currentChat.isGroup && !currentChat.isChannel) {
    setTimeout(() => window.refreshBlockStatus(currentChat.id), 300);
  }
};

console.log("✅ Блок B10: Полная система блокировок загружена");