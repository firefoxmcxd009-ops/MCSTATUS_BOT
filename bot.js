require("dotenv").config()

const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const express = require("express")

const token = process.env.BOT_TOKEN
const defaultServer = process.env.DEFAULT_SERVER

const bot = new TelegramBot(token, { polling: true })

// Web server for Render
const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("Minecraft Status Bot Running 🚀")
})

app.listen(PORT, () => {
  console.log("Web server running on " + PORT)
})

// Anti crash
process.on("uncaughtException", err => console.log(err))
process.on("unhandledRejection", err => console.log(err))

// Anti spam cooldown
const cooldown = {}
const cooldownTime = 10000

// /start
bot.onText(/\/start/, msg => {

  const text = `
👋 Minecraft Server Status Bot

Commands:
/status → check default server
/store → open webstore

💡 Tip:
Type any Minecraft IP to check status

Example:
dinomc.org
play.hypixel.net
`

  bot.sendMessage(msg.chat.id, text)

})

// /status
bot.onText(/\/status/, msg => {

  sendServer(msg.chat.id, defaultServer)

})

// /store
bot.onText(/\/store/, msg => {

  bot.sendMessage(msg.chat.id,
    "🛒 Webstore",
    {
      reply_markup:{
        inline_keyboard:[
          [{text:"Open Store", url:process.env.STORE_URL}]
        ]
      }
    }
  )

})

// Function fetch server
async function sendServer(chatId, ip){

  const now = Date.now()

  if(cooldown[chatId] && now - cooldown[chatId] < cooldownTime){

    return bot.sendMessage(chatId,"⏳ Please wait before next request")

  }

  cooldown[chatId] = now

  try{

    const res = await axios.get(`https://api.mcsrvstat.us/3/${ip}`)
    const data = res.data

    if(!data.online){

      return bot.sendMessage(chatId,`❌ Server ${ip} Offline`)

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

    bot.sendMessage(chatId,message,{

      reply_markup:{
        inline_keyboard:[
          [{text:"📋 Copy IP", callback_data:"copy_"+ip}],
          [{text:"🔄 Refresh", callback_data:"refresh_"+ip}]
        ]
      }

    })

  }

  catch(err){

    bot.sendMessage(chatId,"❌ Cannot fetch server info")

  }

}

// Button handler
bot.on("callback_query", query => {

  const chatId = query.message.chat.id

  if(query.data.startsWith("copy_")){

    const ip = query.data.replace("copy_","")

    bot.answerCallbackQuery(query.id,{
      text:"Server IP: "+ip
    })

  }

  if(query.data.startsWith("refresh_")){

    const ip = query.data.replace("refresh_","")

    sendServer(chatId, ip)

  }

})

// User types IP
bot.on("message", msg => {

  const text = msg.text

  if(!text) return

  if(text.startsWith("/")) return

  sendServer(msg.chat.id, text)

})

console.log("PRO Minecraft Status Bot Running 🚀")
