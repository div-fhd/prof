'use strict';
const { getStatements }    = require('../../services/userService');
const { statementKeyboard } = require('../keyboards');
const { statementMsg }      = require('../messages');
const logger                = require('../../utils/logger');

const handleAccountStatement = async (bot, chatId) => {
  try {
    const entries = await getStatements(chatId, 10);
    await bot.sendMessage(chatId, statementMsg(entries), {
      parse_mode: 'Markdown',
      ...statementKeyboard(),
    });
  } catch (err) {
    logger.error('handleAccountStatement:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleAccountStatement };
