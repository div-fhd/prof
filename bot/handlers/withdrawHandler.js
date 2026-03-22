'use strict';
const { getUserById, setState, clearState } = require('../../services/userService');
const { createWithdrawalRequest }            = require('../../services/withdrawalService');
const {
  withdrawKeyboard,
  cancelKeyboard,
  afterWithdrawKeyboard,
  backOnlyKeyboard,
} = require('../keyboards');
const {
  withdrawInfoMsg,
  askWithdrawAmountMsg,
  withdrawConfirmMsg,
  howItWorksMsg,
} = require('../messages');
const config = require('../../config');
const logger = require('../../utils/logger');

// ── Withdraw info screen ──────────────────────────────────────────────────────
const handleWithdraw = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك.\nاضغط /start للتسجيل.');
      return;
    }
    await bot.sendMessage(chatId, withdrawInfoMsg(user), {
      parse_mode: 'Markdown',
      ...withdrawKeyboard(),
    });
  } catch (err) {
    logger.error('handleWithdraw:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 1: ask for amount ────────────────────────────────────────────────────
const handleWithdrawRequest = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك.');
      return;
    }

    if (user.balance < config.bot.minWithdrawal) {
      await bot.sendMessage(
        chatId,
        `⚠️ *رصيدك غير كافٍ للسحب.*\n\n` +
        `الحد الأدنى: *${config.bot.minWithdrawal} USDT*\n` +
        `رصيدك الحالي: *${user.balance.toFixed(2)} USDT*\n\n` +
        `قم بالإيداع أولاً لرفع رصيدك.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💰 إيداع', callback_data: 'deposit' }],
              [{ text: '🔙 رجوع', callback_data: 'back_main' }],
            ],
          },
        }
      );
      return;
    }

    await setState(chatId, 'awaiting_withdrawal_amount');
    await bot.sendMessage(chatId, askWithdrawAmountMsg(user), {
      parse_mode: 'Markdown',
      ...cancelKeyboard(),
    });
  } catch (err) {
    logger.error('handleWithdrawRequest:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 2: receive and validate amount, save to DB ──────────────────────────
const handleWithdrawAmountInput = async (bot, chatId, text) => {
  try {
    const raw    = text.replace(/[,،\s$]/g, '');
    const amount = parseFloat(raw);

    // Validate: must be a positive number
    if (isNaN(amount) || amount <= 0) {
      await bot.sendMessage(
        chatId,
        `⚠️ *قيمة غير صالحة.*\n\nأدخل مبلغًا صحيحًا.\n_مثال: 50_`,
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      return;
    }

    // Validate: minimum
    if (amount < config.bot.minWithdrawal) {
      await bot.sendMessage(
        chatId,
        `⚠️ الحد الأدنى للسحب هو *${config.bot.minWithdrawal} USDT*.\n\nأدخل مبلغًا أكبر.`,
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      return;
    }

    // Validate: sufficient balance
    const user = await getUserById(chatId);
    if (!user) {
      await clearState(chatId);
      await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك.');
      return;
    }

    if (amount > user.balance) {
      await bot.sendMessage(
        chatId,
        `⚠️ *رصيد غير كافٍ.*\n\n` +
        `رصيدك الحالي: *${user.balance.toFixed(2)} USDT*\n` +
        `أدخل مبلغًا أقل أو يساوي رصيدك.`,
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      return;
    }

    // All valid — clear state and persist request
    await clearState(chatId);

    const withdrawal = await createWithdrawalRequest({
      telegramId: chatId,
      amount,
      network: 'TRC20',
    });

    await bot.sendMessage(chatId, withdrawConfirmMsg(withdrawal), {
      parse_mode: 'Markdown',
      ...afterWithdrawKeyboard(),
    });
  } catch (err) {
    logger.error('handleWithdrawAmountInput:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── How it works ──────────────────────────────────────────────────────────────
const handleHowItWorks = async (bot, chatId) => {
  try {
    await bot.sendMessage(chatId, howItWorksMsg(), {
      parse_mode: 'Markdown',
      ...backOnlyKeyboard(),
    });
  } catch (err) {
    logger.error('handleHowItWorks:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = {
  handleWithdraw,
  handleWithdrawRequest,
  handleWithdrawAmountInput,
  handleHowItWorks,
};
