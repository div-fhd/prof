'use strict';
const { User }         = require('../models');
const { logStatement } = require('./userService');
const logger           = require('../utils/logger');

// ── مرجع للبوت يُحقن من index.js ──────────────────────────────────────────────
let _bot = null;
const setBotInstance = (bot) => { _bot = bot; };

// ── اختيار نسبة عشوائية ضمن نطاق المستوى ─────────────────────────────────────
const randomRateForLevel = (level) => {
  const config  = require('../config');
  const range   = config.accountLevelRanges.find(r => r.level === level)
               || config.accountLevelRanges[0];
  const rand    = Math.random() * (range.max - range.min) + range.min;
  // دقة 4 خانات عشرية → مثلاً 0.0213 أو 0.0347
  return parseFloat(rand.toFixed(4));
};

// ── بناء رسالة الربح الاحتفالية ───────────────────────────────────────────────
const buildProfitNotification = (user, profit, rate, newBalance) => {
  const rateDisplay    = (rate * 100).toFixed(2);   // مثلاً "2.13"
  const profitDisplay  = profit.toFixed(2);
  const balanceDisplay = newBalance.toFixed(2);

  // أيقونة احتفالية تتغير حسب حجم الربح
  const celebrate = profit >= 100 ? '🎉🎊🏆' : profit >= 50 ? '🎉🎊' : '🎉';

  // سطر تحفيزي عشوائي
  const motivations = [
    '🔥 البوت يعمل بأقصى طاقته اليوم!',
    '🚀 يوم موفق آخر في رحلتك الاستثمارية!',
    '💎 أرباحك تتراكم كل يوم — استمر!',
    '⚡️ النظام الذكي حقق لك مكاسب اليوم!',
    '🌟 استثمارك الذكي يؤتي ثماره!',
    '📈 السوق يعمل لصالحك اليوم!',
  ];
  const motivation = motivations[Math.floor(Math.random() * motivations.length)];

  return (
    `${celebrate} *تهانينا ${user.displayName()}!* ${celebrate}\n\n` +
    `${motivation}\n\n` +
    `➖➖➖➖➖➖➖➖\n` +
    `📊 *تقرير أرباح اليوم*\n\n` +
    `💹 *نسبة الربح:* ${rateDisplay}٪\n` +
    `💰 *الربح المضاف:* *+${profitDisplay} USDT*\n` +
    `🏦 *رصيدك الجديد:* *${balanceDisplay} USDT*\n` +
    `🏆 *مستوى حسابك:* ${user.levelName()}\n\n` +
    `➖➖➖➖➖➖➖➖\n` +
    `_لإيقاف البوت أو سحب أرباحك، افتح القائمة الرئيسية_ 👇`
  );
};

// ── الوظيفة الرئيسية: تطبيق الأرباح اليومية ──────────────────────────────────
const applyDailyProfits = async () => {
  logger.info('Daily profit job started...');
  const users = await User.find({ botStatus: 'active', balance: { $gt: 0 } });

  let processed = 0;
  for (const user of users) {
    try {
      const rate   = randomRateForLevel(user.accountLevel);
      const profit = parseFloat((user.balance * rate).toFixed(2));
      if (profit <= 0) continue;

      const before = user.balance;
      user.balance      = parseFloat((user.balance + profit).toFixed(2));
      user.totalProfit  = parseFloat(((user.totalProfit || 0) + profit).toFixed(2));
      user.lastProfitAt = new Date();
      await user.save();
      await user.recalculateLevel();

      await logStatement({
        telegramId:    user.telegramId,
        type:          'system',
        amount:        profit,
        balanceBefore: before,
        balanceAfter:  user.balance,
        description:   `Daily profit ${(rate * 100).toFixed(2)}%`,
        descriptionAr: `📈 ربح يومي (${(rate * 100).toFixed(2)}٪): +${profit} USDT`,
        status:        'completed',
      });

      // ── إرسال الإشعار الاحتفالي ────────────────────────────────────────────
      if (_bot) {
        try {
          const msg = buildProfitNotification(user, profit, rate, user.balance);
          // البوت نشط بالضرورة هنا — نعرض إيقاف فقط
          await _bot.sendMessage(user.telegramId, msg, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '⏹️ إيقاف البوت',  callback_data: 'bot_stop'   },
                  { text: '💸 سحب الأرباح',  callback_data: 'withdraw'   },
                ],
                [
                  { text: '👤 حسابي',         callback_data: 'my_account' },
                  { text: '📊 التداول',        callback_data: 'trading'   },
                ],
              ],
            },
          });
          // تأخير بسيط لتجنب rate limit
          await new Promise(r => setTimeout(r, 50));
        } catch (notifyErr) {
          logger.warn(`Profit notify failed for ${user.telegramId}: ${notifyErr.message}`);
        }
      }

      processed++;
    } catch (err) {
      logger.error(`Profit error for ${user.telegramId}:`, err.message);
    }
  }

  logger.info(`Daily profit job done — ${processed}/${users.length} users processed`);
};

// ── إحصائيات التداول للعرض في صفحة التداول ────────────────────────────────────
const getTradingStats = (user) => {
  const config = require('../config');
  const rate   = user.dailyProfitRate();

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

module.exports = { applyDailyProfits, getTradingStats, setBotInstance };
