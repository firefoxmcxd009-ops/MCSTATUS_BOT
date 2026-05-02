// =======================
// CONFIG
// =======================
const BOT_TOKEN = process.env.BOT_TOKEN
const API_URL = process.env.DEFAULT_SERVER
const PORT = process.env.PORT || 3000

if (!BOT_TOKEN || !API_URL) {
  console.log("❌ Missing BOT_TOKEN or DEFAULT_SERVER")
  process.exit(1)
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

// =======================
// SIMPLE HTTP SERVER (Render)
// =======================
const http = require("http")

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" })
  res.end("🤖 Bot is running 24/7")
})

server.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`)
})

// =======================
// Rank Priority
// =======================
const rankPriority = {
  owner: 1,
  admin: 2,
  media: 3,
  tiktoker: 4,
  kingdom: 5,
  epic: 6,
  "mvp+": 7,
  mvp: 8,
  vip: 9,
  player: 10,
  default: 10
}

// =======================
// Helpers
// =======================
function cleanName(name) {
  return name.replace(/<[^>]*>/g, "").trim()
}

function processPlayers(data) {
  return data.map(p => {
    let rank = (p.primaryGroup?.d || "player").toLowerCase()
    if (rank === "default" || rank === "-") rank = "player"

    const name = cleanName(p.name)

    const isOnline = (p.index?.d || "").toLowerCase() === "online"

    const kills = p.kills?.v || p.kills?.d || 0
    const deaths = p.deaths?.v || p.deaths?.d || 0
    const playtime = p.activePlaytime?.d || "0s"

    return { name, rank, isOnline, kills, deaths, playtime }
  })
}

function sortPlayers(players) {
  return players.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1
    return (rankPriority[a.rank] || 99) - (rankPriority[b.rank] || 99)
  })
}

function formatPlayers(players) {
  return players.slice(0, 20).map(p => {
    const status = p.isOnline ? "🟢" : "🔴"
    return `${status} ${p.name} [${p.rank}]
⚔️ ${p.kills} | 💀 ${p.deaths} | ⏱ ${p.playtime}`
  }).join("\n\n")
}

// =======================
// Telegram API
// =======================
async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  })
}

// =======================
// Polling
// =======================
let offset = 0

async function getUpdates() {
  const res = await fetch(`${TELEGRAM_API}/getUpdates?timeout=30&offset=${offset}`)
  const data = await res.json()
  return data.result
}

// =======================
// Command Handler
// =======================
async function handleMessage(msg) {
  const chatId = msg.chat.id
  const text = msg.text || ""

  if (text === "/start") {
    return sendMessage(chatId, "🤖 Bot Online!\nUse /players")
  }

  if (text === "/players") {
    try {
      await sendMessage(chatId, "⏳ Loading...")

      const res = await fetch(API_URL)
      const json = await res.json()

      let players = processPlayers(json.data)
      players = sortPlayers(players)

      return sendMessage(chatId,
        "🔥 REAL-TIME PLAYERS\n\n" + formatPlayers(players)
      )

    } catch {
      return sendMessage(chatId, "❌ API Error")
    }
  }

  if (text.startsWith("/search ")) {
    const query = text.replace("/search ", "").toLowerCase()

    try {
      const res = await fetch(API_URL)
      const json = await res.json()

      let players = processPlayers(json.data)

      const filtered = players.filter(p =>
        p.name.toLowerCase().includes(query)
      )

      if (!filtered.length) {
        return sendMessage(chatId, "❌ Not found")
      }

      return sendMessage(chatId, formatPlayers(filtered))

    } catch {
      return sendMessage(chatId, "❌ Error")
    }
  }
}

// =======================
// MAIN LOOP
// =======================
async function startBot() {
  console.log("🤖 Bot running (Render 24/7)...")

  while (true) {
    try {
      const updates = await getUpdates()

      for (const update of updates) {
        offset = update.update_id + 1

        if (update.message) {
          await handleMessage(update.message)
        }
      }

    } catch (err) {
      console.log("Polling error:", err.message)
    }
  }
}

startBot()
