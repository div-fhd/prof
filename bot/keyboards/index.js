'use strict';
const config = require('../../config');

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Telegram inline URL buttons MUST start with http:// or https://.
 * Any other value (wallet address, plain text, t.me without protocol, etc.)
 * causes a 400 Bad Request.  We validate before deciding button type.
 */
const isValidHttpUrl = (str) => {
  try {
    const u = new URL(str);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Reply keyboards  (persistent bottom bar)
// ─────────────────────────────────────────────────────────────────────────────

/** Persistent main menu at the bottom */
const mainMenuKeyboard = () => ({
  reply_markup: {
    keyboard: [
      [{ text: '💲 USDT' },          { text: '📊 الأرباح المتوقعة' }],
      [{ text: '👤 حسابي' },         { text: '🔙 العودة للخلف' }],
    ],
    resize_keyboard: true,
    persistent: true,
  },
});

/** Single-use cancel button while waiting for user input */
const cancelKeyboard = () => ({
  reply_markup: {
    keyboard: [[{ text: '❌ إلغاء' }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Inline keyboards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deposit – wallet buttons.
 *
 * If a wallet link is a valid https:// URL → use Telegram's url button (opens browser).
 * If it is anything else (wallet address, plain text, t.me without https://) →
 * use a callback_data button so the handler can display the address as text.
 * This prevents the "Wrong HTTP URL" 400 error from Telegram.
 */
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
        [{ text: '🔙 رجوع', callback_data: 'back_main' }],
      ],
    },
  };
};

/** After profit calculation */
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

/** Account levels screen */
const accountLevelsKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '💰 إيداع',  callback_data: 'deposit'    }],
      [{ text: '👤 حسابي',  callback_data: 'my_account' }],
      [{ text: '🔙 رجوع',   callback_data: 'back_main'  }],
    ],
  },
});

/** My account dashboard */
const myAccountKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '▶️ تشغيل البوت',  callback_data: 'bot_start' },
        { text: '⏹️ إيقاف البوت', callback_data: 'bot_stop'  },
      ],
      [
        { text: '💰 إيداع', callback_data: 'deposit'  },
        { text: '💸 سحب',   callback_data: 'withdraw' },
      ],
      [{ text: '📄 كشف الحساب', callback_data: 'account_statement' }],
      [{ text: '🔙 رجوع',       callback_data: 'back_main'         }],
    ],
  },
});

/** Bot started/stopped confirmation */
const afterBotControlKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '👤 عرض حسابي', callback_data: 'my_account' }],
      [{ text: '🔙 رجوع',      callback_data: 'back_main'  }],
    ],
  },
});

/** Withdraw info screen */
const withdrawKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '📤 تقديم طلب سحب', callback_data: 'withdraw_request' }],
      [{ text: 'ℹ️ كيف يعمل',      callback_data: 'how_it_works'      }],
      [{ text: '🔙 رجوع',          callback_data: 'back_main'         }],
    ],
  },
});

/** After withdrawal confirmed */
const afterWithdrawKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '👤 حسابي', callback_data: 'my_account' }],
      [{ text: '🔙 رجوع',  callback_data: 'back_main'  }],
    ],
  },
});

/** Account statement */
const statementKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔄 تحديث', callback_data: 'account_statement' }],
      [{ text: '🔙 رجوع',  callback_data: 'back_main'         }],
    ],
  },
});

/** Generic back-only screen */
const backOnlyKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔙 رجوع', callback_data: 'back_main' }],
    ],
  },
});

module.exports = {
  // reply keyboards
  mainMenuKeyboard,
  cancelKeyboard,
  // inline keyboards
  depositKeyboard,
  profitKeyboard,
  accountLevelsKeyboard,
  myAccountKeyboard,
  afterBotControlKeyboard,
  withdrawKeyboard,
  afterWithdrawKeyboard,
  statementKeyboard,
  backOnlyKeyboard,
};
