'use strict';
const { getUserById } = require('../../services/userService');
const config = require('../../config');
const logger = require('../../utils/logger');

const handleSupport = async (bot, chatId) => {
  try {
    const user     = await getUserById(chatId);
    const userId   = user ? user.telegramId   : String(chatId);
    const userName = user ? user.displayName() : String(chatId);
    const level    = user ? user.levelName()   : '—';
    const balance  = user ? user.balance.toFixed(2) : '0.00';
    const botSt    = user ? (user.botStatus === 'active' ? '🟢 نشط' : '🔴 متوقف') : '—';
    const joined   = user ? new Date(user.createdAt).toLocaleDateString('ar') : '—';

    const supportLink    = config.support.link || `https://t.me/${config.support.username}`;
    // أرسل للـ ID المخصص للدعم في .env (SUPPORT_TELEGRAM_ID)
    const adminTelegramId = process.env.SUPPORT_TELEGRAM_ID || config.admin.telegramId;

    // ── رسالة اليوزر ─────────────────────────────────────────────────────────
    await bot.sendMessage(chatId,
      `🆘 *الدعم الفني*\n\n` +
      `اضغط الزر أدناه للتواصل مع فريق الدعم.\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `📋 *بيانات حسابك* (ستُرسل تلقائياً للدعم):\n\n` +
      `🆔 *ID:* \`${userId}\`\n` +
      `👤 *الاسم:* ${userName}\n` +
      `🏆 *المستوى:* ${level}\n` +
      `💰 *الرصيد:* ${balance} USDT\n` +
      `🤖 *حالة البوت:* ${botSt}\n`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
        [{ text: '💬 تواصل مع الدعم', url: supportLink }],
        [{ text: '🔙 رجوع', callback_data: 'back_main' }],
      ]}});

    // ── إرسال بيانات اليوزر تلقائياً لحساب الأدمن/الدعم ─────────────────────
    if (adminTelegramId) {
      try {
        await bot.sendMessage(adminTelegramId,
          `🔔 *مستخدم يطلب الدعم*\n\n` +
          `➖➖➖➖➖➖➖➖\n` +
          `🆔 *Telegram ID:* \`${userId}\`\n` +
          `👤 *الاسم:* ${userName}\n` +
          `📛 *Username:* ${user?.username ? `@${user.username}` : '—'}\n` +
          `🏆 *المستوى:* ${level}\n` +
          `💰 *الرصيد:* ${balance} USDT\n` +
          `🤖 *حالة البوت:* ${botSt}\n` +
          `📅 *تاريخ التسجيل:* ${joined}\n\n` +
          `_يمكنك الرد مباشرة على المستخدم من خلال ID أعلاه_`,
          { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
            [{ text: '💬 فتح المحادثة', url: `tg://user?id=${userId}` }],
          ]}});
      } catch (adminErr) {
        logger.warn(`Support notify to admin failed: ${adminErr.message}`);
      }
    }

  } catch (err) {
    logger.error('handleSupport:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleSupport };
