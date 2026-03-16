const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = '8584566887:AAF1HQZjqpTCNl9dL9whjuTkLvCk4Hu1H_E';
const bot = new TelegramBot(token, { polling: true });

const mcServer = 'dinomc.org';

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
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

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  if (query.data.startsWith("copy_ip_")) {
    bot.answerCallbackQuery(query.id, { text: `IP: ${mcServer} (copied!)` });
  }
});

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