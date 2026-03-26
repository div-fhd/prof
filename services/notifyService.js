'use strict';
const logger = require('../utils/logger');

let _bot = null;
const setBotInstance = (bot) => { _bot = bot; };

const fmt = (n) => Number(n || 0).toFixed(2);
const SEP = '➖➖➖➖➖➖➖➖';

// ── مرسل أساسي (لا يرمي خطأ) ─────────────────────────────────────────────────
const send = async (telegramId, text, keyboard = null) => {
  if (!_bot) return;
  try {
    const opts = { parse_mode: 'Markdown' };
    if (keyboard) opts.reply_markup = { inline_keyboard: keyboard };
    await _bot.sendMessage(telegramId, text, opts);
  } catch (err) {
    logger.warn(`[notify] failed → ${telegramId}: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  إيداع
// ─────────────────────────────────────────────────────────────────────────────

/** عند إنشاء طلب الإيداع */
const onDepositCreated = (telegramId, deposit) =>
  send(telegramId,
    `📨 *تم استلام طلب إيداعك!*\n\n` +
    `${SEP}\n` +
    `🌐 الشبكة: *${deposit.network}*\n` +
    `💵 المبلغ المرسل: *${fmt(deposit.amount)} USDT*\n` +
    `💸 الرسوم (5٪): *${fmt(deposit.fee)} USDT*\n` +
    `💰 الصافي عند التأكيد: *${fmt(deposit.netAmount)} USDT*\n\n` +
    `${SEP}\n` +
    `🆔 رقم الطلب: \`${deposit._id}\`\n` +
    `⏳ الحالة: *قيد المراجعة*\n\n` +
    `_سيصلك إشعار فور تأكيد الإيداع._`,
    [
      [{ text: '👤 حسابي', callback_data: 'my_account' },
       { text: '🆘 الدعم',  callback_data: 'support'    }],
      [{ text: '🔙 القائمة', callback_data: 'back_main' }],
    ]
  );

/** عند قبول الإيداع من الأدمن */
const onDepositApproved = (telegramId, deposit, user) => {
  const botBtn = user.botStatus === 'active'
    ? { text: '⏹️ إيقاف البوت', callback_data: 'bot_stop'  }
    : { text: '▶️ تشغيل البوت', callback_data: 'bot_start' };
  const botHint = user.botStatus === 'active'
    ? `_البوت نشط ويعمل على رصيدك الجديد._`
    : `_يمكنك الآن تشغيل البوت لبدء التداول._`;
  return send(telegramId,
    `✅ *تمت الموافقة على إيداعك!* 🎉\n\n` +
    `${SEP}\n` +
    `💵 المبلغ: *${fmt(deposit.amount)} USDT*\n` +
    `💰 المُضاف لرصيدك: *+${fmt(deposit.netAmount)} USDT*\n` +
    `🌐 الشبكة: *${deposit.network}*\n\n` +
    `${SEP}\n` +
    `🏦 *رصيدك الجديد: ${fmt(user.balance)} USDT*\n` +
    `🏆 المستوى: *${user.levelName()}*\n\n` +
    botHint,
    [
      [botBtn, { text: '👤 حسابي', callback_data: 'my_account' }],
      [{ text: '📊 التداول', callback_data: 'trading' }],
    ]
  );
};

/** عند رفض الإيداع */
const onDepositRejected = (telegramId, deposit, reason) =>
  send(telegramId,
    `❌ *تم رفض طلب الإيداع*\n\n` +
    `${SEP}\n` +
    `💵 المبلغ: *${fmt(deposit.amount)} USDT*\n` +
    `🌐 الشبكة: *${deposit.network}*\n` +
    `🆔 رقم الطلب: \`${deposit._id}\`\n` +
    `${reason ? `\n📝 السبب: _${reason}_\n` : ''}\n` +
    `_للاستفسار تواصل مع الدعم الفني._`,
    [
      [{ text: '🆘 الدعم الفني', callback_data: 'support' },
       { text: '💰 إيداع جديد',  callback_data: 'deposit' }],
    ]
  );

// ─────────────────────────────────────────────────────────────────────────────
//  سحب
// ─────────────────────────────────────────────────────────────────────────────

/** عند إنشاء طلب السحب */
const onWithdrawalCreated = (telegramId, withdrawal) =>
  send(telegramId,
    `📨 *تم استلام طلب سحبك!*\n\n` +
    `${SEP}\n` +
    `📤 المبلغ: *${fmt(withdrawal.amount)} USDT*\n` +
    `💸 الرسوم (5٪): *${fmt(withdrawal.fee)} USDT*\n` +
    `💰 الصافي: *${fmt(withdrawal.netAmount)} USDT*\n` +
    `🌐 الشبكة: *${withdrawal.network}*\n` +
    `📋 العنوان: \`${withdrawal.walletAddress || '—'}\`\n\n` +
    `${SEP}\n` +
    `🆔 رقم الطلب: \`${withdrawal._id}\`\n` +
    `⏳ الحالة: *قيد المراجعة*\n\n` +
    `_سيتم التحويل خلال 2-7 أيام عمل._`,
    [
      [{ text: '👤 حسابي',  callback_data: 'my_account' },
       { text: '🆘 الدعم',   callback_data: 'support'    }],
      [{ text: '🔙 القائمة', callback_data: 'back_main'  }],
    ]
  );

/** عند تنفيذ السحب من الأدمن */
const onWithdrawalCompleted = (telegramId, withdrawal, user) =>
  send(telegramId,
    `✅ *تم تنفيذ طلب سحبك!* 🎉\n\n` +
    `${SEP}\n` +
    `📤 المبلغ: *${fmt(withdrawal.amount)} USDT*\n` +
    `💰 الصافي المُحوَّل: *${fmt(withdrawal.netAmount)} USDT*\n` +
    `🌐 الشبكة: *${withdrawal.network}*\n` +
    `📋 العنوان: \`${withdrawal.walletAddress || '—'}\`\n\n` +
    `${SEP}\n` +
    `🏦 *رصيدك الحالي: ${fmt(user.balance)} USDT*\n\n` +
    `_تحقق من محفظتك خلال دقائق._`,
    [
      [{ text: '👤 حسابي',       callback_data: 'my_account' },
       { text: '📊 التداول',     callback_data: 'trading'    }],
      [{ text: '💰 إيداع جديد',  callback_data: 'deposit'    }],
    ]
  );

/** عند رفض السحب */
const onWithdrawalRejected = (telegramId, withdrawal, reason) =>
  send(telegramId,
    `❌ *تم رفض طلب السحب*\n\n` +
    `${SEP}\n` +
    `📤 المبلغ: *${fmt(withdrawal.amount)} USDT*\n` +
    `🆔 رقم الطلب: \`${withdrawal._id}\`\n` +
    `${reason ? `\n📝 السبب: _${reason}_\n` : ''}\n` +
    `_تم إعادة المبلغ لرصيدك. للاستفسار تواصل مع الدعم._`,
    [
      [{ text: '🆘 الدعم الفني', callback_data: 'support'  },
       { text: '💸 سحب جديد',   callback_data: 'withdraw'  }],
      [{ text: '👤 حسابي',      callback_data: 'my_account'}],
    ]
  );

// ─────────────────────────────────────────────────────────────────────────────
//  ترقية المستوى
// ─────────────────────────────────────────────────────────────────────────────

const _levelName = (level) => {
  const n = { 1:'مبتدئ ⚡️', 2:'مبتدئ 🎉', 3:'متوسط 🔥', 4:'متداول متقدم 🌟', 5:'متداول VIP 🚀' };
  return n[level] || `مستوى ${level}`;
};

const onLevelUpgrade = (telegramId, oldLevel, newLevel, user) =>
  send(telegramId,
    `🎉 *مبروك! تمت ترقية حسابك!* 🎉\n\n` +
    `${SEP}\n` +
    `⬆️ *${_levelName(oldLevel)}  ←  ${user.levelName()}*\n\n` +
    `🏦 رصيدك: *${fmt(user.balance)} USDT*\n\n` +
    `${SEP}\n` +
    `_مع المستوى الجديد ستحصل على نسبة ربح يومي أعلى!_`,
    [
      [{ text: '👤 حسابي',    callback_data: 'my_account'    },
       { text: '📋 المستويات', callback_data: 'account_levels'}],
    ]
  );

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  setBotInstance,
  onDepositCreated,
  onDepositApproved,
  onDepositRejected,
  onWithdrawalCreated,
  onWithdrawalCompleted,
  onWithdrawalRejected,
  onLevelUpgrade,
};
