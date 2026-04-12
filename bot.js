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
// 🎨 TELEGRAM BLUE EMBED
// =======================
function createBlueMessage(ip, data) {
  const playersOnline = data.players?.online || 0
  const playersMax = data.players?.max || 0
  const version = data.version || "Unknown"
  const ping = data.debug?.ping ? `${data.debug.ping} ms` : "N/A"
  const motd =
    data.motd?.clean?.join(" ") ||
    data.hostname ||
    "Minecraft Server"

  return `
🔷 <b>FOXMCSTATUS</b>

〓 <b>IP:</b> <code>${data.hostname || ip}</code>
✎ <b>Port:</b> <code>${data.port || "19132 / 25565"}</code>

⎔ <b>Status:</b> Online
★ <b>Version:</b> ${version}
☘ <b>Players:</b> ${playersOnline}/${playersMax}
彡 <b>Ping:</b> ${ping}

☾ <b>MOTD:</b>
<blockquote>${motd}</blockquote>

━━━━━━━━━━━━━━
༺ <a href="https://foxmcstatus.vercel.app">More Tools</a>
`
}

// =======================
// 📡 SERVER STATUS
// =======================
async function sendServer(chatId, ip) {
  const now = Date.now()

  if (cooldown[chatId] && now - cooldown[chatId] < cooldownTime) {
    return bot.sendMessage(chatId, "⏳ សូមរង់ចាំបន្តិច...")
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
  "/start": "Show commands",
  "/status": "Check default server",
  "/store": "Open store",
  "/social": "Social links",
  "/tiktok": "TikTok",
  "/telegram": "Telegram",
  "/youtube": "YouTube",
  "/discord": "Discord"
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
━━━━━━━━━━━━━━
`

  for (let cmd in commands) {
    text += `${cmd} → ${commands[cmd]}\n`
  }

  text += `
━━━━━━━━━━━━━━
🌐 វាយ IP / Domain server ដើម្បីឆែក status
✅ Support SRV Record + Port

ឧទាហរណ៍:
<code>play.hypixel.net</code>
<code>play.example.com:25565</code>
`

  bot.sendMessage(msg.chat.id, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "👥 Total Users",
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
// /store
// =======================
bot.onText(/\/store/, (msg) => {
  saveUser(msg.chat.id)

  bot.sendMessage(
    msg.chat.id,
    "🛒 <b>Web Store</b>",
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
    reply_markup: {
      inline_keyboard: [[{ text: "Open", url: tiktok }]]
    }
  })
})

bot.onText(/\/telegram/, (msg) => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "📢 Telegram", {
    reply_markup: {
      inline_keyboard: [[{ text: "Open", url: telegram }]]
    }
  })
})

bot.onText(/\/youtube/, (msg) => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "▶ YouTube", {
    reply_markup: {
      inline_keyboard: [[{ text: "Open", url: youtube }]]
    }
  })
})

bot.onText(/\/discord/, (msg) => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "💬 Discord", {
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
    let list = "📜 Commands:\n"
    for (let cmd in commands) list += cmd + "\n"

    return bot.sendMessage(msg.chat.id, list)
  }

  if (text.startsWith("/") && !commands[text]) {
    return bot.sendMessage(msg.chat.id, "❌ មិនស្គាល់ command!")
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
  }

  if (query.data === "show_users") {
    bot.answerCallbackQuery(query.id, {
      text: `👥 Total Users: ${users.length}`
    })
  }
})

console.log("🔥 Telegram MC Bot Running...")
