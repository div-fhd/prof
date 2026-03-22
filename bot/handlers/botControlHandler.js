'use strict';
const { setBotStatus }             = require('../../services/userService');
const { afterBotControlKeyboard }  = require('../keyboards');
const { botStartedMsg, botStoppedMsg } = require('../messages');
const logger                       = require('../../utils/logger');

const handleBotStart = async (bot, chatId) => {
  try {
    const user = await setBotStatus(chatId, 'active');
    await bot.sendMessage(chatId, botStartedMsg(user), {
      parse_mode: 'Markdown',
      ...afterBotControlKeyboard(),
    });
  } catch (err) {
    logger.error('handleBotStart:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ أثناء تشغيل البوت، يرجى المحاولة مرة أخرى.');
  }
};

const handleBotStop = async (bot, chatId) => {
  try {
    const user = await setBotStatus(chatId, 'stopped');
    await bot.sendMessage(chatId, botStoppedMsg(user), {
      parse_mode: 'Markdown',
      ...afterBotControlKeyboard(),
    });
  } catch (err) {
    logger.error('handleBotStop:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ أثناء إيقاف البوت، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleBotStart, handleBotStop };
