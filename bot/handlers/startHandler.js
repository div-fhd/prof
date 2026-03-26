'use strict';
const { findOrCreateUser }        = require('../../services/userService');
const { handleReferralStart }     = require('./referralHandler');
const { mainMenuKeyboard }        = require('../keyboards');
const { welcomeMsg }              = require('../messages');
const logger                      = require('../../utils/logger');

const handleStart = async (bot, msg) => {
  const chatId   = msg.chat.id;
  const payload  = msg.text && msg.text.split(' ')[1]; // مثال: /start ref_ABC123

  try {
    const user = await findOrCreateUser(msg.from);

    // معالجة رابط الإحالة إن وجد
    if (payload && payload.startsWith('ref_') && !user.referredBy) {
      await handleReferralStart(payload, user);
    }

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
