const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Web server for Render
app.get("/", (req, res) => {
    res.send("MCStatus Bot is running!");
});

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});

// Telegram Bot Token
const token = "8584566887:AAF1HQZjqpTCNl9dL9whjuTkLvCk4Hu1H_E";

// Create bot
const bot = new TelegramBot(token, { polling: true });

// Minecraft server IP
const mcServer = "dinomc.org";

// Commands list
const commands = {
    "/start": "Show available commands",
    "/status": "Show Minecraft server status",
    "/store": "Show webstore link"
};

// Cooldown system
const cooldowns = {};
const COOLDOWN_TIME = 15000;

// /start command
bot.onText(/\/start/, (msg) => {

    const chatId = msg.chat.id;

    let message = "👋 Hello! I am Minecraft Server Status Bot\n\n";

    message += "Available Commands:\n";

    for (const cmd in commands) {
        message += `${cmd} → ${commands[cmd]}\n`;
    }

    bot.sendMessage(chatId, message);
});

// /status command
bot.onText(/\/status/, async (msg) => {

    const chatId = msg.chat.id;
    const now = Date.now();

    if (cooldowns[chatId] && now - cooldowns[chatId] < COOLDOWN_TIME) {
        return bot.sendMessage(chatId, "⏳ Please wait before requesting status again.");
    }

    cooldowns[chatId] = now;

    try {

        const res = await axios.get(`https://api.mcsrvstat.us/3/${mcServer}`);
        const data = res.data;

        if (!data.online) {
            return bot.sendMessage(chatId, "❌ Server is Offline");
        }

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
                    [
                        { text: "📋 Copy IP", callback_data: "copy_ip" }
                    ],
                    [
                        { text: "🔄 Refresh Status", callback_data: "refresh_status" }
                    ]
                ]
            }

        });

    } catch (error) {

        console.log(error);
        bot.sendMessage(chatId, "❌ Error fetching server status");

    }

});

// /store command
bot.onText(/\/store/, (msg) => {

    const chatId = msg.chat.id;

    const storeLink = "https://firefoxmckingdomstore.vercel.app";

    bot.sendMessage(chatId, "🛒 Visit our store:", {

        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🌐 Open Webstore", url: storeLink }
                ]
            ]
        }

    });

});

// Inline button handler
bot.on("callback_query", async (query) => {

    const chatId = query.message.chat.id;

    if (query.data === "copy_ip") {

        bot.answerCallbackQuery(query.id, {
            text: `Server IP: ${mcServer}`
        });

    }

    if (query.data === "refresh_status") {

        try {

            const res = await axios.get(`https://api.mcsrvstat.us/3/${mcServer}`);
            const data = res.data;

            if (!data.online) {
                return bot.sendMessage(chatId, "❌ Server is Offline");
            }

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

        } catch (error) {

            bot.sendMessage(chatId, "❌ Cannot refresh status");

        }

    }

});

// Unknown command handler
bot.on("message", (msg) => {

    const text = msg.text;
    const chatId = msg.chat.id;

    if (!text) return;

    if (text.startsWith("/") && !commands[text]) {

        bot.sendMessage(chatId,
            "❌ Command not recognized.\n\nType /start to see available commands."
        );

    }

});

console.log("Bot is running...");
