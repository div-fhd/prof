'use strict';
const { getUserById, setState, clearState } = require('../../services/userService');
const { createDepositRecord }               = require('../../services/depositService');
const { depositKeyboard, cancelKeyboard }   = require('../keyboards');
const config = require('../../config');
const logger = require('../../utils/logger');

// ── Step 1: شاشة الإيداع ─────────────────────────────────────────────────────
const handleDeposit = async (bot, chatId) => {
  try {
    await bot.sendMessage(chatId,
      `💲 *إيداع رأس المال* 💲\n\n` +
      `💰 *الرسوم:* 5 بالمئة\n` +
      `⚙️ *المعالجة:* تلقائية\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `📌 *تعليمات الإيداع:*\n` +
      `• اضغط على الشبكة لعرض عنوان المحفظة\n` +
      `• انسخ العنوان وأرسل USDT إليه\n` +
      `• بعد الإرسال اضغط *أرسلت الدفع* لتسجيل طلبك\n\n` +
      `👇 *اختر الشبكة:*`,
      { parse_mode: 'Markdown', ...depositKeyboard() });
  } catch (err) {
    logger.error('handleDeposit:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── عرض عنوان المحفظة ────────────────────────────────────────────────────────
const handleWalletInfo = async (bot, chatId, walletIndex) => {
  try {
    const wallet = config.payment.wallets[walletIndex];
    if (!wallet) { await bot.sendMessage(chatId, '⚠️ المحفظة غير متاحة حالياً.'); return; }

    const address = wallet.address || wallet.link;

    await bot.sendMessage(chatId,
      `💳 *${wallet.name}*\n\n` +
      `🌐 *الشبكة:* ${wallet.network}\n\n` +
      `📋 *عنوان المحفظة:*\n` +
      `\`${address}\`\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `⚠️ *تحذير مهم:*\n` +
      `• أرسل فقط عبر شبكة *${wallet.network}*\n` +
      `• أي شبكة أخرى تؤدي لفقدان الأموال\n` +
      `• احتفظ بإيصال التحويل\n\n` +
      `_بعد الإرسال اضغط الزر أدناه لتسجيل طلبك_`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
        [{ text: '✅ أرسلت الدفع — سجّل طلبي', callback_data: 'deposit_confirm' }],
        [{ text: '🔙 رجوع للإيداع', callback_data: 'deposit'   }],
        [{ text: '🔙 القائمة',       callback_data: 'back_main' }],
      ]}});
  } catch (err) {
    logger.error('handleWalletInfo:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 2: اختيار الشبكة ────────────────────────────────────────────────────
const handleDepositConfirmStart = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) { await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك. اضغط /start أولاً.'); return; }

    const networkButtons = config.payment.wallets.map((w, i) => [
      { text: w.name, callback_data: `deposit_network_${i}` },
    ]);

    await bot.sendMessage(chatId,
      `✅ *تأكيد الإيداع*\n\nاختر الشبكة التي أرسلت عبرها:`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
        ...networkButtons,
        [{ text: '❌ إلغاء', callback_data: 'deposit' }],
      ]}});
  } catch (err) {
    logger.error('handleDepositConfirmStart:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 3: اختيار الشبكة → اطلب المبلغ ─────────────────────────────────────
const handleDepositNetworkSelected = async (bot, chatId, walletIndex) => {
  try {
    const wallet = config.payment.wallets[walletIndex];
    if (!wallet) { await bot.sendMessage(chatId, '⚠️ شبكة غير متاحة.'); return; }

    await setState(chatId, 'awaiting_deposit_amount', { network: wallet.network, walletIndex });

    await bot.sendMessage(chatId,
      `✅ *شبكة:* ${wallet.network}\n\n` +
      `أدخل المبلغ الذي أرسلته بالدولار (USDT):\n\n` +
      `_مثال: 100 أو 500_\n\nاضغط ❌ إلغاء للعودة.`,
      { parse_mode: 'Markdown', ...cancelKeyboard() });
  } catch (err) {
    logger.error('handleDepositNetworkSelected:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 4: استلام المبلغ → حفظ (بدون رسالة مكررة — notifyService يرسل)  ────
const handleDepositAmountInput = async (bot, chatId, text, stateData) => {
  try {
    const raw    = text.replace(/[,،\s$]/g, '');
    const amount = parseFloat(raw);

    if (isNaN(amount) || amount <= 0) {
      await bot.sendMessage(chatId,
        `⚠️ *قيمة غير صالحة.*\n\nأدخل مبلغًا صحيحًا موجبًا.\n_مثال: 100_`,
        { parse_mode: 'Markdown', ...cancelKeyboard() });
      return;
    }
    if (amount < 10) {
      await bot.sendMessage(chatId,
        `⚠️ الحد الأدنى للإيداع هو *10 USDT*.`,
        { parse_mode: 'Markdown', ...cancelKeyboard() });
      return;
    }
    if (amount > 1_000_000) {
      await bot.sendMessage(chatId,
        `⚠️ الحد الأقصى *1,000,000 USDT*.`,
        { parse_mode: 'Markdown', ...cancelKeyboard() });
      return;
    }

    await clearState(chatId);
    const network = stateData?.network || 'TRC20';

    // createDepositRecord يستدعي notifyService.onDepositCreated داخلياً
    await createDepositRecord({ telegramId: chatId, amount, network });

  } catch (err) {
    logger.error('handleDepositAmountInput:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = {
  handleDeposit, handleWalletInfo,
  handleDepositConfirmStart, handleDepositNetworkSelected,
  handleDepositAmountInput,
};
