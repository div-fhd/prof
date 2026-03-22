const config = require('../../config');

/**
 * Main menu keyboard
 */
const mainMenuKeyboard = () => ({
  reply_markup: {
    keyboard: [
      [{ text: '💲 USDT' }, { text: '📊 الأرباح المتوقعة' }],
      [{ text: '👤 حسابي' }, { text: '🔙 العودة للخلف' }],
    ],
    resize_keyboard: true,
    persistent: true,
  },
});

/**
 * Deposit section keyboard - inline
 */
const depositKeyboard = () => {
  const buttons = config.payment.wallets.map((wallet) => [
    { text: `💳 ${wallet.name}`, url: wallet.link },
  ]);
  buttons.push([{ text: '🔙 العودة للخلف', callback_data: 'back_main' }]);

  return {
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
};

/**
 * Expected profits keyboard - inline
 */
const profitKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔄 إعادة الحساب', callback_data: 'recalculate_profit' }],
      [{ text: '📋 مستويات الحساب', callback_data: 'account_levels' }],
      [{ text: '🔙 العودة للخلف', callback_data: 'back_main' }],
    ],
  },
});

/**
 * Account levels keyboard - inline
 */
const accountLevelsKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '💰 إيداع', callback_data: 'deposit' }],
      [{ text: '👤 حسابي', callback_data: 'my_account' }],
      [{ text: '🔙 العودة للخلف', callback_data: 'back_main' }],
    ],
  },
});

/**
 * My account keyboard - inline
 */
const myAccountKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '▶️ تشغيل البوت', callback_data: 'bot_start' },
        { text: '⏹️ إيقاف البوت', callback_data: 'bot_stop' },
      ],
      [
        { text: '💰 إيداع', callback_data: 'deposit' },
        { text: '💸 سحب', callback_data: 'withdraw' },
      ],
      [{ text: '📄 كشف حساب', callback_data: 'account_statement' }],
      [{ text: '🔙 العودة للخلف', callback_data: 'back_main' }],
    ],
  },
});

/**
 * Withdraw keyboard - inline
 */
const withdrawKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '📤 تقديم طلب سحب', callback_data: 'withdraw_request' }],
      [{ text: 'ℹ️ كيف يعمل', callback_data: 'how_it_works' }],
      [{ text: '🔙 العودة للخلف', callback_data: 'back_main' }],
    ],
  },
});

/**
 * Account statement keyboard - inline
 */
const statementKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔄 تحديث', callback_data: 'account_statement' }],
      [{ text: '🔙 العودة للخلف', callback_data: 'back_main' }],
    ],
  },
});

/**
 * Back to main - inline
 */
const backMainKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [[{ text: '🔙 العودة للخلف', callback_data: 'back_main' }]],
  },
});

/**
 * Cancel / back keyboard
 */
const cancelKeyboard = () => ({
  reply_markup: {
    keyboard: [[{ text: '❌ إلغاء' }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
});

module.exports = {
  mainMenuKeyboard,
  depositKeyboard,
  profitKeyboard,
  accountLevelsKeyboard,
  myAccountKeyboard,
  withdrawKeyboard,
  statementKeyboard,
  backMainKeyboard,
  cancelKeyboard,
};
