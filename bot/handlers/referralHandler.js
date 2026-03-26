'use strict';
const { getUserById } = require('../../services/userService');
const { User }        = require('../../models');
const { referralKeyboard } = require('../keyboards');
const logger = require('../../utils/logger');

const fmt = (n) => Number(n||0).toFixed(2);

// ── شاشة الإحالات الرئيسية ────────────────────────────────────────────────────
const handleReferrals = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك. اضغط /start للتسجيل.');
      return;
    }

    // تأكد من وجود كود إحالة
    await user.ensureReferralCode();

    const botUsername = (await bot.getMe()).username;
    const referralLink = `https://t.me/${botUsername}?start=ref_${user.referralCode}`;

    const msg =
      `🎁 *برنامج الإحالات*\n` +
      `➖➖➖➖➖➖➖➖\n\n` +
      `👥 *الأصدقاء المحالون:* ${user.invitedFriends}\n` +
      `🎯 *كودك الخاص:* \`${user.referralCode}\`\n\n` +
      `🔗 *رابط الإحالة الخاص بك:*\n` +
      `${referralLink}\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `📋 *كيف يعمل البرنامج:*\n` +
      `• شارك رابطك مع أصدقائك\n` +
      `• كل صديق يسجل عبر رابطك يُحسب لك\n` +
      `• بعد دعوة 20 صديق تحصل على مستوى *المدعو المتميز 👑*\n\n` +
      `🏆 *المستوى الخاص: المدعو المتميز 👑*\n` +
      `• تداولات يومية: حتى 100\n` +
      `• معدل الربح: الأعلى مع مكافآت\n` +
      `• دعم حصري 24/7\n` +
      `• لا يشترط رصيد محدد\n\n` +
      `${user.invitedFriends >= 20
        ? '✅ *مبروك! تم تفعيل المستوى الخاص.*'
        : `⏳ تحتاج إلى دعوة *${20 - user.invitedFriends}* أصدقاء إضافيين للترقية`}`;

    await bot.sendMessage(chatId, msg, {
      parse_mode: 'Markdown',
      ...referralKeyboard(),
    });
  } catch (err) {
    logger.error('handleReferrals:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── قائمة الأصدقاء المحالين ───────────────────────────────────────────────────
const handleReferralFriends = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) return;

    const friends = await User.find({ referredBy: user.telegramId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (friends.length === 0) {
      await bot.sendMessage(chatId,
        `👥 *الأصدقاء المحالون*\n\n_لم تقم بإحالة أي أصدقاء بعد._\n\nشارك رابط الإحالة الخاص بك لبدء الإحالات!`,
        { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
          [{ text: '🎁 رابط الإحالة', callback_data: 'referrals' }],
          [{ text: '🔙 رجوع',         callback_data: 'back_main'  }],
        ]}});
      return;
    }

    let msg = `👥 *الأصدقاء المحالون* (${friends.length})\n➖➖➖➖➖➖➖➖\n\n`;

    friends.forEach((f, i) => {
      const name = [f.firstName, f.lastName].filter(Boolean).join(' ') || f.username || `User_${f.telegramId}`;
      const date = new Date(f.createdAt).toLocaleDateString('ar');
      msg += `${i + 1}. *${name}*\n`;
      msg += `   🆔 ${f.telegramId} | 💰 ${fmt(f.balance)} USDT\n`;
      msg += `   📅 ${date}\n\n`;
    });

    await bot.sendMessage(chatId, msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [
        [{ text: '🔙 الإحالات', callback_data: 'referrals' }],
        [{ text: '🔙 القائمة',  callback_data: 'back_main'  }],
      ]},
    });
  } catch (err) {
    logger.error('handleReferralFriends:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── معالجة /start?ref=CODE ────────────────────────────────────────────────────
const handleReferralStart = async (referralCode, newUser) => {
  try {
    if (!referralCode) return;

    const code   = referralCode.replace('ref_', '');
    const referrer = await User.findOne({ referralCode: code });
    if (!referrer || referrer.telegramId === newUser.telegramId) return;

    // تسجيل من أحاله
    newUser.referredBy = referrer.telegramId;
    await newUser.save();

    // زيادة عداد الإحالات عند المُحيل
    referrer.invitedFriends += 1;

    // تفعيل المستوى VIP عند 20 إحالة
    if (referrer.invitedFriends >= 20 && !referrer.isVip) {
      referrer.isVip = true;
    }

    await referrer.save();
    logger.info(`Referral: ${newUser.telegramId} referred by ${referrer.telegramId}`);
  } catch (err) {
    logger.error('handleReferralStart:', err);
  }
};

module.exports = { handleReferrals, handleReferralFriends, handleReferralStart };
