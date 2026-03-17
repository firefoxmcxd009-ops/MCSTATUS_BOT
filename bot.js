require("dotenv").config()

const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const express = require("express")

const token = process.env.BOT_TOKEN
const defaultServer = process.env.DEFAULT_SERVER
const storeUrl = process.env.STORE_URL
const tiktok = process.env.tiktok
const telegram = process.env.telegram
const youtube = process.env.youtube
const discord = process.env.discord

// ✅ Stable polling config
const bot = new TelegramBot(token, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
})

// 🌐 Express server (Render required)
const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("Minecraft Status Bot Running 🚀")
})

app.listen(PORT, () => {
  console.log("Web server running on port " + PORT)
})

// 🔥 SELF PING (No sleep without UptimeRobot)
const APP_URL = process.env.APP_URL // put your render URL

if (APP_URL) {
  setInterval(() => {
    axios.get(APP_URL).catch(() => {})
  }, 5 * 60 * 1000) // every 5 min
}

// 💥 Anti crash
process.on("uncaughtException", err => console.log("ERROR:", err))
process.on("unhandledRejection", err => console.log("ERROR:", err))

// 💡 Keep alive log
setInterval(() => {
  console.log("Bot still alive 🚀")
}, 30000)

// ⏳ Cooldown system
const cooldown = {}
const cooldownTime = 10000

// 📜 Commands
const commands = {
  "/start": "Show commands",
  "/status": "Check default server",
  "/store": "Open webstore",
  "/social-media": "Open webstore"
}

// ✨ Social Media
const socials = {
  "/tiktok": "My Tiktok Account",
  "/telegram": "My Telegram Account",
  "/youtube": "My Telegram Youtube",
  "/discord": "Join My Discord Server",
}

// /start
bot.onText(/\/start/, msg => {

  let text = "👋Hello, I'm MC Status Bot\n\nCommands:\n"

  for (let cmd in commands) {
    text += `${cmd} → ${commands[cmd]}\n`
  }

  text += "\n💡 Type any server IP to check status"
  let khmer_translation = "វាយបញ្ចូល server ip ណាមួយដើម្បីឆែកមើល status!"
  bot.sendMessage(msg.chat.id, text, khmer_translation)
})

// /status
bot.onText(/\/status/, msg => {
  sendServer(msg.chat.id, defaultServer)
})

// /store
bot.onText(/\/store/, msg => {
  bot.sendMessage(msg.chat.id, "🛒 Webstore", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Open Store", url: storeUrl }]
      ]
    }
  })
})
// ============================= //
// ======= Socail Media ======== //
// ============================= //
bot.onText(/\/social-media/, msg => {

  let link = "✨ My Social Media ☄️\n\nCommands:\n"

  for (let cmd in socials) {
    link += `${cmd} → ${socials[cmd]}\n`
  }

  link += "\nYou can support me to follow my Tiktok  and Subscribt my YouTube Channel! ;)"

  bot.sendMessage(msg.chat.id, link)
})

// /tiktok
bot.onText(/\/store/, msg => {
  bot.sendMessage(msg.chat.id, "✨TikTok", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚡Open TikTok", url: tiktok }]
      ]
    }
  })
})
// /telegram
bot.onText(/\/store/, msg => {
  bot.sendMessage(msg.chat.id, "✨Telegram", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚡View Chat", url: telegram }]
      ]
    }
  })
})
// /youtube
bot.onText(/\/store/, msg => {
  bot.sendMessage(msg.chat.id, "✨Youtube", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚡Open Youtube", url: youtube }]
      ]
    }
  })
})
// /discord
bot.onText(/\/store/, msg => {
  bot.sendMessage(msg.chat.id, "✨Discord Server", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚡Join Discord", url: discord }]
      ]
    }
  })
})

// 📡 Fetch server info
async function sendServer(chatId, ip) {

  const now = Date.now()

  if (cooldown[chatId] && now - cooldown[chatId] < cooldownTime) {
    return bot.sendMessage(chatId, "⏳ Please wait...")
  }

  cooldown[chatId] = now

  try {

    const res = await axios.get(`https://api.mcsrvstat.us/3/${ip}`, {
      timeout: 5000
    })

    const data = res.data

    if (!data.online) {
      return bot.sendMessage(chatId, `❌ Server ${ip} Offline`)
    }

    const playersOnline = data.players?.online || 0
    const playersMax = data.players?.max || 0
    const playerList = data.players?.list?.join(", ") || "Hidden"
    const version = data.version || "Unknown"
    const motd = data.motd?.clean?.join(" ") || "None"
    const ping = data.debug?.ping || "N/A"

    const message = `
🖥 Server: ${ip}

🟢 Status: Online
📦 Version: ${version}
📜 MOTD: ${motd}

👥 Players: ${playersOnline}/${playersMax}
📋 Player List: ${playerList}

📶 Ping: ${ping} ms
`

    bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Copy IP", callback_data: "copy_" + ip }],
          [{ text: "🔄 Refresh", callback_data: "refresh_" + ip }]
        ]
      }
    })

  } catch (err) {
    console.log(err)
    bot.sendMessage(chatId, "❌ Cannot fetch server info")
  }
}

// 🔘 Button handler
bot.on("callback_query", query => {

  const chatId = query.message.chat.id

  if (query.data.startsWith("copy_")) {
    const ip = query.data.replace("copy_", "")
    bot.answerCallbackQuery(query.id, {
      text: "Server IP: " + ip
    })
  }

  if (query.data.startsWith("refresh_")) {
    const ip = query.data.replace("refresh_", "")
    sendServer(chatId, ip)
  }

})

// 📩 Handle messages
bot.on("message", msg => {

  const text = msg.text
  if (!text) return

  // "/" → show commands
  if (text === "/") {
    let textMsg = "📜 Commands:\n"
    for (let cmd in commands) {
      textMsg += `${cmd}\n`
    }
    return bot.sendMessage(msg.chat.id, textMsg)
  }

  // ignore known commands
  if (text.startsWith("/") && !commands[text]) {
    return bot.sendMessage(msg.chat.id, "❌ Unknown command")
  }

  // custom IP
  if (!text.startsWith("/")) {
    sendServer(msg.chat.id, text)
  }

})

console.log("🔥 PRO Bot Running 24/7")
