'use strict';
const { User } = require('../models');
const { logStatement } = require('./userService');
const logger = require('../utils/logger');

/**
 * يُشغَّل مرة واحدة يومياً.
 * يضيف الربح اليومي لكل مستخدم بوته نشط ورصيده > 0.
 * نسبة الربح تعتمد على مستوى الحساب.
 */
const applyDailyProfits = async () => {
  logger.info('Daily profit job started...');
  const users = await User.find({ botStatus: 'active', balance: { $gt: 0 } });

  let processed = 0;
  for (const user of users) {
    try {
      const rate   = user.dailyProfitRate();
      const profit = parseFloat((user.balance * rate).toFixed(2));
      if (profit <= 0) continue;

      const before = user.balance;
      user.balance      = parseFloat((user.balance + profit).toFixed(2));
      user.totalProfit  = parseFloat(((user.totalProfit || 0) + profit).toFixed(2));
      user.lastProfitAt = new Date();
      await user.save();
      await user.recalculateLevel();

      await logStatement({
        telegramId:   user.telegramId,
        type:         'system',
        amount:       profit,
        balanceBefore: before,
        balanceAfter:  user.balance,
        description:  `Daily profit ${(rate * 100).toFixed(1)}%`,
        descriptionAr:`📈 ربح يومي (${(rate * 100).toFixed(1)}٪): +${profit} USDT`,
        status:       'completed',
      });

      processed++;
    } catch (err) {
      logger.error(`Profit error for ${user.telegramId}:`, err.message);
    }
  }

  logger.info(`Daily profit job done — ${processed}/${users.length} users processed`);
};

/**
 * يحسب إجمالي معاملات التداول (محاكاة).
 * اليومية = balance * dailyTrades count estimate
 * الشهرية = يومية * 30
 * السنوية = يومية * 365
 */
const getTradingStats = (user) => {
  const config = require('../config');
  const level  = config.accountLevels.find(l => l.level === user.accountLevel);
  const rate   = user.dailyProfitRate();

  // عدد الصفقات اليومية التقديرية لكل مستوى
  const tradeCountMap = { 1: 10, 2: 20, 3: 40, 4: 60, 5: 100 };
  const dailyTrades   = tradeCountMap[user.accountLevel] || 10;

  const dailyVolume   = parseFloat((user.balance * rate * dailyTrades * 0.1).toFixed(2));
  const monthlyVolume = parseFloat((dailyVolume * 30).toFixed(2));
  const yearlyVolume  = parseFloat((dailyVolume * 365).toFixed(2));

  const dailyProfit   = parseFloat((user.balance * rate).toFixed(2));
  const monthlyProfit = parseFloat((dailyProfit * 30).toFixed(2));
  const yearlyProfit  = parseFloat((dailyProfit * 365).toFixed(2));

  return {
    dailyTrades,
    dailyVolume, monthlyVolume, yearlyVolume,
    dailyProfit, monthlyProfit, yearlyProfit,
    rate,
    totalProfit: user.totalProfit || 0,
  };
};

module.exports = { applyDailyProfits, getTradingStats };
