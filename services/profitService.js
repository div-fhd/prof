'use strict';
const config = require('../config');
const { formatNumber } = require('../utils/formatters');

/**
 * Calculate expected profits from a capital amount.
 */
const calculateProfits = (capital) => {
  const daily   = parseFloat((capital * config.bot.profitRateDaily).toFixed(2));
  const weekly  = parseFloat((daily * 7).toFixed(2));
  const monthly = parseFloat((daily * 30).toFixed(2));
  return { capital, daily, weekly, monthly };
};

/**
 * Build the full Arabic profit result message.
 */
const buildProfitMessage = (capital) => {
  const { daily, weekly, monthly } = calculateProfits(capital);

  return (
    `📅 *بناءً على نتائج الأرباح التي حققها النظام في الفترة السابقة*\n` +
    `سيتم حساب أرباحك على افتراض أن رأس المال:\n` +
    `💵 *${formatNumber(capital)} USDT*\n\n` +
    `➖➖➖➖➖➖➖➖\n` +
    `🚀✅💰 *معدل التداولات شهريًا: 23,300*\n\n` +
    `🗓️ *يوميًا:*    ${formatNumber(daily)} USDT\n` +
    `🗓️ *أسبوعيًا:* ${formatNumber(weekly)} USDT\n` +
    `🗓️ *شهريًا:*   ${formatNumber(monthly)} USDT\n\n` +
    `🌍💹 *مستقبل التداول يبدأ هنا!*\n` +
    `➖➖➖➖➖➖➖➖\n` +
    `⚠️ _ملاحظة: تتغير نسبة الربح حسب مستوى حسابك_ ⚖️💸`
  );
};

module.exports = { calculateProfits, buildProfitMessage };
