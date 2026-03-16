const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Web server for Render health check
app.get("/", (req, res) => {
  res.send("MCStatus Bot is running!");
});
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// Telegram Bot Token
const token = "8584566887:AAEDZhvV8EPUz9Jjgx0n09hOO3zkX08aQus";

// Create bot with polling
const bot = new TelegramBot(token, { polling: true });

// Handle uncaught errors to prevent crash
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

// Minecraft server IP
const mcServer = "mazerclub.net";

// Commands
const commands = {
  "/start": "Show available commands",
  "/status": "Show Minecraft server status",
  "/store": "Show webstore link"
};

// Cooldown system for /status
const cooldowns = {};
const COOLDOWN_TIME = 15000; // 15 seconds per user

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  let message = "👋 Hello! I am Minecraft Server Status Bot\n\nAvailable Commands:\n";
  for (const cmd in commands) message += `${cmd} → ${commands[cmd]}\n`;
  bot.sendMessage(chatId, message);
});

// /status command
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const now = Date.now();
  if (cooldowns[chatId] && now - cooldowns[chatId] < COOLDOWN_TIME)
    return bot.sendMessage(chatId, "⏳ Please wait a few seconds before requesting status again.");
  cooldowns[chatId] = now;

  try {
    const res = await axios.get(`https://api.mcsrvstat.us/3/${mcServer}`);
    const data = res.data;

    if (!data.online) return bot.sendMessage(chatId, "❌ Server is Offline");

    const playersOnline = data.players?.online || 0;
    const playersMax = data.players?.max || 0;
    const ping = data.debug?.ping || "N/A";

    const message = `
🖥 Server: ${mcServer}
🟢 Status: Online
👥 Players: ${playersOnline}/${playersMax}
📶 Ping: ${ping} ms
`;

    bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Copy IP", callback_data: "copy_ip" }],
          [{ text: "🔄 Refresh Status", callback_data: "refresh_status" }]
        ]
      }
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "❌ Cannot fetch server status");
  }
});

// /store command
bot.onText(/\/store/, (msg) => {
  const chatId = msg.chat.id;
  const storeLink = "https://firefoxmckingdomstore.vercel.app";
  bot.sendMessage(chatId, "🛒 Visit our store:", {
    reply_markup: { inline_keyboard: [[{ text: "🌐 Open Webstore", url: storeLink }]] }
  });
});

// Inline button handler
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  if (query.data === "copy_ip") {
    bot.answerCallbackQuery(query.id, { text: `Server IP: ${mcServer}` });
  } else if (query.data === "refresh_status") {
    try {
      const res = await axios.get(`https://api.mcsrvstat.us/3/${mcServer}`);
      const data = res.data;

      if (!data.online) return bot.sendMessage(chatId, "❌ Server is Offline");

      const playersOnline = data.players?.online || 0;
      const playersMax = data.players?.max || 0;
      const ping = data.debug?.ping || "N/A";

      const message = `
🔄 Refreshed Status

🖥 Server: ${mcServer}
🟢 Status: Online
👥 Players: ${playersOnline}/${playersMax}
📶 Ping: ${ping} ms
`;
      bot.sendMessage(chatId, message);
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ Cannot refresh status");
    }
  }
});

// Unknown commands handler
bot.on("message", (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;
  if (!text) return;
  if (text.startsWith("/") && !commands[text]) {
    bot.sendMessage(chatId, "❌ Command not recognized.\n\nType /start to see available commands.");
  }
});

console.log("Bot is running...");
