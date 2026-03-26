'use strict';
const { getUserById } = require('../../services/userService');
const config = require('../../config');
const logger = require('../../utils/logger');

const handleSupport = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    const userId   = user ? user.telegramId : chatId;
    const userName = user ? user.displayName() : String(chatId);
    const level    = user ? user.levelName()   : '—';
    const balance  = user ? user.balance.toFixed(2) : '0.00';

    const supportLink = config.support.link || `https://t.me/${config.support.username}`;

    const msg =
      `🆘 *الدعم الفني*\n\n` +
      `للتواصل مع فريق الدعم اضغط الزر أدناه.\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `📋 *معلومات حسابك* (أرسلها للدعم):\n\n` +
      `🆔 *ID الحساب:* \`${userId}\`\n` +
      `👤 *الاسم:* ${userName}\n` +
      `🏆 *المستوى:* ${level}\n` +
      `💰 *الرصيد:* ${balance} USDT\n\n` +
      `_انسخ المعلومات أعلاه وأرسلها مع رسالتك لتسريع الدعم_`;

    await bot.sendMessage(chatId, msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 تواصل مع الدعم', url: supportLink }],
          [{ text: '🔙 رجوع', callback_data: 'back_main' }],
        ],
      },
    });
  } catch (err) {
    logger.error('handleSupport:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleSupport };
