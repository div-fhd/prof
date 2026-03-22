'use strict';
const { findOrCreateUser }        = require('../../services/userService');
const { mainMenuKeyboard }        = require('../keyboards');
const { welcomeMsg }              = require('../messages');
const logger                      = require('../../utils/logger');

const handleStart = async (bot, msg) => {
  const chatId = msg.chat.id;
  try {
    const user = await findOrCreateUser(msg.from);
    await bot.sendMessage(chatId, welcomeMsg(user.displayName()), {
      parse_mode: 'Markdown',
      ...mainMenuKeyboard(),
    });
  } catch (err) {
    logger.error('handleStart:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleStart };
