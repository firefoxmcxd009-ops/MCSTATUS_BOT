require("dotenv").config()

const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const express = require("express")

const token = process.env.BOT_TOKEN
const defaultServer = process.env.DEFAULT_SERVER
const storeUrl = process.env.STORE_URL

const bot = new TelegramBot(token, { polling: true })

// Express server for uptime
const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("Bot is running 🚀")
})

app.listen(PORT, () => {
  console.log("Web server running on port " + PORT)
})

// Prevent crash
process.on("uncaughtException", err => console.log(err))
process.on("unhandledRejection", err => console.log(err))

// Commands
const commands = {
  "/start": "Show commands",
  "/status": "Show default server status",
  "/store": "Show store link"
}

// START
bot.onText(/\/start/, msg => {

  const chatId = msg.chat.id

  let text = "👋 Minecraft Status Bot\n\nCommands:\n"

  for (let cmd in commands) {
    text += `${cmd} → ${commands[cmd]}\n`
  }

  bot.sendMessage(chatId, text)

})

// STORE
bot.onText(/\/store/, msg => {

  bot.sendMessage(msg.chat.id, "🛒 Visit Store", {

    reply_markup: {
      inline_keyboard: [
        [{ text: "Open Webstore", url: storeUrl }]
      ]
    }

  })

})

// STATUS
bot.onText(/\/status/, async msg => {

  sendServer(msg.chat.id, defaultServer)

})

// SERVER STATUS FUNCTION
async function sendServer(chatId, ip) {

  try {

    const res = await axios.get(`https://api.mcsrvstat.us/3/${ip}`)

    const data = res.data

    if (!data.online) {

      return bot.sendMessage(chatId, `❌ Server ${ip} offline`)

    }

    const playersOnline = data.players?.online || 0
    const playersMax = data.players?.max || 0
    const ping = data.debug?.ping || "N/A"

    const message = `
🖥 Server: ${ip}
🟢 Status: Online
👥 Players: ${playersOnline}/${playersMax}
📶 Ping: ${ping} ms
`

    bot.sendMessage(chatId, message, {

      reply_markup: {
        inline_keyboard: [
          [{ text: "Copy IP", callback_data: "copy_" + ip }],
          [{ text: "Refresh", callback_data: "refresh_" + ip }]
        ]
      }

    })

  } catch (err) {

    bot.sendMessage(chatId, "❌ Error fetching server")

  }

}

// CALLBACK BUTTON
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

// USER TYPES SERVER IP
bot.on("message", msg => {

  const text = msg.text

  if (!text) return

  if (text.startsWith("/")) return

  sendServer(msg.chat.id, text)

})

console.log("Bot running 24/7 🚀")
