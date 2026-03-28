'use strict';
const config = require('../../config');

// ── Reply keyboards ───────────────────────────────────────────────────────────
const mainMenuKeyboard = () => ({
  reply_markup: {
    keyboard: [
      [{ text: '📊 الأرباح المتوقعة' }, { text: '👤 حسابي' }],
      [{ text: '📈 التداول' },           { text: '🎁 الإحالات' }],
      [{ text: '🆘 الدعم' },             { text: '🔙 العودة للخلف' }],
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

// إصلاح: دائماً callback_data ليعرض عنوان المحفظة عند الضغط
const depositKeyboard = () => {
  const walletButtons = config.payment.wallets.map((w, i) => [
    { text: w.name, callback_data: `wallet_info_${i}` },
  ]);
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

const myAccountKeyboard = (botStatus = 'stopped') => ({
  reply_markup: {
    inline_keyboard: [
      [
        botStatus === 'active'
          ? { text: '⏹️ إيقاف البوت', callback_data: 'bot_stop'  }
          : { text: '▶️ تشغيل البوت', callback_data: 'bot_start' },
        { text: '💰 إيداع', callback_data: 'deposit'  },
        { text: '💸 سحب',   callback_data: 'withdraw' },
      ],
      [{ text: '🎁 الإحالات',   callback_data: 'referrals'         }],
      [{ text: '📄 كشف الحساب', callback_data: 'account_statement' }],
      [{ text: '🔙 رجوع',       callback_data: 'back_main'         }],
    ],
  },
});

const afterBotControlKeyboard = (botStatus = 'stopped') => ({
  reply_markup: {
    inline_keyboard: [
      [
        botStatus === 'active'
          ? { text: '⏹️ إيقاف البوت', callback_data: 'bot_stop'  }
          : { text: '▶️ تشغيل البوت', callback_data: 'bot_start' },
        { text: '👤 حسابي', callback_data: 'my_account' },
      ],
      [{ text: '🔙 رجوع', callback_data: 'back_main' }],
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

const tradingKeyboard = (botStatus = 'stopped') => ({
  reply_markup: {
    inline_keyboard: [
      [
        botStatus === 'active'
          ? { text: '⏹️ إيقاف البوت', callback_data: 'bot_stop'  }
          : { text: '▶️ تشغيل البوت', callback_data: 'bot_start' },
        { text: '💰 إيداع', callback_data: 'deposit' },
      ],
      [{ text: '🔙 رجوع', callback_data: 'back_main' }],
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
