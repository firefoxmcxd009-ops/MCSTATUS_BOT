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
const bot = new TelegramBot(token, { polling: true });

// Handle uncaught errors to prevent crash
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err));

// Default Minecraft server IP (if user uses /status)
const defaultServer = "dinomc.org";

// Commands
const commands = {
    "/start": "Show available commands",
    "/status": "Show Minecraft server status (default IP)",
    "/store": "Show webstore link"
};

// Cooldown system for /status
const cooldowns = {};
const COOLDOWN_TIME = 15000; // 15s

// /start command
bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id;
    let message = "👋 Hello! I am Minecraft Server Status Bot\n\nAvailable Commands:\n";
    for (const cmd in commands) message += `${cmd} → ${commands[cmd]}\n`;
    bot.sendMessage(chatId, message);
});

// /store command
bot.onText(/\/store/, msg => {
    const chatId = msg.chat.id;
    const storeLink = "https://firefoxmckingdomstore.vercel.app";
    bot.sendMessage(chatId, "🛒 Visit our store:", {
        reply_markup: { inline_keyboard: [[{ text: "🌐 Open Webstore", url: storeLink }]] }
    });
});

// Helper function to get server status
async function getServerStatus(ip) {
    const res = await axios.get(`https://api.mcsrvstat.us/3/${ip}`);
    return res.data;
}

// Function to send server info
async function sendServerInfo(chatId, ip) {
    try {
        const data = await getServerStatus(ip);
        if (!data.online) return bot.sendMessage(chatId, `❌ Server ${ip} is offline`);

        const playersOnline = data.players?.online || 0;
        const playersMax = data.players?.max || 0;
        const ping = data.debug?.ping || "N/A";

        const message = `
🖥 Server: ${ip}
🟢 Status: Online
👥 Players: ${playersOnline}/${playersMax}
📶 Ping: ${ping} ms
`;

        bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📋 Copy IP", callback_data: `copy_ip_${ip}` }],
                    [{ text: "🔄 Refresh Status", callback_data: `refresh_status_${ip}` }]
                ]
            }
        });
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, `❌ Cannot fetch server status for ${ip}`);
    }
}

// /status command (default IP)
bot.onText(/\/status/, msg => {
    const chatId = msg.chat.id;
    const now = Date.now();
    if (cooldowns[chatId] && now - cooldowns[chatId] < COOLDOWN_TIME)
        return bot.sendMessage(chatId, "⏳ Please wait before requesting status again.");
    cooldowns[chatId] = now;
    sendServerInfo(chatId, defaultServer);
});

// Inline button handler
bot.on("callback_query", async query => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("copy_ip_")) {
        const ip = data.replace("copy_ip_", "");
        bot.answerCallbackQuery(query.id, { text: `Server IP: ${ip}` });
    } else if (data.startsWith("refresh_status_")) {
        const ip = data.replace("refresh_status_", "");
        sendServerInfo(chatId, ip);
    }
});

// Handle user typing "/"
bot.on("message", msg => {
    const text = msg.text;
    const chatId = msg.chat.id;
    if (!text) return;

    // User types just "/"
    if (text === "/") {
        let message = "👋 Available Commands:\n\n";
        for (const cmd in commands) message += `${cmd} → ${commands[cmd]}\n`;
        return bot.sendMessage(chatId, message);
    }

    // User types a server IP (e.g., dinomc.org)
    if (!text.startsWith("/")) {
        const now = Date.now();
        if (cooldowns[chatId] && now - cooldowns[chatId] < COOLDOWN_TIME)
            return bot.sendMessage(chatId, "⏳ Please wait before requesting status again.");
        cooldowns[chatId] = now;
        return sendServerInfo(chatId, text);
    }

    // Unknown command handler
    if (text.startsWith("/") && !commands[text]) {
        bot.sendMessage(chatId, "❌ Command not recognized.\nType /start to see all commands.");
    }
});

console.log("Bot is running 24/7...");
