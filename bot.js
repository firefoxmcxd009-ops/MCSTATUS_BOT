require("dotenv").config()

const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const express = require("express")
const fs = require("fs")

const token = process.env.BOT_TOKEN
const defaultServer = process.env.DEFAULT_SERVER

// =======================
// 🤖 BOT INIT
// =======================
const bot = new TelegramBot(token, {
  polling: true
})

// =======================
// 🌐 EXPRESS KEEP ALIVE
// =======================
const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("✅ Minecraft Status Bot Running")
})

app.listen(PORT, () => {
  console.log("🌍 Server running on port", PORT)
})

// =======================
// 🛡️ ERROR HANDLE
// =======================
process.on("uncaughtException", console.error)
process.on("unhandledRejection", console.error)

// =======================
// ⏳ COOLDOWN
// =======================
const cooldown = {}
const cooldownTime = 8000

// =======================
// 📡 GET SERVER DATA
// =======================
async function getServer(ip) {
  const res = await axios.get(`https://api.mcsrvstat.us/3/${ip}`, {
    timeout: 7000
  })
  return res.data
}

// =======================
// 🎨 STATUS MESSAGE
// =======================
function statusMessage(ip, data) {
  const online = data.players?.online || 0
  const max = data.players?.max || 0
  const version = data.version || "Unknown"

  return `
🔷 <b>SERVER STATUS</b>

🖥 IP: <code>${ip}</code>
📌 Version: ${version}
👥 Players: ${online}/${max}

━━━━━━━━━━━━━━
`
}

// =======================
// 📌 /status
// =======================
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id

  if (cooldown[chatId] && Date.now() - cooldown[chatId] < cooldownTime) {
    return bot.sendMessage(chatId, "⏳ សូមរង់ចាំបន្តិច...")
  }
  cooldown[chatId] = Date.now()

  try {
    const data = await getServer(defaultServer)

    if (!data.online) {
      return bot.sendMessage(chatId, "❌ Server Offline")
    }

    bot.sendMessage(chatId, statusMessage(defaultServer, data), {
      parse_mode: "HTML"
    })

  } catch (e) {
    bot.sendMessage(chatId, "💀 Error checking server")
  }
})

// =======================
// 📌 /list (players A-Z)
// =======================
bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id

  try {
    const data = await getServer(defaultServer)

    if (!data.online) {
      return bot.sendMessage(chatId, "❌ Server Offline")
    }

    let players = data.players?.list || []

    if (!players.length) {
      return bot.sendMessage(chatId, "👥 គ្មានអ្នកកំពុងលេង")
    }

    // sort A-Z
    players = players.sort((a, b) => a.localeCompare(b))

    let text = "👥 <b>PLAYER LIST</b>\n\n"

    players.forEach((p, i) => {
      const avatar = `https://mc-heads.net/avatar/${p}/20`
      text += `${i + 1}. ${p}\n`
    })

    text += `\n📊 Total: ${players.length}`

    bot.sendMessage(chatId, text, {
      parse_mode: "HTML"
    })

  } catch (e) {
    bot.sendMessage(chatId, "💀 Error loading player list")
  }
})

// =======================
// 📌 /ranks
// =======================
bot.onText(/\/ranks/, (msg) => {
  const chatId = msg.chat.id

  const text = `
🏆 <b>RANKS LIST</b>

⭐ VIP → $2 → 1.5$ discount
🔥 MVP → $3.5
💎 MVP+ → $5
⚡ EPIC → $6.5
👑 KINGDOM → $8 → 7$ discount

━━━━━━━━━━━━━━
🛒 Store:
https://foxmcstatus.vercel.app/Server
`

  bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    disable_web_page_preview: true
  })
})

// =======================
// 📩 TEXT HANDLER (optional IP input)
// =======================
bot.on("message", async (msg) => {
  const text = msg.text
  if (!text || text.startsWith("/")) return

  const chatId = msg.chat.id

  if (text.includes(".")) {
    try {
      const data = await getServer(text)

      if (!data.online) {
        return bot.sendMessage(chatId, "❌ Server Offline")
      }

      bot.sendMessage(chatId, statusMessage(text, data), {
        parse_mode: "HTML"
      })

    } catch {
      bot.sendMessage(chatId, "💀 Error checking server")
    }
  }
})

console.log("🔥 Bot Running (Clean Version)")
