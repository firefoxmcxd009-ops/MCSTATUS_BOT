const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = '8584566887:AAF1HQZjqpTCNl9dL9whjuTkLvCk4Hu1H_E';
const bot = new TelegramBot(token, { polling: true });

const mcServer = 'dinomc.org';

// Available commands
const commands = {
    '/start': 'Show available commands',
    '/status': 'Show Minecraft server status',
    '/store': 'Show webstore link'
};

// Cooldown tracking per chat for /status
const cooldowns = {};
const COOLDOWN_TIME = 15 * 1000; // 15 seconds

// /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    let message = "👋 Hello! I am MCStatus Bot. Available commands:\n\n";

    for (const cmd in commands) {
        message += `${cmd} → ${commands[cmd]}\n`;
    }

    bot.sendMessage(chatId, message);
});

// /status command with cooldown
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const now = Date.now();

    if (cooldowns[chatId] && now - cooldowns[chatId] < COOLDOWN_TIME) {
        return bot.sendMessage(chatId, "🕒 Please wait a few seconds before requesting status again!");
    }
    cooldowns[chatId] = now;

    try {
        const res = await axios.get(`https://api.mcsrvstat.us/3/${mcServer}`);
        const data = res.data;

        if (!data.online) {
            return bot.sendMessage(chatId, `❌ Server is offline`);
        }

        const playersOnline = data.players?.online || 0;
        const playersMax = data.players?.max || 0;
        const ping = data.debug?.ping || "N/A";

        const message = `
🖥 Server: ${mcServer}
✅ Status: Online
👥 Players: ${playersOnline}/${playersMax}
📶 Ping: ${ping}ms
`;

        bot.sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Copy IP", callback_data: `copy_ip_${mcServer}` }]
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
    bot.sendMessage(chatId, `🛒 Webstore: ${storeLink}`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Visit Store", url: storeLink }]
            ]
        }
    });
});

// Handle inline button
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    if (query.data.startsWith("copy_ip_")) {
        bot.answerCallbackQuery(query.id, { text: `IP: ${mcServer} (copied!)` });
    }
});

// Handle unknown commands/messages
bot.on('message', (msg) => {
    const text = msg.text;
    const chatId = msg.chat.id;

    // Ignore known commands
    if (text.startsWith('/') && !commands[text]) {
        bot.sendMessage(chatId, "❌ Command not recognized. Type /start to see available commands.\nសួរអីក៏ម៉េស ខ្ញុំមាន limit ក្នុងការបង្ហាញ server status បើសួរច្រើនពេក នោះខ្ញុំនឹងលែងដំណើរការរហូតហើយ 😵");
    }
});
