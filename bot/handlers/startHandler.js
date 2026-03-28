'use strict';
const { findOrCreateUser }    = require('../../services/userService');
const { handleReferralStart } = require('./referralHandler');
const { mainMenuKeyboard }    = require('../keyboards');
const { welcomeMsg }          = require('../messages');
const logger                  = require('../../utils/logger');

const handleStart = async (bot, msg) => {
  const chatId  = msg.chat.id;
  const payload = msg.text && msg.text.split(' ')[1]; // /start ref_CODE

  try {
    const { user, isNew } = await findOrCreateUser(msg.from);
    logger.info(`START payload: "${payload}" | user: ${msg.from.id}`);
    // سجّل الإحالة فقط إذا:
    // 1. في payload يبدأ بـ ref_
    // 2. المستخدم جديد أو ما عنده referredBy بعد
    if (payload && (payload.startsWith('ref_') || payload.startsWith('ref')) && !user.referredBy) {
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
