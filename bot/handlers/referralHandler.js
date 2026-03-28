'use strict';
const { getUserById, findOrCreateUser } = require('../../services/userService');
const { User }                          = require('../../models');
const { referralKeyboard }              = require('../keyboards');
const logger                            = require('../../utils/logger');

const fmt = (n) => Number(n || 0).toFixed(2);

// ── شاشة الإحالات ────────────────────────────────────────────────────────────
const handleReferrals = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) { await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك.'); return; }

    await user.ensureReferralCode();

    // بناء الرابط الصحيح من اسم البوت الفعلي
    const botInfo     = await bot.getMe();
    const referralLink = `https://t.me/${botInfo.username}?start=ref_${user.referralCode}`;

    const msg =
      `🎁 *برنامج الإحالات*\n` +
      `➖➖➖➖➖➖➖➖\n\n` +
      `👥 *الأصدقاء المحالون:* ${user.invitedFriends}\n` +
      `🎯 *كودك الخاص:* \`${user.referralCode}\`\n\n` +
      `🔗 *رابط الإحالة:*\n` +
      `${referralLink}\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `📋 *كيف يعمل البرنامج:*\n` +
      `• شارك رابطك مع أصدقائك\n` +
      `• كل صديق يسجل عبر رابطك يُحسب لك تلقائياً\n` +
      `• بعد دعوة 20 صديق تحصل على مستوى *المدعو المتميز 👑*\n\n` +
      `🏆 *المستوى الخاص: المدعو المتميز 👑*\n` +
      `• تداولات يومية: حتى 100\n` +
      `• معدل الربح: الأعلى مع مكافآت\n` +
      `• دعم حصري 24/7\n\n` +
      `${user.invitedFriends >= 20
        ? '✅ *مبروك! تم تفعيل المستوى الخاص.*'
        : `⏳ تحتاج دعوة *${20 - user.invitedFriends}* أصدقاء إضافيين للترقية`}`;

    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', ...referralKeyboard() });
  } catch (err) {
    logger.error('handleReferrals:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── قائمة الأصدقاء ───────────────────────────────────────────────────────────
const handleReferralFriends = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) return;

    const friends = await User.find({ referredBy: user.telegramId })
      .sort({ createdAt: -1 }).limit(20).lean();

    if (friends.length === 0) {
      await bot.sendMessage(chatId,
        `👥 *الأصدقاء المحالون*\n\n_لم تقم بإحالة أي أصدقاء بعد._`,
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
      msg += `${i + 1}. *${name}*\n   🆔 ${f.telegramId} | 💰 ${fmt(f.balance)} USDT | 📅 ${date}\n\n`;
    });

    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
      [{ text: '🔙 الإحالات', callback_data: 'referrals' }],
      [{ text: '🔙 القائمة',  callback_data: 'back_main'  }],
    ]}});
  } catch (err) {
    logger.error('handleReferralFriends:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── معالجة /start ref_CODE ────────────────────────────────────────────────────
// يُستدعى من startHandler بعد إنشاء المستخدم الجديد
const handleReferralStart = async (referralCode, newUser) => {
  try {
    if (!referralCode) return;

    // استخراج الكود — يدعم ref_CODE و CODE مباشرة
    const code     = referralCode.startsWith('ref_') ? referralCode.slice(4) : referralCode;
    const referrer = await User.findOne({ referralCode: code });

    if (!referrer || referrer.telegramId === String(newUser.telegramId)) return;

    // تسجيل المُحيل على المستخدم الجديد مباشرةً في DB
    const updated = await User.findOneAndUpdate(
      { telegramId: String(newUser.telegramId), referredBy: null },
      { $set: { referredBy: referrer.telegramId } },
      { new: true }
    );

    if (!updated) {
      logger.info(`Referral skipped: ${newUser.telegramId} already has referrer`);
      return;
    }

    // زيادة عداد المُحيل
    await User.findOneAndUpdate(
      { telegramId: referrer.telegramId },
      {
        $inc: { invitedFriends: 1 },
        $set: referrer.invitedFriends + 1 >= 20 ? { isVip: true } : {},
      }
    );

    logger.info(`Referral OK: ${newUser.telegramId} ← ${referrer.telegramId} (code: ${code})`);
  } catch (err) {
    logger.error('handleReferralStart:', err);
  }
};

module.exports = { handleReferrals, handleReferralFriends, handleReferralStart };
