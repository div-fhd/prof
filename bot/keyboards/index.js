'use strict';
const config = require('../../config');

const isValidHttpUrl = (str) => {
  try { const u = new URL(str); return u.protocol === 'https:' || u.protocol === 'http:'; }
  catch { return false; }
};

// ── Reply keyboards ───────────────────────────────────────────────────────────
const mainMenuKeyboard = () => ({
  reply_markup: {
    keyboard: [
      [{ text: '💲 USDT' },           { text: '📊 الأرباح المتوقعة' }],
      [{ text: '📈 التداول' },        { text: '👤 حسابي' }],
      [{ text: '🎁 الإحالات' },       { text: '🆘 الدعم' }],
      [{ text: '🔙 العودة للخلف' }],
    ],
    resize_keyboard: true,
    persistent: true,
  },
});

const cancelKeyboard = () => ({
  reply_markup: {
    keyboard: [[{ text: '❌ إلغاء' }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
});

// ── Inline keyboards ──────────────────────────────────────────────────────────

/** شاشة الإيداع — أزرار المحافظ + زر تأكيد */
const depositKeyboard = () => {
  const walletButtons = config.payment.wallets.map((w, i) => {
    if (isValidHttpUrl(w.link)) {
      return [{ text: w.name, url: w.link }];
    }
    return [{ text: w.name, callback_data: `wallet_info_${i}` }];
  });
  return {
    reply_markup: {
      inline_keyboard: [
        ...walletButtons,
        [{ text: '✅ أرسلت الدفع — سجّل طلبي', callback_data: 'deposit_confirm' }],
        [{ text: '🔙 رجوع', callback_data: 'back_main' }],
      ],
    },
  };
};

const profitKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔄 إعادة الحساب',   callback_data: 'recalculate_profit' }],
      [{ text: '📋 مستويات الحساب', callback_data: 'account_levels'     }],
      [{ text: '💰 إيداع',          callback_data: 'deposit'             }],
      [{ text: '🔙 رجوع',           callback_data: 'back_main'           }],
    ],
  },
});

const accountLevelsKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '💰 إيداع',  callback_data: 'deposit'    }],
      [{ text: '👤 حسابي',  callback_data: 'my_account' }],
      [{ text: '🔙 رجوع',   callback_data: 'back_main'  }],
    ],
  },
});

const myAccountKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '▶️ تشغيل البوت',  callback_data: 'bot_start' },
        { text: '⏹️ إيقاف البوت', callback_data: 'bot_stop'  },
      ],
      [
        { text: '💰 إيداع',       callback_data: 'deposit'   },
        { text: '💸 سحب',         callback_data: 'withdraw'  },
      ],
      [{ text: '🎁 الإحالات',     callback_data: 'referrals'         }],
      [{ text: '📄 كشف الحساب',   callback_data: 'account_statement' }],
      [{ text: '🔙 رجوع',         callback_data: 'back_main'         }],
    ],
  },
});

const afterBotControlKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '👤 عرض حسابي', callback_data: 'my_account' }],
      [{ text: '🔙 رجوع',      callback_data: 'back_main'  }],
    ],
  },
});

const withdrawKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '📤 تقديم طلب سحب', callback_data: 'withdraw_request' }],
      [{ text: 'ℹ️ كيف يعمل',      callback_data: 'how_it_works'      }],
      [{ text: '🔙 رجوع',          callback_data: 'back_main'         }],
    ],
  },
});

const afterWithdrawKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '👤 حسابي', callback_data: 'my_account' }],
      [{ text: '🔙 رجوع',  callback_data: 'back_main'  }],
    ],
  },
});

const statementKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔄 تحديث', callback_data: 'account_statement' }],
      [{ text: '🔙 رجوع',  callback_data: 'back_main'         }],
    ],
  },
});

const tradingKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '▶️ تشغيل البوت',  callback_data: 'bot_start'  }],
      [{ text: '⏹️ إيقاف البوت', callback_data: 'bot_stop'   }],
      [{ text: '💰 إيداع',        callback_data: 'deposit'    }],
      [{ text: '🔙 رجوع',         callback_data: 'back_main'  }],
    ],
  },
});

const referralKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '👥 أصدقائي المحالون', callback_data: 'referral_friends' }],
      [{ text: '🔙 رجوع',            callback_data: 'back_main'         }],
    ],
  },
});

const backOnlyKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_main' }]],
  },
});

module.exports = {
  mainMenuKeyboard, cancelKeyboard,
  depositKeyboard, profitKeyboard, accountLevelsKeyboard,
  myAccountKeyboard, afterBotControlKeyboard,
  withdrawKeyboard, afterWithdrawKeyboard,
  statementKeyboard, tradingKeyboard, referralKeyboard,
  backOnlyKeyboard,
};
