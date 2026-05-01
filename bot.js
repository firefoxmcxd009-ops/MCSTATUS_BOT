require("dotenv").config()

const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const express = require("express")
const fs = require("fs")

const token = process.env.BOT_TOKEN
const serverIP = process.env.SERVER_IP || "foxmckingdom.mcpc.ink"
const storeUrl = process.env.STORE_URL
const geminiKey = process.env.GEMINI_API_KEY
const serverIconUrl = process.env.SERVER_ICON_URL || "https://i.ibb.co/9mNwRTKF/minecraft-title.png"

const tiktok = process.env.TIKTOK
const telegram = process.env.TELEGRAM
const youtube = process.env.YOUTUBE
const discord = process.env.DISCORD

// =======================
// TELEGRAM BOT
// =======================
const bot = new TelegramBot(token, {
  polling: true
})

// =======================
// EXPRESS KEEP ALIVE
// =======================
const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("✅ Bot Running")
})

app.listen(PORT, () => {
  console.log("Web running on port", PORT)
})

// =======================
// USERS
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
// GET SERVER STATUS (2 API)
// =======================
async function getRealTimeStatus() {
  try {
    // API 1
    const res = await axios.get(`https://api.mcsrvstat.us/3/${serverIP}`, { timeout: 5000 })
    console.log("API1:", JSON.stringify(res.data, null, 2))

    if (res.data && res.data.online) return res.data

  } catch (e) {
    console.log("API1 failed")
  }

  try {
    // API 2 (backup)
    const res2 = await axios.get(`https://api.mcstatus.io/v2/status/java/${serverIP}`, { timeout: 5000 })
    console.log("API2:", JSON.stringify(res2.data, null, 2))

    return {
      online: res2.data.online,
      players: {
        online: res2.data.players?.online || 0,
        max: res2.data.players?.max || 0,
        sample: (res2.data.players?.list || []).map(p => ({ name: p.name_clean }))
      },
      version: res2.data.version?.name_clean,
      port: res2.data.port
    }

  } catch (e) {
    console.log("API2 failed")
  }

  return null
}

// =======================
// FORMAT PLAYER LIST (FIXED)
// =======================
function formatPlayerList(data) {
  if (!data.players || data.players.online === 0) {
    return "No players online"
  }

  if (!data.players.sample || data.players.sample.length === 0) {
    return `⚠️ ${data.players.online} players online\n(Player names hidden)`
  }

  return data.players.sample.map(p => `• ${p.name}`).join("\n")
}

// =======================
// COMMANDS
// =======================
const commands = {
  "/start": "Show commands",
  "/status": "Server info",
  "/list": "Online players",
  "/store": "Store",
  "/social": "Social"
}

// =======================
// START
// =======================
bot.onText(/\/start/, (msg) => {
  saveUser(msg.chat.id)

  let text = `Fox MC Kingdom Bot\n\nCommands:\n`

  for (let cmd in commands) {
    text += `${cmd} - ${commands[cmd]}\n`
  }

  text += `\nServer: ${serverIP}`

  bot.sendPhoto(msg.chat.id, serverIconUrl, {
    caption: text
  }).catch(() => bot.sendMessage(msg.chat.id, text))
})

// =======================
// STATUS
// =======================
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id
  const loading = await bot.sendMessage(chatId, "Loading...")

  const data = await getRealTimeStatus()

  if (!data || !data.online) {
    return bot.editMessageText("Server Offline", {
      chat_id: chatId,
      message_id: loading.message_id
    })
  }

  const message = `
Server Status

IP: ${serverIP}
Players: ${data.players.online}/${data.players.max}
Version: ${data.version || "Unknown"}
`

  bot.editMessageText(message, {
    chat_id: chatId,
    message_id: loading.message_id
  })
})

// =======================
// LIST (FIXED)
// =======================
bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id
  const loading = await bot.sendMessage(chatId, "Loading players...")

  const data = await getRealTimeStatus()

  if (!data || !data.online) {
    return bot.editMessageText("Server Offline", {
      chat_id: chatId,
      message_id: loading.message_id
    })
  }

  const list = formatPlayerList(data)

  const message = `
Online Players (${data.players.online}/${data.players.max})

${list}
`

  bot.editMessageText(message, {
    chat_id: chatId,
    message_id: loading.message_id,
    reply_markup: {
      inline_keyboard: [
        [{ text: "Refresh", callback_data: "refresh_players" }]
      ]
    }
  })
})

// =======================
// CALLBACK FIXED (ASYNC)
// =======================
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id

  if (query.data === "refresh_players") {
    const data = await getRealTimeStatus()

    if (!data || !data.online) {
      return bot.editMessageText("Server Offline", {
        chat_id: chatId,
        message_id: query.message.message_id
      })
    }

    const list = formatPlayerList(data)

    const message = `
Online Players (${data.players.online}/${data.players.max})

${list}
`

    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "Refresh", callback_data: "refresh_players" }]
        ]
      }
    })

    bot.answerCallbackQuery(query.id)
  }
})

// =======================
console.log("Bot running...")
