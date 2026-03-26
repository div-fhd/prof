'use strict';
const { getUserById, setState, clearState } = require('../../services/userService');
const { createWithdrawalRequest }           = require('../../services/withdrawalService');
const { withdrawKeyboard, cancelKeyboard, afterWithdrawKeyboard, backOnlyKeyboard } = require('../keyboards');
const config = require('../../config');
const logger = require('../../utils/logger');

const fmt = (n) => Number(n||0).toFixed(2);

// ── شاشة السحب ────────────────────────────────────────────────────────────────
const handleWithdraw = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) { await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك.'); return; }

    const msg =
      `💸 *سحب الأموال* 💸\n\n` +
      `❗️ يتم قبول USDT عبر شبكة TRC20 فقط\n` +
      `⚠️ رسوم السحب: *5 بالمئة*\n` +
      `⏳ المعالجة: *من 2 إلى 7 أيام عمل*\n` +
      `🔑 الحد الأدنى: *${config.bot.minWithdrawal} USDT*\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `💰 *الرصيد الحالي:* ${fmt(user.balance)} USDT`;

    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', ...withdrawKeyboard() });
  } catch (err) {
    logger.error('handleWithdraw:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 1: اطلب المبلغ ────────────────────────────────────────────────────────
const handleWithdrawRequest = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) { await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك.'); return; }

    if (user.balance < config.bot.minWithdrawal) {
      await bot.sendMessage(chatId,
        `⚠️ *رصيدك غير كافٍ للسحب.*\n\n` +
        `الحد الأدنى: *${config.bot.minWithdrawal} USDT*\n` +
        `رصيدك الحالي: *${fmt(user.balance)} USDT*`,
        { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
          [{ text: '💰 إيداع', callback_data: 'deposit' }],
          [{ text: '🔙 رجوع', callback_data: 'back_main' }],
        ]}});
      return;
    }

    await setState(chatId, 'awaiting_withdrawal_amount');
    await bot.sendMessage(chatId,
      `💸 *طلب سحب*\n\n` +
      `💰 رصيدك: *${fmt(user.balance)} USDT*\n` +
      `🔑 الحد الأدنى: *${config.bot.minWithdrawal} USDT*\n\n` +
      `أدخل المبلغ الذي تريد سحبه:\n_مثال: 50_\n\nاضغط ❌ إلغاء للعودة.`,
      { parse_mode: 'Markdown', ...cancelKeyboard() });
  } catch (err) {
    logger.error('handleWithdrawRequest:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 2: استلام المبلغ → اطلب الشبكة ──────────────────────────────────────
const handleWithdrawAmountInput = async (bot, chatId, text) => {
  try {
    const amount = parseFloat(text.replace(/[,،\s$]/g, ''));

    if (isNaN(amount) || amount <= 0) {
      await bot.sendMessage(chatId, `⚠️ أدخل مبلغًا صحيحًا.`, { parse_mode: 'Markdown', ...cancelKeyboard() });
      return;
    }
    if (amount < config.bot.minWithdrawal) {
      await bot.sendMessage(chatId,
        `⚠️ الحد الأدنى *${config.bot.minWithdrawal} USDT*.`,
        { parse_mode: 'Markdown', ...cancelKeyboard() });
      return;
    }
    const user = await getUserById(chatId);
    if (!user) { await clearState(chatId); return; }
    if (amount > user.balance) {
      await bot.sendMessage(chatId,
        `⚠️ *رصيد غير كافٍ.*\n\nرصيدك: *${fmt(user.balance)} USDT*`,
        { parse_mode: 'Markdown', ...cancelKeyboard() });
      return;
    }

    // حفظ المبلغ في stateData والانتقال لطلب الشبكة
    await setState(chatId, 'awaiting_withdrawal_network', { amount });

    await bot.sendMessage(chatId,
      `💸 *المبلغ:* ${amount} USDT\n\nاختر شبكة السحب:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔵 TRC20 (TRON)',   callback_data: 'wnet_TRC20'  }],
            [{ text: '🟡 BEP20 (BSC)',     callback_data: 'wnet_BEP20'  }],
            [{ text: '🔴 ERC20 (ETH)',     callback_data: 'wnet_ERC20'  }],
            [{ text: '❌ إلغاء',           callback_data: 'back_main'   }],
          ],
        },
      });
  } catch (err) {
    logger.error('handleWithdrawAmountInput:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 3: اختار الشبكة → اطلب عنوان المحفظة ───────────────────────────────
const handleWithdrawNetworkSelected = async (bot, chatId, network, stateData) => {
  try {
    await setState(chatId, 'awaiting_withdrawal_address', { ...stateData, network });

    await bot.sendMessage(chatId,
      `🌐 *الشبكة:* ${network}\n\n` +
      `أدخل عنوان محفظتك للسحب:\n\n` +
      `⚠️ تأكد من أن العنوان صحيح ويدعم شبكة *${network}*\n\n` +
      `اضغط ❌ إلغاء للعودة.`,
      { parse_mode: 'Markdown', ...cancelKeyboard() });
  } catch (err) {
    logger.error('handleWithdrawNetworkSelected:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 4: استلام عنوان المحفظة → حفظ الطلب ─────────────────────────────────
const handleWithdrawAddressInput = async (bot, chatId, text, stateData) => {
  try {
    const walletAddress = text.trim();
    if (!walletAddress || walletAddress.length < 10) {
      await bot.sendMessage(chatId,
        `⚠️ عنوان غير صالح. أدخل عنوان محفظة صحيحًا.`,
        { parse_mode: 'Markdown', ...cancelKeyboard() });
      return;
    }

    await clearState(chatId);

    const { amount, network } = stateData;
    const fee       = parseFloat((amount * config.bot.withdrawalFee).toFixed(2));
    const netAmount = parseFloat((amount - fee).toFixed(2));

    const withdrawal = await createWithdrawalRequest({
      telegramId: chatId,
      amount,
      network,
      walletAddress,
    });

    await bot.sendMessage(chatId,
      `✅ *تم استلام طلب السحب!*\n\n` +
      `📤 المبلغ: *${amount} USDT*\n` +
      `💸 الرسوم (5%): *${fee} USDT*\n` +
      `💰 الصافي: *${netAmount} USDT*\n` +
      `🌐 الشبكة: *${network}*\n` +
      `📋 العنوان: \`${walletAddress}\`\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `🆔 رقم الطلب: \`${withdrawal._id}\`\n\n` +
      `_سيتم التحويل خلال 2-7 أيام عمل._`,
      { parse_mode: 'Markdown', ...afterWithdrawKeyboard() });
  } catch (err) {
    logger.error('handleWithdrawAddressInput:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── كيف يعمل ──────────────────────────────────────────────────────────────────
const handleHowItWorks = async (bot, chatId) => {
  try {
    await bot.sendMessage(chatId,
      `ℹ️ *كيف يعمل السحب؟*\n\n` +
      `🔹 *الشبكات المدعومة:* TRC20 / BEP20 / ERC20\n` +
      `🔹 *الرسوم:* 5 بالمئة من كل سحب\n` +
      `🔹 *المعالجة:* 2 إلى 7 أيام عمل\n` +
      `🔹 *الحد الأدنى:* ${config.bot.minWithdrawal} USDT\n\n` +
      `📞 للاستفسار تواصل مع الدعم الفني.`,
      { parse_mode: 'Markdown', ...backOnlyKeyboard() });
  } catch (err) {
    logger.error('handleHowItWorks:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = {
  handleWithdraw, handleWithdrawRequest,
  handleWithdrawAmountInput, handleWithdrawNetworkSelected,
  handleWithdrawAddressInput, handleHowItWorks,
};
