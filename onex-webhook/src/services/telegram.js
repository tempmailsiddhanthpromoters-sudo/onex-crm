/**
 * Telegram Notification Service
 * Sends lead notifications to a Telegram chat via bot API
 */

const axios = require('axios');
const config = require('../config');

async function sendTelegramNotification({ name, phone, email, property, budget, location, source }) {
  const token = process.env.TELEGRAM_BOT_TOKEN || config.telegram?.botToken;
  const chatId = process.env.TELEGRAM_CHAT_ID || config.telegram?.chatId;

  if (!token || !chatId) {
    console.log('[telegram] Skipping - bot token or chat ID not configured');
    return null;
  }

  const message = [
    `*New Lead - ${source || 'Unknown'}*`,
    `*Name:* ${name || 'N/A'}`,
    `*Phone:* ${phone || 'N/A'}`,
    `*Email:* ${email || 'N/A'}`,
    `*Property:* ${property || 'N/A'}`,
    `*Budget:* ${budget || 'N/A'}`,
    `*Location:* ${location || 'N/A'}`,
  ].join('\n');

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      { chat_id: chatId, text: message, parse_mode: 'Markdown' },
      { timeout: 10000 }
    );
    console.log('[telegram] Notification sent');
    return response.data;
  } catch (err) {
    console.error('[telegram] Send failed:', err.message);
    throw err;
  }
}

module.exports = { sendTelegramNotification };
