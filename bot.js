require("dotenv").config()

const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const express = require("express")
const fs = require("fs")

const token = process.env.BOT_TOKEN
const defaultServer = process.env.DEFAULT_SERVER
const storeUrl = process.env.STORE_URL

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
  res.send("✅ Telegram Minecraft Status Bot Running")
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
const cooldownTime = 10000

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
  data.players.sample.forEach((player, index) => {
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
// 🎨 TELEGRAM BLUE EMBED
// =======================
function createBlueMessage(ip, data) {
  const playersOnline = data.players?.online || 0
  const playersMax = data.players?.max || 0
  const version = data.version || "Unknown"
  const ping = data.debug?.ping ? `${data.debug.ping} ms` : "N/A"
  const motd = data.motd?.clean?.join(" ") || data.hostname || "Minecraft Server"
  const port = data.port || "25565"
  const serverType = detectServerType(data)
  const playerList = formatPlayerList(data)

  return `
🔷 <b>FOXMCSTATUS</b>

╭─────────────────────
│ <b>📍 Server Info</b>
├─────────────────────
│ 🌐 <b>IP/Domain:</b> <code>${data.hostname || ip}</code>
│ 🔌 <b>Port:</b> <code>${port}</code>
│ 🖥️ <b>Type:</b> ${serverType}
│ 📌 <b>Version:</b> ${version}
╰─────────────────────

╭─────────────────────
│ <b>⚡ Status</b>
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

<b>👥 Online Players:</b>
<blockquote>${playerList}</blockquote>

━━━━━━━━━━━━━━━━━━━━
`
}

// =======================
// 📡 SERVER STATUS
// =======================
async function sendServer(chatId, ip) {
  const now = Date.now()

  if (cooldown[chatId] && now - cooldown[chatId] < cooldownTime) {
    return bot.sendMessage(chatId, "⏳ សូមរង់ចាំបន្តិច...", {
      parse_mode: "HTML"
    })
  }

  cooldown[chatId] = now

  try {
    const res = await axios.get(
      `https://api.mcsrvstat.us/3/${ip}`,
      { timeout: 6000 }
    )

    const data = res.data

    if (!data.online) {
      return bot.sendMessage(chatId, `
❌ <b>Server Offline / Not Found</b>

🖥 <code>${ip}</code>
`, {
        parse_mode: "HTML"
      })
    }

    const message = createBlueMessage(ip, data)

    bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🔄 Refresh",
              callback_data: `refresh_${ip}`
            },
            {
              text: "❌ Close",
              callback_data: "close"
            }
          ]
        ]
      }
    })
  } catch (err) {
    console.error(err)

    bot.sendMessage(chatId, `
💀 <b>Bot Error</b>

សេវាកម្មកំពុងមានបញ្ហា សូមសាកម្ដងទៀត។
`, {
      parse_mode: "HTML"
    })
  }
}

// =======================
// 📜 COMMANDS
// =======================
const commands = {
  "/start": "🚀 Show commands",
  "/status": "📊 Check default server",
  "/store": "🛒 Open store",
  "/players": "👥 Player list command",
  "/rank": "🏆 Rank symbols guide",
  "/social": "✨ Social links",
  "/tiktok": "🎵 TikTok",
  "/telegram": "📢 Telegram",
  "/youtube": "▶ YouTube",
  "/discord": "💬 Discord"
}

// =======================
// 🚀 START
// =======================
bot.onText(/\/start/, (msg) => {
  saveUser(msg.chat.id)

  let text = `
👋 <b>សួស្តី!</b>

ខ្ញុំជា Minecraft Status Bot 🔷

📜 <b>Commands:</b>
━━━━━━━━━━━━━━━━━━━━
`

  for (let cmd in commands) {
    text += `<code>${cmd}</code> → ${commands[cmd]}\n`
  }

  text += `
━━━━━━━━━━━━━━━━━━━━

🌐 វាយ IP / Domain server ដើម្បីឆែក status
✅ Support SRV Record + Port

ឧទាហរណ៍:
<code>play.hypixel.net</code>
<code>play.example.com:25565</code>

🎮 Server Type Detection:
📦 Java Edition
🟧 Bedrock Edition
`

  bot.sendMessage(msg.chat.id, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
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
  sendServer(msg.chat.id, defaultServer)
})

// =======================
// /players
// =======================
bot.onText(/\/players/, (msg) => {
  saveUser(msg.chat.id)

  bot.sendMessage(msg.chat.id, `
👥 <b>Player List Command</b>

ឧទាហរណ៍៖
<code>/players play.hypixel.net</code>

វាលអ្នកលេង៖
👤 Member
⭐ VIP
🛡️ Mod
🔱 Owner
👑 Admin
⚪ Default
`, {
    parse_mode: "HTML"
  })
})

// =======================
// /rank
// =======================
bot.onText(/\/rank/, (msg) => {
  saveUser(msg.chat.id)

  let rankText = `
🏆 <b>Rank Symbols Guide</b>

━━━━━━━━━━━━━━━━━━━━
`

  for (let rank in rankSymbols) {
    rankText += `${rankSymbols[rank]} <b>${rank.toUpperCase()}</b>\n`
  }

  rankText += `
━━━━━━━━━━━━━━━━━━━━

<i>ពិគ្រាមយランク៉ូង្យ អ្នកលេង</i>
`

  bot.sendMessage(msg.chat.id, rankText, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🎮 Check Server",
            callback_data: "show_rank_info"
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

<a href="${storeUrl}">Open Store</a>

ទិញរបស់របបរបស់ម៉ាង់ក្រុម`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛍 Open Store", url: storeUrl }]
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

  bot.sendMessage(msg.chat.id, "✨ <b>Social Media</b>", {
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
// INDIVIDUAL SOCIAL
// =======================
bot.onText(/\/tiktok/, (msg) => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "🎵 TikTok", {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "Open", url: tiktok }]]
    }
  })
})

bot.onText(/\/telegram/, (msg) => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "📢 Telegram", {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "Open", url: telegram }]]
    }
  })
})

bot.onText(/\/youtube/, (msg) => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "▶ YouTube", {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "Open", url: youtube }]]
    }
  })
})

bot.onText(/\/discord/, (msg) => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "💬 Discord", {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "Join", url: discord }]]
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
      list += `<code>${cmd}</code> - ${commands[cmd]}\n`
    }

    return bot.sendMessage(msg.chat.id, list, {
      parse_mode: "HTML"
    })
  }

  if (text.startsWith("/") && !commands[text]) {
    return bot.sendMessage(msg.chat.id, "❌ មិនស្គាល់ command!", {
      parse_mode: "HTML"
    })
  }

  // ✅ Allow normal IP / domain / SRV / port
  if (!text.startsWith("/") && (text.includes(".") || text.includes(":"))) {
    sendServer(msg.chat.id, text.trim())
  }
})

// =======================
// 🔘 BUTTONS
// =======================
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id

  if (query.data.startsWith("refresh_")) {
    const ip = query.data.replace("refresh_", "")
    sendServer(chatId, ip)
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

  if (query.data === "show_rank_info") {
    bot.answerCallbackQuery(query.id, {
      text: "🏆 Rank system is enabled. Check player status!",
      show_alert: false
    })
  }

  if (query.data === "close") {
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {})
    bot.answerCallbackQuery(query.id, {
      text: "❌ Closed"
    })
  }
})

console.log("🔥 Telegram MC Bot Running...")
