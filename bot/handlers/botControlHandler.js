'use strict';
const { getUserById, setBotStatus } = require('../../services/userService');
const { afterBotControlKeyboard }   = require('../keyboards');
const { botStartedMsg, botStoppedMsg } = require('../messages');
const logger = require('../../utils/logger');

const fmt = (n) => Number(n || 0).toFixed(2);
const MIN_BALANCE = 10; // USDT

const handleBotStart = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) { await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك.'); return; }

    // شرط: الرصيد لازم 10 USDT على الأقل
    if (user.balance < MIN_BALANCE) {
      await bot.sendMessage(chatId,
        `⚠️ *لا يمكن تشغيل البوت*\n\n` +
        `الحد الأدنى للرصيد لتشغيل البوت: *${MIN_BALANCE} USDT*\n` +
        `رصيدك الحالي: *${fmt(user.balance)} USDT*\n\n` +
        `_أودع رصيداً لتتمكن من التداول._`,
        { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
          [{ text: '💰 إيداع', callback_data: 'deposit'   }],
          [{ text: '🔙 رجوع',  callback_data: 'back_main' }],
        ]}});
      return;
    }

    const updatedUser = await setBotStatus(chatId, 'active');
    await bot.sendMessage(chatId, botStartedMsg(updatedUser), {
      parse_mode: 'Markdown',
      ...afterBotControlKeyboard(updatedUser.botStatus),
    });
  } catch (err) {
    logger.error('handleBotStart:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ أثناء تشغيل البوت، يرجى المحاولة مرة أخرى.');
  }
};

const handleBotStop = async (bot, chatId) => {
  try {
    const updatedUser = await setBotStatus(chatId, 'stopped');
    await bot.sendMessage(chatId, botStoppedMsg(updatedUser), {
      parse_mode: 'Markdown',
      ...afterBotControlKeyboard(updatedUser.botStatus),
    });
  } catch (err) {
    logger.error('handleBotStop:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ أثناء إيقاف البوت، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleBotStart, handleBotStop };
