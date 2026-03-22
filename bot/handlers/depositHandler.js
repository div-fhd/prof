'use strict';
const { getUserById, setState, clearState, logStatement } = require('../../services/userService');
const { createDepositRecord }  = require('../../services/depositService');
const { depositKeyboard, cancelKeyboard, backOnlyKeyboard } = require('../keyboards');
const config = require('../../config');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
//  Step 1 — show deposit info + wallet buttons + "أرسلت الدفع" button
// ─────────────────────────────────────────────────────────────────────────────
const handleDeposit = async (bot, chatId) => {
  try {
    const msg =
      `💲 *إيداع رأس المال* 💲\n\n` +
      `💰 *الرسوم:* 5 بالمئة\n` +
      `⚙️ *المعالجة:* تلقائية\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `📌 *تعليمات الإيداع:*\n` +
      `• أرسل USDT عبر الشبكة المحددة فقط\n` +
      `• احتفظ بإيصال التحويل\n` +
      `• بعد الإرسال اضغط *أرسلت الدفع* لتسجيل طلبك\n\n` +
      `👇 *اختر محفظة الدفع:*`;

    await bot.sendMessage(chatId, msg, {
      parse_mode: 'Markdown',
      ...depositKeyboard(),
    });
  } catch (err) {
    logger.error('handleDeposit:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Step 2 — user taps "أرسلت الدفع" → ask for amount
// ─────────────────────────────────────────────────────────────────────────────
const handleDepositConfirmStart = async (bot, chatId) => {
  try {
    const user = await getUserById(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '⚠️ لم يتم العثور على حسابك. اضغط /start أولاً.');
      return;
    }

    await setState(chatId, 'awaiting_deposit_amount');

    await bot.sendMessage(
      chatId,
      `✅ *تأكيد الإيداع*\n\n` +
      `أدخل المبلغ الذي أرسلته بالدولار (USDT):\n\n` +
      `_مثال: 100 أو 500_\n\n` +
      `اضغط ❌ إلغاء للعودة.`,
      {
        parse_mode: 'Markdown',
        ...cancelKeyboard(),
      }
    );
  } catch (err) {
    logger.error('handleDepositConfirmStart:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Step 3 — receive amount, validate, save pending deposit record
// ─────────────────────────────────────────────────────────────────────────────
const handleDepositAmountInput = async (bot, chatId, text) => {
  try {
    const raw    = text.replace(/[,،\s$]/g, '');
    const amount = parseFloat(raw);

    if (isNaN(amount) || amount <= 0) {
      await bot.sendMessage(
        chatId,
        `⚠️ *قيمة غير صالحة.*\n\nأدخل مبلغًا صحيحًا موجبًا.\n_مثال: 100_`,
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      return;
    }

    if (amount < 10) {
      await bot.sendMessage(
        chatId,
        `⚠️ الحد الأدنى للإيداع هو *10 USDT*.`,
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      return;
    }

    if (amount > 1_000_000) {
      await bot.sendMessage(
        chatId,
        `⚠️ الحد الأقصى للإيداع هو *1,000,000 USDT*.`,
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      return;
    }

    // Clear state and save deposit record
    await clearState(chatId);

    const fee       = parseFloat((amount * config.bot.depositFee).toFixed(2));
    const netAmount = parseFloat((amount - fee).toFixed(2));

    const deposit = await createDepositRecord({ telegramId: chatId, amount });

    await bot.sendMessage(
      chatId,
      `📨 *تم استلام طلب الإيداع!*\n\n` +
      `💵 المبلغ المرسل: *${amount} USDT*\n` +
      `💸 الرسوم (5%): *${fee} USDT*\n` +
      `💰 الصافي بعد الرسوم: *${netAmount} USDT*\n\n` +
      `➖➖➖➖➖➖➖➖\n` +
      `🆔 *رقم الطلب:* ${deposit._id}\n\n` +
      `⏳ *الحالة:* قيد المراجعة\n\n` +
      `_سيتم مراجعة طلبك من قِبل الإدارة وإضافة الرصيد خلال وقت قصير._`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '👤 عرض حسابي', callback_data: 'my_account' }],
            [{ text: '🔙 القائمة',   callback_data: 'back_main'  }],
          ],
        },
      }
    );

    logger.info(`Deposit request saved: ${chatId} — ${amount} USDT (id: ${deposit._id})`);
  } catch (err) {
    logger.error('handleDepositAmountInput:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleDeposit, handleDepositConfirmStart, handleDepositAmountInput };
