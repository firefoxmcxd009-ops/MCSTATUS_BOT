require("dotenv").config()

const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const express = require("express")
const fs = require("fs")

const token = process.env.BOT_TOKEN
const serverIP = process.env.SERVER_IP || "foxmckingdom.mcpc.ink"
const storeUrl = process.env.STORE_URL
const geminiKey = process.env.GEMINI_API_KEY

const tiktok = process.env.TIKTOK
const telegram = process.env.TELEGRAM
const youtube = process.env.YOUTUBE
const discord = process.env.DISCORD

// =======================
// 🤖 TELEGRAM BOT
// =======================
const bot = new TelegramBot(token, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  }
})

// =======================
// 🌐 EXPRESS KEEP ALIVE
// =======================
const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("✅ Fox MC Kingdom Bot Running")
})

app.listen(PORT, () => {
  console.log(`🌍 Web running on port ${PORT}`)
})

// =======================
// 🔁 SELF PING
// =======================
if (process.env.APP_URL) {
  setInterval(() => {
    axios.get(process.env.APP_URL).catch(() => {})
  }, 300000)
}

// =======================
// 🛡️ ANTI CRASH
// =======================
process.on("uncaughtException", console.error)
process.on("unhandledRejection", console.error)

// =======================
// ⏳ COOLDOWN
// =======================
const cooldown = {}
const cooldownTime = 5000

// =======================
// 👥 USERS
// =======================
let users = []
const USERS_FILE = "./users.json"

if (fs.existsSync(USERS_FILE)) {
  users = JSON.parse(fs.readFileSync(USERS_FILE))
}

function saveUser(id) {
  if (!users.includes(id)) {
    users.push(id)
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
  }
}

// =======================
// 🎮 RANK SYMBOLS MAP
// =======================
const rankSymbols = {
  "admin": "👑",
  "owner": "🔱",
  "mod": "🛡️",
  "vip": "⭐",
  "member": "👤",
  "default": "⚪"
}

// =======================
// 📋 FORMAT PLAYER LIST
// =======================
function formatPlayerList(data) {
  if (!data.players || !data.players.sample || data.players.sample.length === 0) {
    return "No players online"
  }

  let playerList = ""
  data.players.sample.forEach((player) => {
    const rank = player.name.toLowerCase().includes("admin") ? "admin" :
                 player.name.toLowerCase().includes("owner") ? "owner" :
                 player.name.toLowerCase().includes("mod") ? "mod" :
                 player.name.toLowerCase().includes("vip") ? "vip" :
                 "member"
    
    const symbol = rankSymbols[rank] || rankSymbols["default"]
    playerList += `${symbol} ${player.name}\n`
  })

  return playerList
}

// =======================
// 🎨 DETECT SERVER TYPE
// =======================
function detectServerType(data) {
  if (data.version && data.version.toLowerCase().includes("bedrock")) {
    return "🟧 Bedrock"
  }
  if (data.platform === "bedrock") {
    return "🟧 Bedrock"
  }
  return "📦 Java"
}

// =======================
// 🎨 REAL-TIME SERVER STATUS
// =======================
async function getRealTimeStatus() {
  try {
    const res = await axios.get(
      `https://api.mcsrvstat.us/3/${serverIP}`,
      { timeout: 6000 }
    )
    return res.data
  } catch (err) {
    console.error("Status fetch error:", err.message)
    return null
  }
}

// =======================
// 🎨 TELEGRAM BLUE EMBED
// =======================
function createBlueMessage(data) {
  if (!data || !data.online) {
    return `
❌ <b>Server Offline</b>

🖥 <code>${serverIP}</code>

<i>The server is currently unavailable.</i>
`
  }

  const playersOnline = data.players?.online || 0
  const playersMax = data.players?.max || 0
  const version = data.version || "Unknown"
  const ping = data.debug?.ping ? `${data.debug.ping} ms` : "N/A"
  const motd = data.motd?.clean?.join(" ") || data.hostname || "Fox MC Kingdom"
  const port = data.port || "25565"
  const serverType = detectServerType(data)
  const playerList = formatPlayerList(data)

  return `
🔷 <b>FOX MC KINGDOM</b>

╭─────────────────────
│ <b>📍 Server Info</b>
├─────────────────────
│ 🌐 <b>IP:</b> <code>${data.hostname || serverIP}</code>
│ 🔌 <b>Port:</b> <code>${port}</code>
│ 🖥️ <b>Type:</b> ${serverType}
│ 📌 <b>Version:</b> ${version}
╰─────────────────────

╭─────────────────────
│ <b>⚡ Live Status</b>
├─────────────────────
│ 🟢 <b>Status:</b> <code>Online</code>
│ 📊 <b>Players:</b> <code>${playersOnline}/${playersMax}</code>
│ 📡 <b>Ping:</b> <code>${ping}</code>
╰─────────────────────

╭─────────────────────
│ <b>🎯 MOTD</b>
├─────────────────────
│ <blockquote>${motd}</blockquote>
╰─────────────────────

<b>👥 Online Players (${playersOnline}):</b>
<blockquote>${playerList}</blockquote>

━━━━━━━━━━━━━━━━━━━━
`
}

// =======================
// 🤖 GEMINI AI INTEGRATION
// =======================
async function askGeminiAI(question, serverData) {
  if (!geminiKey) {
    return "❌ AI service not configured. Please set GEMINI_API_KEY in .env"
  }

  try {
    const serverInfo = serverData ? `
Current Server Status:
- Players Online: ${serverData.players?.online || 0}/${serverData.players?.max || 0}
- Server Type: ${detectServerType(serverData)}
- Version: ${serverData.version || "Unknown"}
- Status: ${serverData.online ? "Online" : "Offline"}
- Ping: ${serverData.debug?.ping || "N/A"} ms
    ` : ""

    const prompt = `You are a helpful Minecraft server assistant for Fox MC Kingdom server (${serverIP}). 
${serverInfo}

User Question: ${question}

Provide a helpful, friendly response about the server or Minecraft in general. Keep it concise (under 100 words if possible).`

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      },
      { timeout: 10000 }
    )

    const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI"
    return aiResponse

  } catch (err) {
    console.error("Gemini API error:", err.message)
    return "❌ AI service error. Please try again later."
  }
}

// =======================
// 📡 SEND SERVER STATUS
// =======================
async function sendServer(chatId) {
  const now = Date.now()

  if (cooldown[chatId] && now - cooldown[chatId] < cooldownTime) {
    return bot.sendMessage(chatId, "⏳ សូមរង់ចាំបន្តិច...", {
      parse_mode: "HTML"
    })
  }

  cooldown[chatId] = now

  const data = await getRealTimeStatus()
  const message = createBlueMessage(data)

  bot.sendMessage(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🔄 Refresh",
            callback_data: "refresh_status"
          },
          {
            text: "❌ Close",
            callback_data: "close"
          }
        ]
      ]
    }
  })
}

// =======================
// 📜 COMMANDS
// =======================
const commands = {
  "/start": "🚀 Show commands",
  "/status": "📊 Live server status",
  "/players": "👥 Player list info",
  "/rank": "🏆 Rank symbols",
  "/store": "🛒 Open store",
  "/ai": "🤖 Ask about server (use /ai <question>)",
  "/social": "✨ Social links",
}

// =======================
// 🚀 START
// =======================
bot.onText(/\/start/, (msg) => {
  saveUser(msg.chat.id)

  let text = `
👋 <b>សួស្តី! Welcome to Fox MC Kingdom!</b>

🔷 <b>Official Server Bot</b>

📜 <b>Available Commands:</b>
━━━━━━━━━━━━━━━━━━━━
`

  for (let cmd in commands) {
    text += `<code>${cmd}</code> → ${commands[cmd]}\n`
  }

  text += `
━━━━━━━━━━━━━━━━━━━━

🎮 <b>Server Info:</b>
📍 <code>${serverIP}</code>

⭐ <b>Features:</b>
✅ Real-time server status
✅ Player tracking
✅ AI server assistant
✅ Store access
✅ Social links

🤖 <b>AI Assistant:</b>
Ask anything about the server:
<code>/ai How many players online?</code>
<code>/ai What's the server version?</code>
`

  bot.sendMessage(msg.chat.id, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📊 Check Status",
            callback_data: "check_status"
          }
        ],
        [
          {
            text: "👥 Total Users: " + users.length,
            callback_data: "show_users"
          }
        ]
      ]
    }
  })
})

// =======================
// /status
// =======================
bot.onText(/\/status/, (msg) => {
  saveUser(msg.chat.id)
  sendServer(msg.chat.id)
})

// =======================
// /ai <question>
// =======================
bot.onText(/\/ai\s+(.+)/, async (msg, match) => {
  saveUser(msg.chat.id)
  const question = match[1].trim()
  const chatId = msg.chat.id

  const loadingMsg = await bot.sendMessage(chatId, "🤖 <b>Thinking...</b>", {
    parse_mode: "HTML"
  })

  try {
    const serverData = await getRealTimeStatus()
    const aiResponse = await askGeminiAI(question, serverData)

    await bot.editMessageText(
      `🤖 <b>Fox MC Kingdom AI</b>

<b>❓ Your Question:</b>
<i>${question}</i>

<b>💭 Answer:</b>
<blockquote>${aiResponse}</blockquote>

━━━━━━━━━━━━━━━━━━━━`,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔄 Ask Another",
                callback_data: "ask_again"
              }
            ]
          ]
        }
      }
    )
  } catch (err) {
    console.error("AI command error:", err)
    await bot.editMessageText(
      "❌ Error processing your question. Please try again.",
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: "HTML"
      }
    )
  }
})

// =======================
// /players
// =======================
bot.onText(/\/players/, (msg) => {
  saveUser(msg.chat.id)

  bot.sendMessage(msg.chat.id, `
👥 <b>Player List</b>

The server shows all online players in the status message with their ranks:

👑 <b>Admin</b> - Server administrators
🔱 <b>Owner</b> - Server owner
🛡️ <b>Mod</b> - Moderators
⭐ <b>VIP</b> - VIP members
👤 <b>Member</b> - Regular members
⚪ <b>Default</b> - New players

Use <code>/status</code> to see who's currently online!
`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📊 Check Status",
            callback_data: "check_status"
          }
        ]
      ]
    }
  })
})

// =======================
// /rank
// =======================
bot.onText(/\/rank/, (msg) => {
  saveUser(msg.chat.id)

  let rankText = `
🏆 <b>Server Rank Symbols</b>

━━━━━━━━━━━━━━━━━━━━
`

  for (let rank in rankSymbols) {
    rankText += `${rankSymbols[rank]} <b>${rank.toUpperCase()}</b>\n`
  }

  rankText += `
━━━━━━━━━━━━━━━━━━━━

These symbols appear next to player names when viewing the server status. They indicate the player's role on the server.

Want to upgrade your rank? Visit the store!
`

  bot.sendMessage(msg.chat.id, rankText, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🛒 Visit Store",
            callback_data: "open_store"
          }
        ]
      ]
    }
  })
})

// =======================
// /store
// =======================
bot.onText(/\/store/, (msg) => {
  saveUser(msg.chat.id)

  bot.sendMessage(
    msg.chat.id,
    `🛒 <b>Kingdom Store</b>

Welcome to the Fox MC Kingdom store! Purchase ranks, items, and more to enhance your gameplay.

<a href="${storeUrl}">🛍 Open Store</a>

Store Features:
✅ VIP & Premium ranks
✅ Cosmetics & items
✅ Supporter benefits
✅ Exclusive features
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛍 Visit Store", url: storeUrl }]
        ]
      }
    }
  )
})

// =======================
// /social
// =======================
bot.onText(/\/social/, (msg) => {
  saveUser(msg.chat.id)

  bot.sendMessage(msg.chat.id, "✨ <b>Follow Fox MC Kingdom</b>\n\nStay connected with us on social media!", {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎵 TikTok", url: tiktok }],
        [{ text: "📢 Telegram", url: telegram }],
        [{ text: "▶ YouTube", url: youtube }],
        [{ text: "💬 Discord", url: discord }]
      ]
    }
  })
})

// =======================
// 📩 MESSAGE HANDLER
// =======================
bot.on("message", (msg) => {
  const text = msg.text
  if (!text) return

  saveUser(msg.chat.id)

  if (text === "/") {
    let list = "📜 <b>Commands:</b>\n"
    for (let cmd in commands) {
      list += `<code>${cmd}</code>\n`
    }

    return bot.sendMessage(msg.chat.id, list, {
      parse_mode: "HTML"
    })
  }

  if (text.startsWith("/") && !commands[text] && !text.startsWith("/ai")) {
    return bot.sendMessage(msg.chat.id, "❌ មិនស្គាល់ command! Use /start to see available commands.", {
      parse_mode: "HTML"
    })
  }
})

// =======================
// 🔘 CALLBACK BUTTONS
// =======================
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id

  if (query.data === "refresh_status" || query.data === "check_status") {
    sendServer(chatId)
    bot.answerCallbackQuery(query.id, {
      text: "🔄 Refreshing..."
    })
  }

  if (query.data === "show_users") {
    bot.answerCallbackQuery(query.id, {
      text: `👥 Total Users: ${users.length}`,
      show_alert: true
    })
  }

  if (query.data === "open_store") {
    bot.answerCallbackQuery(query.id, {
      text: "🛒 Opening store...",
      show_alert: false
    })
  }

  if (query.data === "ask_again") {
    bot.sendMessage(chatId, `
🤖 <b>Ask Fox MC Kingdom AI</b>

Send me your question:
<code>/ai What is the server IP?</code>
<code>/ai How do I join?</code>
<code>/ai Tell me about VIP rank</code>
`, {
      parse_mode: "HTML"
    })
    bot.answerCallbackQuery(query.id, {
      text: "Ready for your question!"
    })
  }

  if (query.data === "close") {
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {})
    bot.answerCallbackQuery(query.id, {
      text: "❌ Closed"
    })
  }
})

console.log("🔥 Fox MC Kingdom Bot Running...")
console.log(`📍 Server: ${serverIP}`)
console.log(`🤖 AI Integration: ${geminiKey ? "Enabled" : "Disabled"}`)
