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

// ✅ Bot
const bot = new TelegramBot(token, {
  polling: { interval: 300, autoStart: true, params: { timeout: 10 } }
})

// 🌐 Express
const app = express()
const PORT = process.env.PORT || 3000
app.get("/", (req, res) => res.send("Bot Running 🚀"))
app.listen(PORT)

// 🔥 Self-ping
if (process.env.APP_URL) {
  setInterval(() => {
    axios.get(process.env.APP_URL).catch(() => {})
  }, 300000)
}

// 💥 Anti crash
process.on("uncaughtException", console.log)
process.on("unhandledRejection", console.log)

// ⏳ Cooldown
const cooldown = {}
const cooldownTime = 10000

// 📊 Users
let users = []
const USERS_FILE = "./users.json"
if (fs.existsSync(USERS_FILE)) {
  users = JSON.parse(fs.readFileSync(USERS_FILE))
}

function saveUser(id) {
  if (!users.includes(id)) {
    users.push(id)
    fs.writeFileSync(USERS_FILE, JSON.stringify(users))
  }
}

// 📡 Server Status
async function sendServer(chatId, ip) {

  const now = Date.now()
  if (cooldown[chatId] && now - cooldown[chatId] < cooldownTime) {
    return bot.sendMessage(chatId, "⏳ ចាំតិចមើល...")
  }

  cooldown[chatId] = now

  try {
    const res = await axios.get(`https://api.mcsrvstat.us/3/${ip}`, { timeout: 5000 })
    const data = res.data

    if (!data.online) {
      return bot.sendMessage(chatId, "❌ Server Offline/Not found")
    }

    const playersOnline = data.players?.online || 0
    const playersMax = data.players?.max || 0
    const version = data.version || "Unknown"
    const ping = data.debug?.ping || "N/A"

    let message = `🖥 *Server:* ${ip}\n`
    message += `🟢 *Status:* Online\n`
    message += `📦 *Version:* ${version}\n`
    message += `👥 *Players:* ${playersOnline}/${playersMax}\n`
    message += `📶 *Ping:* ${ping} ms`

    bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Copy IP", callback_data: "copy_" + ip }],
          [{ text: "🔄 Refresh", callback_data: "refresh_" + ip }]
        ]
      }
    })

  } catch (err) {
    console.log(err)
    bot.sendMessage(chatId, "❌ Error fetching server")
  }
}

// 📜 Commands
const commands = {
  "/start": "Show commands",
  "/status": "Check default server",
  "/store": "Open store",
  "/social": "Social media links",
  "/tiktok": "TikTok",
  "/telegram": "Telegram",
  "/youtube": "YouTube",
  "/discord": "Discord"
}

// /start
bot.onText(/\/start/, msg => {
  saveUser(msg.chat.id)

  let text = "👋 សួរស្តីប្រូៗ ខ្ញុំជា bot សម្រាប់ឆែកមើល Status Server\nCommands:\n"
  text += "⚡ខំមិនដែលត្រូវប្រើ ;)\n______________\n"

  for (let cmd in commands) {
    text += `${cmd} → ${commands[cmd]}\n`
  }

  text += "ជួយ Follow Tiktok ម្នាក់មួយផង :)\n💡 Type any server IP to check status\n🇰🇭 វាយ IP server ដើម្បីមើល status"

  bot.sendMessage(msg.chat.id, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "👥 Show Users", callback_data: "show_users" }]
      ]
    }
  })
})

// /status
bot.onText(/\/status/, msg => {
  saveUser(msg.chat.id)
  sendServer(msg.chat.id, defaultServer)
})

// /store
bot.onText(/\/store/, msg => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "🛒 Webstore:\n https://firefoxmckingdomstore.vercel.app", {
    reply_markup: {
      inline_keyboard: [[{ text: "Open Store", url: storeUrl }]]
    }
  })
})

// /social
bot.onText(/\/social/, msg => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "✨ Social Media", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "TikTok", url: tiktok }],
        [{ text: "Telegram", url: telegram }],
        [{ text: "YouTube", url: youtube }],
        [{ text: "Discord", url: discord }]
      ]
    }
  })
})

// individual
bot.onText(/\/tiktok/, msg => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "🔥TikTok:\n https://tiktok.com/@firefoxmc.xd", {
    reply_markup: { inline_keyboard: [[{ text: "Open", url: tiktok }]] }
  })
})

bot.onText(/\/telegram/, msg => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "⚡Telegram:\n https://t.me/firefoxmc_xd", {
    reply_markup: { inline_keyboard: [[{ text: "Open", url: telegram }]] }
  })
})

bot.onText(/\/youtube/, msg => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "🌊YouTube:\n https://youtube.com/@site_mckingdom", {
    reply_markup: { inline_keyboard: [[{ text: "Open", url: youtube }]] }
  })
})

bot.onText(/\/discord/, msg => {
  saveUser(msg.chat.id)
  bot.sendMessage(msg.chat.id, "🌀Discord:\n https://discord.gg/eAJrmA5jE", {
    reply_markup: { inline_keyboard: [[{ text: "Join", url: discord }]] }
  })
})

// 📩 MESSAGE HANDLER (FIXED)
bot.on("message", msg => {

  const text = msg.text
  if (!text) return

  saveUser(msg.chat.id)

  // command list
  if (text === "/") {
    let list = "📜 Commands:\n"
    for (let cmd in commands) list += cmd + "\n"
    return bot.sendMessage(msg.chat.id, list)
  }

  // unknown command
  if (text.startsWith("/") && !commands[text]) {
    return bot.sendMessage(msg.chat.id, "❌ មិនស្គាល់ខំមិនទេ!")
  }

  // ✅ ONLY IP (must contain ".")
  if (!text.startsWith("/") && text.includes(".")) {
    sendServer(msg.chat.id, text)
  }

  // ❌ no "." → no reply
})

// 🔘 Buttons
bot.on("callback_query", query => {
  const chatId = query.message.chat.id

  if (query.data.startsWith("copy_")) {
    sendServer(chatId, query.data.replace("copy_", ""))
  }

  if (query.data.startsWith("refresh_")) {
    sendServer(chatId, query.data.replace("refresh_", ""))
  }

  if (query.data === "show_users") {
    bot.answerCallbackQuery(query.id, {
      text: `👥 Total Users: ${users.length}`
    })
  }
})

console.log("🔥 CLEAN BOT RUNNING 24/7")
