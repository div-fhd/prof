'use strict';
const { getUserById }          = require('../../services/userService');
const { myAccountKeyboard }    = require('../keyboards');
const { accountDashboardMsg }  = require('../messages');
const logger                   = require('../../utils/logger');

const handleMyAccount = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك.\nاضغط /start للتسجيل.');
      return;
    }

    await bot.sendMessage(chatId, accountDashboardMsg(user), {
      parse_mode: 'Markdown',
      ...myAccountKeyboard(user.botStatus),
    });
  } catch (err) {
    logger.error('handleMyAccount:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleMyAccount };
