require("dotenv").config()

const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const express = require("express")
const fs = require("fs")

const token = process.env.BOT_TOKEN
const serverIP = process.env.SERVER_IP || "foxmckingdom.mcpc.ink"
const storeUrl = process.env.STORE_URL
const geminiKey = process.env.GEMINI_API_KEY
const serverIconUrl = process.env.SERVER_ICON_URL || "https://eu.mc-api.net/v3/server/favicon/foxmckingdom.mcpc.ink"

const tiktok = process.env.TIKTOK
const telegram = process.env.TELEGRAM
const youtube = process.env.YOUTUBE
const discord = process.env.DISCORD

// =======================
// TELEGRAM BOT
// =======================
const bot = new TelegramBot(token, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  }
})

// =======================
// EXPRESS KEEP ALIVE
// =======================
const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("✅ Fox MC Kingdom Bot Running")
})

app.listen(PORT, () => {
  console.log(`Web running on port ${PORT}`)
})

// =======================
// SELF PING
// =======================
if (process.env.APP_URL) {
  setInterval(() => {
    axios.get(process.env.APP_URL).catch(() => {})
  }, 300000)
}

// =======================
// ANTI CRASH
// =======================
process.on("uncaughtException", console.error)
process.on("unhandledRejection", console.error)

// =======================
// COOLDOWN
// =======================
const cooldown = {}
const cooldownTime = 5000

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
// FORMAT PLAYER LIST
// =======================
function formatPlayerList(data) {
  if (!data.players || !data.players.sample || data.players.sample.length === 0) {
    return "No players online"
  }

  let playerList = ""
  data.players.sample.forEach((player) => {
    playerList += `• ${player.name}\n`
  })

  return playerList
}

// =======================
// GET REAL-TIME STATUS
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
// GEMINI AI INTEGRATION
// =======================
async function askGeminiAI(question, serverData) {
  if (!geminiKey) {
    return "AI service not configured. Please set GEMINI_API_KEY in .env"
  }

  try {
    const serverInfo = serverData && serverData.online ? `
Current Server Status:
- Players Online: ${serverData.players?.online || 0}/${serverData.players?.max || 0}
- Version: ${serverData.version || "Unknown"}
- Status: Online
    ` : ""

    const prompt = `You are a helpful Minecraft server assistant for Fox MC Kingdom server.
${serverInfo}

User Question: ${question}

Provide a helpful, friendly response. Keep it concise (2-3 sentences).`

    console.log("Sending AI request...")

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
      { timeout: 15000 }
    )

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log("AI Response structure:", JSON.stringify(response.data, null, 2))
      return "No response from AI service"
    }

    return response.data.candidates[0].content.parts[0].text

  } catch (err) {
    console.error("Gemini API error:", {
      message: err.message,
      status: err.response?.status,
      code: err.code
    })

    if (err.response?.status === 400) {
      return "Invalid API key. Check your GEMINI_API_KEY in .env"
    }
    if (err.response?.status === 403) {
      return "API access denied. Enable Generative Language API in Google Cloud."
    }

    return "AI service error: " + err.message
  }
}

// =======================
// COMMANDS
// =======================
const commands = {
  "/start": "Show commands",
  "/status": "Server info",
  "/list": "Online players",
  "/ai": "Ask AI (use /ai <question>)",
  "/store": "Open store",
  "/social": "Social links"
}

// =======================
// START
// =======================
bot.onText(/\/start/, (msg) => {
  saveUser(msg.chat.id)

  let text = `Fox MC Kingdom Bot

Available Commands:
`

  for (let cmd in commands) {
    text += `${cmd} - ${commands[cmd]}\n`
  }

  text += `
Server: ${serverIP}

Total Users: ${users.length}`

  bot.sendPhoto(msg.chat.id, serverIconUrl, {
    caption: text,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Check Status",
            callback_data: "check_status"
          }
        ]
      ]
    }
  }).catch(() => {
    // If icon fails, send without image
    bot.sendMessage(msg.chat.id, text, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Check Status",
              callback_data: "check_status"
            }
          ]
        ]
      }
    })
  })
})

// =======================
// STATUS
// =======================
bot.onText(/\/status/, async (msg) => {
  saveUser(msg.chat.id)
  const chatId = msg.chat.id

  const loadingMsg = await bot.sendMessage(chatId, "Loading...")

  try {
    const data = await getRealTimeStatus()

    if (!data || !data.online) {
      await bot.editMessageText("Server Offline", {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      })
      return
    }

    const playersOnline = data.players?.online || 0
    const playersMax = data.players?.max || 0
    const version = data.version || "Unknown"
    const port = data.port || "25565"

    let message = `foxmckingdom ai

• IP: ${serverIP}
• Port: ${port}
• Version: ${version}
• Players: ${playersOnline}/${playersMax}`

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Refresh",
              callback_data: "refresh_status"
            }
          ]
        ]
      }
    })
  } catch (err) {
    console.error("Status command error:", err)
    await bot.editMessageText("Error fetching status", {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })
  }
})

// =======================
// LIST
// =======================
bot.onText(/\/list/, async (msg) => {
  saveUser(msg.chat.id)
  const chatId = msg.chat.id

  const loadingMsg = await bot.sendMessage(chatId, "Loading...")

  try {
    const data = await getRealTimeStatus()

    if (!data || !data.online) {
      await bot.editMessageText("Server Offline", {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      })
      return
    }

    const playersOnline = data.players?.online || 0
    const playersMax = data.players?.max || 0
    const playerList = formatPlayerList(data)

    let message = `Online Players (${playersOnline}/${playersMax})

${playerList}`

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Refresh",
              callback_data: "refresh_players"
            }
          ]
        ]
      }
    })
  } catch (err) {
    console.error("List command error:", err)
    await bot.editMessageText("Error fetching player list", {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })
  }
})

// =======================
// AI
// =======================
bot.onText(/\/ai\s+(.+)/, async (msg, match) => {
  saveUser(msg.chat.id)
  const question = match[1].trim()
  const chatId = msg.chat.id

  console.log("User question:", question)

  const loadingMsg = await bot.sendMessage(chatId, "Thinking...")

  try {
    const serverData = await getRealTimeStatus()
    const aiResponse = await askGeminiAI(question, serverData)

    console.log("AI Response ready")

    await bot.editMessageText(
      `Question: ${question}

Answer: ${aiResponse}`,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Ask Another",
                callback_data: "ask_again"
              }
            ]
          ]
        }
      }
    )
  } catch (err) {
    console.error("AI command error:", err)
    await bot.editMessageText("Error processing your question", {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })
  }
})

// =======================
// STORE
// =======================
bot.onText(/\/store/, (msg) => {
  saveUser(msg.chat.id)

  bot.sendMessage(msg.chat.id, "Kingdom Store", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Visit Store", url: storeUrl }]
      ]
    }
  })
})

// =======================
// SOCIAL
// =======================
bot.onText(/\/social/, (msg) => {
  saveUser(msg.chat.id)

  bot.sendMessage(msg.chat.id, "Follow Fox MC Kingdom", {
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

// =======================
// MESSAGE HANDLER
// =======================
bot.on("message", (msg) => {
  const text = msg.text
  if (!text) return

  saveUser(msg.chat.id)

  if (text.startsWith("/") && !commands[text] && !text.startsWith("/ai")) {
    return bot.sendMessage(msg.chat.id, "Unknown command! Use /start to see available commands.")
  }
})

// =======================
// CALLBACK BUTTONS
// =======================
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id

  if (query.data === "check_status" || query.data === "refresh_status") {
    const data = getRealTimeStatus().then((data) => {
      if (!data || !data.online) {
        bot.editMessageText("Server Offline", {
          chat_id: chatId,
          message_id: query.message.message_id
        })
        return
      }

      const playersOnline = data.players?.online || 0
      const playersMax = data.players?.max || 0
      const version = data.version || "Unknown"
      const port = data.port || "25565"

      let message = `foxmckingdom bot

• IP: ${serverIP}
• Port: ${port}
• Version: ${version}
• Players: ${playersOnline}/${playersMax}`

      bot.editMessageText(message, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Refresh",
                callback_data: "refresh_status"
              }
            ]
          ]
        }
      })
    })

    bot.answerCallbackQuery(query.id, {
      text: "Refreshing..."
    })
  }

  if (query.data === "refresh_players") {
    getRealTimeStatus().then((data) => {
      if (!data || !data.online) {
        bot.editMessageText("Server Offline", {
          chat_id: chatId,
          message_id: query.message.message_id
        })
        return
      }

      const playersOnline = data.players?.online || 0
      const playersMax = data.players?.max || 0
      const playerList = formatPlayerList(data)

      let message = `Online Players (${playersOnline}/${playersMax})

${playerList}`

      bot.editMessageText(message, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Refresh",
                callback_data: "refresh_players"
              }
            ]
          ]
        }
      })
    })

    bot.answerCallbackQuery(query.id, {
      text: "Refreshing..."
    })
  }

  if (query.data === "ask_again") {
    bot.sendMessage(chatId, "Send your next question with /ai <question>")
    bot.answerCallbackQuery(query.id, {
      text: "Ready for your question!"
    })
  }
})

console.log("Bot running...")
console.log("Server:", serverIP)
console.log("AI Integration:", geminiKey ? "Enabled" : "Disabled")
