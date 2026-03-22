'use strict';
const { depositKeyboard } = require('../keyboards');
const { depositMsg }      = require('../messages');
const logger              = require('../../utils/logger');

const handleDeposit = async (bot, chatId) => {
  try {
    await bot.sendMessage(chatId, depositMsg(), {
      parse_mode: 'Markdown',
      ...depositKeyboard(),
    });
  } catch (err) {
    logger.error('handleDeposit:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleDeposit };
