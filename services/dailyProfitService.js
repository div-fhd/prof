'use strict';
const { User }         = require('../models');
const { logStatement } = require('./userService');
const logger           = require('../utils/logger');

let _bot = null;
const setBotInstance = (bot) => { _bot = bot; };

// ── نسبة عشوائية من نطاق المستوى ─────────────────────────────────────────────
const randomRateForLevel = (level) => {
  const config = require('../config');
  const range  = config.accountLevelRanges.find(r => r.level === level)
              || config.accountLevelRanges[0];
  // كل دورة 8 ساعات = ثُلث الربح اليومي
  const dailyRand = Math.random() * (range.max - range.min) + range.min;
  return parseFloat((dailyRand / 3).toFixed(6)); // ÷3 لأن 3 دورات في اليوم
};

// ── رسالة الربح الاحتفالية ────────────────────────────────────────────────────
const buildProfitNotification = (user, profit, rate, newBalance) => {
  const rateDisplay    = (rate * 100).toFixed(3);
  const profitDisplay  = profit.toFixed(2);
  const balanceDisplay = newBalance.toFixed(2);
  const celebrate      = profit >= 100 ? '🎉🎊🏆' : profit >= 50 ? '🎉🎊' : '🎉';
  const motivations    = [
    '🔥 البوت يعمل بأقصى طاقته!',
    '🚀 يوم موفق آخر في رحلتك الاستثمارية!',
    '💎 أرباحك تتراكم كل 8 ساعات — استمر!',
    '⚡️ النظام الذكي حقق لك مكاسب الآن!',
    '🌟 استثمارك الذكي يؤتي ثماره!',
    '📈 السوق يعمل لصالحك!',
  ];
  const motivation = motivations[Math.floor(Math.random() * motivations.length)];
  return (
    `${celebrate} *تهانينا ${user.displayName()}!* ${celebrate}\n\n` +
    `${motivation}\n\n` +
    `➖➖➖➖➖➖➖➖\n` +
    `📊 *تقرير الأرباح — كل 8 ساعات*\n\n` +
    `💹 *نسبة الربح:* ${rateDisplay}٪\n` +
    `💰 *الربح المضاف:* *+${profitDisplay} USDT*\n` +
    `🏦 *رصيدك الجديد:* *${balanceDisplay} USDT*\n` +
    `🏆 *المستوى:* ${user.levelName()}\n\n` +
    `➖➖➖➖➖➖➖➖\n` +
    `_لإيقاف البوت أو سحب أرباحك اضغط الأزرار أدناه_ 👇`
  );
};

// ── تطبيق الأرباح (يُشغَّل كل 8 ساعات) ──────────────────────────────────────
const applyDailyProfits = async () => {
  logger.info('Profit cycle started (8h)...');
  const users = await User.find({ botStatus: 'active', balance: { $gt: 0 } });

  let processed = 0;
  for (const user of users) {
    try {
      // إيقاف فوري إذا الرصيد أقل من 10
      if (user.balance < 10) {
        user.botStatus    = 'stopped';
        user.botStoppedAt = new Date();
        await user.save();
        if (_bot) {
          try {
            await _bot.sendMessage(user.telegramId,
              `⚠️ *تم إيقاف البوت تلقائياً*\n\n` +
              `رصيدك الحالي *${user.balance.toFixed(2)} USDT* أقل من الحد الأدنى للتداول *10 USDT*.\n\n` +
              `_أودع رصيداً لإعادة التشغيل._`,
              { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
                [{ text: '💰 إيداع', callback_data: 'deposit'   }],
                [{ text: '👤 حسابي', callback_data: 'my_account'}],
              ]}});
          } catch (_) {}
        }
        continue;
      }

      const rate   = randomRateForLevel(user.accountLevel);
      const profit = parseFloat((user.balance * rate).toFixed(2));
      if (profit <= 0) continue;

      const before      = user.balance;
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
        description:   `8h profit ${(rate * 100).toFixed(3)}%`,
        descriptionAr: `📈 ربح (${(rate * 100).toFixed(3)}٪): +${profit} USDT`,
        status:        'completed',
      });

      if (_bot) {
        try {
          const msg = buildProfitNotification(user, profit, rate, user.balance);
          await _bot.sendMessage(user.telegramId, msg, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [
              [
                { text: '⏹️ إيقاف البوت', callback_data: 'bot_stop'   },
                { text: '💸 سحب الأرباح', callback_data: 'withdraw'   },
              ],
              [
                { text: '👤 حسابي',       callback_data: 'my_account' },
                { text: '📊 التداول',     callback_data: 'trading'    },
              ],
            ]},
          });
          await new Promise(r => setTimeout(r, 50));
        } catch (e) {
          logger.warn(`Profit notify failed for ${user.telegramId}: ${e.message}`);
        }
      }

      processed++;
    } catch (err) {
      logger.error(`Profit error for ${user.telegramId}:`, err.message);
    }
  }

  logger.info(`Profit cycle done — ${processed}/${users.length} users`);
};

// ── جدولة كل 8 ساعات ─────────────────────────────────────────────────────────
const scheduleProfits = () => {
  const INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 ساعات

  const runNext = () => {
    setTimeout(async () => {
      await applyDailyProfits();
      runNext();
    }, INTERVAL_MS);
  };

  // أول تشغيل بعد 8 ساعات من إقلاع السيرفر
  runNext();
  logger.info('Profit scheduler set: every 8 hours');
};

// ── إحصائيات التداول ─────────────────────────────────────────────────────────
const getTradingStats = (user) => {
  const config        = require('../config');
  const rate          = user.dailyProfitRate();           // نسبة يومية للعرض
  const tradeCountMap = { 1:10, 2:20, 3:40, 4:60, 5:100 };
  const dailyTrades   = tradeCountMap[user.accountLevel] || 10;

  const dailyVolume   = parseFloat((user.balance * rate * dailyTrades * 0.1).toFixed(2));
  const dailyProfit   = parseFloat((user.balance * rate).toFixed(2));

  return {
    dailyTrades,
    dailyVolume,
    monthlyVolume:  parseFloat((dailyVolume * 30).toFixed(2)),
    yearlyVolume:   parseFloat((dailyVolume * 365).toFixed(2)),
    dailyProfit,
    monthlyProfit:  parseFloat((dailyProfit * 30).toFixed(2)),
    yearlyProfit:   parseFloat((dailyProfit * 365).toFixed(2)),
    rate,
    totalProfit:    user.totalProfit || 0,
  };
};

module.exports = { applyDailyProfits, scheduleProfits, getTradingStats, setBotInstance };
