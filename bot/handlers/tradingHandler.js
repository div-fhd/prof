'use strict';
const { getUserById } = require('../../services/userService');
const { getTradingStats } = require('../../services/dailyProfitService');
const { tradingKeyboard } = require('../keyboards');
const logger = require('../../utils/logger');

const fmt  = (n) => Number(n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtN = (n) => Number(n||0).toLocaleString('en-US');

const handleTrading = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك. اضغط /start للتسجيل.');
      return;
    }

    const stats     = getTradingStats(user);
    const botStatus = user.botStatus === 'active' ? '🟢 نشط' : '🔴 متوقف';
    const rateText  = `${(stats.rate * 100).toFixed(1)}٪`;

    const msg =
      `📈 *إحصائيات التداول*\n` +
      `➖➖➖➖➖➖➖➖\n\n` +
      `👤 *المستخدم:* ${user.displayName()}\n` +
      `🏆 *المستوى:* ${user.levelName()}\n` +
      `🤖 *حالة البوت:* ${botStatus}\n` +
      `📊 *معدل الربح اليومي:* ${rateText}\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `💼 *إجمالي المعاملات اليومية:*\n` +
      `   🔄 عدد الصفقات: *${fmtN(stats.dailyTrades)}*\n` +
      `   💹 حجم التداول: *${fmt(stats.dailyVolume)} USDT*\n` +
      `   💰 الربح المتوقع: *${fmt(stats.dailyProfit)} USDT*\n\n` +
      `📅 *الشهرية:*\n` +
      `   💹 حجم التداول: *${fmt(stats.monthlyVolume)} USDT*\n` +
      `   💰 الربح المتوقع: *${fmt(stats.monthlyProfit)} USDT*\n\n` +
      `📆 *السنوية:*\n` +
      `   💹 حجم التداول: *${fmt(stats.yearlyVolume)} USDT*\n` +
      `   💰 الربح المتوقع: *${fmt(stats.yearlyProfit)} USDT*\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `🏦 *رصيدك الحالي:* ${fmt(user.balance)} USDT\n` +
      `✅ *إجمالي الأرباح المحققة:* ${fmt(stats.totalProfit)} USDT\n\n` +
      `_الأرقام تقديرية بناءً على رصيدك ومستوى حسابك_`;

    await bot.sendMessage(chatId, msg, {
      parse_mode: 'Markdown',
      ...tradingKeyboard(),
    });
  } catch (err) {
    logger.error('handleTrading:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleTrading };
