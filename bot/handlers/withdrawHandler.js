'use strict';
const { getUserById, setState, clearState } = require('../../services/userService');
const { createWithdrawalRequest }           = require('../../services/withdrawalService');
const { withdrawKeyboard, cancelKeyboard, backOnlyKeyboard } = require('../keyboards');
const config = require('../../config');
const logger = require('../../utils/logger');

const fmt  = (n) => Number(n || 0).toFixed(2);
const fmtH = (h) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh} ساعة و${mm} دقيقة` : `${hh} ساعة`;
};

// ── شاشة السحب الرئيسية ──────────────────────────────────────────────────────
const handleWithdraw = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) { await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك.'); return; }

    await bot.sendMessage(chatId,
      `💸 *سحب الأموال* 💸\n\n` +
      `⚠️ *رسوم السحب:* 5 بالمئة\n` +
      `🔑 *الحد الأدنى:* ${config.bot.minWithdrawal} USDT\n` +
      `🛑 *شرط السحب:* أوقف البوت 12 ساعة قبل طلب السحب\n` +
      `⏳ *مدة المعالجة:* من 24 إلى 48 ساعة\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `💰 *الرصيد الحالي:* ${fmt(user.balance)} USDT\n` +
      `🤖 *حالة البوت:* ${user.botStatus === 'active' ? '🟢 نشط' : '🔴 متوقف'}`,
      { parse_mode: 'Markdown', ...withdrawKeyboard() });
  } catch (err) {
    logger.error('handleWithdraw:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 1: التحقق من الشروط → اطلب المبلغ ──────────────────────────────────
const handleWithdrawRequest = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) { await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك.'); return; }

    // شرط 1: الرصيد كافٍ
    if (user.balance < config.bot.minWithdrawal) {
      await bot.sendMessage(chatId,
        `⚠️ *رصيدك غير كافٍ للسحب*\n\n` +
        `الحد الأدنى: *${config.bot.minWithdrawal} USDT*\n` +
        `رصيدك الحالي: *${fmt(user.balance)} USDT*`,
        { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
          [{ text: '💰 إيداع', callback_data: 'deposit'   }],
          [{ text: '🔙 رجوع',  callback_data: 'back_main' }],
        ]}});
      return;
    }

    // شرط 2: البوت متوقف
    if (user.botStatus === 'active') {
      await bot.sendMessage(chatId,
        `🛑 *يجب إيقاف البوت قبل السحب*\n\n` +
        `لضمان سلامة صفقاتك المفتوحة، يجب إيقاف البوت\n` +
        `وانتظار *12 ساعة* قبل تقديم طلب السحب.\n\n` +
        `_هذا يضمن إغلاق جميع الصفقات بأمان._`,
        { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
          [{ text: '⏹️ إيقاف البوت الآن', callback_data: 'bot_stop'  }],
          [{ text: '🔙 رجوع',              callback_data: 'back_main' }],
        ]}});
      return;
    }

    // شرط 3: مرت 12 ساعة على الإيقاف
    if (!user.canWithdraw()) {
      const remaining = user.hoursUntilWithdraw();
      await bot.sendMessage(chatId,
        `⏳ *يرجى الانتظار قليلاً*\n\n` +
        `يجب مرور *12 ساعة* بعد إيقاف البوت لضمان\n` +
        `إغلاق جميع الصفقات المفتوحة بشكل آمن.\n\n` +
        `➖➖➖➖➖➖➖➖\n` +
        `🕐 *الوقت المتبقي:* ${fmtH(remaining)}\n\n` +
        `_ستتمكن من السحب بعد اكتمال هذه المدة._`,
        { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
          [{ text: '👤 حسابي', callback_data: 'my_account' }],
          [{ text: '🔙 رجوع',  callback_data: 'back_main'  }],
        ]}});
      return;
    }

    await setState(chatId, 'awaiting_withdrawal_amount');
    await bot.sendMessage(chatId,
      `💸 *طلب سحب*\n\n` +
      `💰 رصيدك: *${fmt(user.balance)} USDT*\n` +
      `🔑 الحد الأدنى: *${config.bot.minWithdrawal} USDT*\n\n` +
      `⚠️ _إذا أصبح رصيدك بعد السحب أقل من 10 USDT سيتوقف البوت تلقائياً._\n\n` +
      `أدخل المبلغ الذي تريد سحبه:\n_مثال: 50_\n\nاضغط ❌ إلغاء للعودة.`,
      { parse_mode: 'Markdown', ...cancelKeyboard() });
  } catch (err) {
    logger.error('handleWithdrawRequest:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 2: التحقق من المبلغ → اطلب الشبكة ──────────────────────────────────
const handleWithdrawAmountInput = async (bot, chatId, text) => {
  try {
    const amount = parseFloat(text.replace(/[,،\s$]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      await bot.sendMessage(chatId, `⚠️ أدخل مبلغًا صحيحًا.`, { parse_mode: 'Markdown', ...cancelKeyboard() });
      return;
    }
    if (amount < config.bot.minWithdrawal) {
      await bot.sendMessage(chatId, `⚠️ الحد الأدنى *${config.bot.minWithdrawal} USDT*.`, { parse_mode: 'Markdown', ...cancelKeyboard() });
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

    // تحذير إذا الرصيد المتبقي سيكون أقل من 10
    const remaining = user.balance - amount;
    const warning = remaining < 10 && remaining > 0
      ? `\n\n⚠️ _رصيدك بعد السحب سيكون ${fmt(remaining)} USDT وسيتوقف البوت تلقائياً._`
      : '';

    await setState(chatId, 'awaiting_withdrawal_network', { amount });
    await bot.sendMessage(chatId,
      `💸 *المبلغ:* ${amount} USDT${warning}\n\nاختر شبكة السحب:`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
        [{ text: '🔵 TRC20 (TRON)', callback_data: 'wnet_TRC20' }],
        [{ text: '🟡 BEP20 (BSC)',  callback_data: 'wnet_BEP20' }],
        [{ text: '🔴 ERC20 (ETH)',  callback_data: 'wnet_ERC20' }],
        [{ text: '❌ إلغاء',        callback_data: 'back_main'  }],
      ]}});
  } catch (err) {
    logger.error('handleWithdrawAmountInput:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 3: اختيار الشبكة ────────────────────────────────────────────────────
const handleWithdrawNetworkSelected = async (bot, chatId, network, stateData) => {
  try {
    await setState(chatId, 'awaiting_withdrawal_address', { ...stateData, network });
    await bot.sendMessage(chatId,
      `🌐 *الشبكة:* ${network}\n\n` +
      `أدخل عنوان محفظتك للسحب:\n\n` +
      `⚠️ تأكد أن العنوان صحيح ويدعم شبكة *${network}*\n\nاضغط ❌ إلغاء للعودة.`,
      { parse_mode: 'Markdown', ...cancelKeyboard() });
  } catch (err) {
    logger.error('handleWithdrawNetworkSelected:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 4: استلام العنوان → حفظ ─────────────────────────────────────────────
const handleWithdrawAddressInput = async (bot, chatId, text, stateData) => {
  try {
    const walletAddress = text.trim();
    if (!walletAddress || walletAddress.length < 10) {
      await bot.sendMessage(chatId, `⚠️ عنوان غير صالح.`, { parse_mode: 'Markdown', ...cancelKeyboard() });
      return;
    }
    await clearState(chatId);
    const { amount, network } = stateData;
    await createWithdrawalRequest({ telegramId: chatId, amount, network, walletAddress });
  } catch (err) {
    logger.error('handleWithdrawAddressInput:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── كيف يعمل السحب ───────────────────────────────────────────────────────────
const handleHowItWorks = async (bot, chatId) => {
  try {
    await bot.sendMessage(chatId,
      `ℹ️ *كيف يعمل السحب؟*\n\n` +
      `🔹 *الشبكات المدعومة:* TRC20 / BEP20 / ERC20\n` +
      `🔹 *الرسوم:* 5 بالمئة من كل سحب\n` +
      `🔹 *الحد الأدنى:* ${config.bot.minWithdrawal} USDT\n` +
      `🔹 *شرط الإيقاف:* أوقف البوت 12 ساعة قبل طلب السحب\n` +
      `🔹 *مدة المعالجة:* من 24 إلى 48 ساعة\n\n` +
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