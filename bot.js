require("dotenv").config()

const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const express = require("express")

const token = process.env.BOT_TOKEN
const defaultServer = process.env.DEFAULT_SERVER
const storeUrl = process.env.STORE_URL

const tiktok = process.env.TIKTOK
const telegram = process.env.TELEGRAM
const youtube = process.env.YOUTUBE
const discord = process.env.DISCORD

// ✅ Bot
const bot = new TelegramBot(token, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  }
})

// 🌐 Express
const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => res.send("Bot Running 🚀"))
app.listen(PORT)

// 🔥 Self ping
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

  let text = "👋 Hello! MC Status Bot\n\nCommands:\n"

  for (let cmd in commands) {
    text += `${cmd} → ${commands[cmd]}\n`
  }

  text += "\n💡 Type any server IP to check status\n🇰🇭 វាយ IP server ដើម្បីមើល status"

  bot.sendMessage(msg.chat.id, text)
})

// /status
bot.onText(/\/status/, msg => {
  sendServer(msg.chat.id, defaultServer)
})

// /store
bot.onText(/\/store/, msg => {
  bot.sendMessage(msg.chat.id, "🛒 Webstore", {
    reply_markup: {
      inline_keyboard: [[{ text: "Open Store", url: storeUrl }]]
    }
  })
})

// /social
bot.onText(/\/social/, msg => {

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

// Individual commands
bot.onText(/\/tiktok/, msg => {
  bot.sendMessage(msg.chat.id, "TikTok", {
    reply_markup: { inline_keyboard: [[{ text: "Open", url: tiktok }]] }
  })
})

bot.onText(/\/telegram/, msg => {
  bot.sendMessage(msg.chat.id, "Telegram", {
    reply_markup: { inline_keyboard: [[{ text: "Open", url: telegram }]] }
  })
})

bot.onText(/\/youtube/, msg => {
  bot.sendMessage(msg.chat.id, "YouTube", {
    reply_markup: { inline_keyboard: [[{ text: "Open", url: youtube }]] }
  })
})

bot.onText(/\/discord/, msg => {
  bot.sendMessage(msg.chat.id, "Discord", {
    reply_markup: { inline_keyboard: [[{ text: "Join", url: discord }]] }
  })
})

// 📡 Server status
async function sendServer(chatId, ip) {

  const now = Date.now()

  if (cooldown[chatId] && now - cooldown[chatId] < cooldownTime) {
    return bot.sendMessage(chatId, "⏳ Please wait...")
  }

  cooldown[chatId] = now

  try {

    const res = await axios.get(`https://api.mcsrvstat.us/3/${ip}`, { timeout: 5000 })
    const data = res.data

    if (!data.online) {
      return bot.sendMessage(chatId, `❌ Server ${ip} Offline`)
    }

    const msg = `
🖥 ${ip}
🟢 Online
👥 ${data.players?.online || 0}/${data.players?.max || 0}
📦 ${data.version || "Unknown"}
📶 ${data.debug?.ping || "N/A"} ms
`

    bot.sendMessage(chatId, msg)

  } catch {
    bot.sendMessage(chatId, "❌ Error fetching server")
  }
}

// 📩 Messages
bot.on("message", msg => {

  const text = msg.text
  if (!text) return

  if (text === "/") {
    let list = "📜 Commands:\n"
    for (let cmd in commands) list += cmd + "\n"
    return bot.sendMessage(msg.chat.id, list)
  }

  if (text.startsWith("/") && !commands[text]) {
    return bot.sendMessage(msg.chat.id, "❌ Unknown command")
  }

  if (!text.startsWith("/")) {
    sendServer(msg.chat.id, text)
  }

})

console.log("🔥 Bot Running")
