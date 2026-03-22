'use strict';
const { setState, clearState, logStatement } = require('../../services/userService');
const { buildProfitMessage }                  = require('../../services/profitService');
const { cancelKeyboard, profitKeyboard, accountLevelsKeyboard } = require('../keyboards');
const { askCapitalMsg, accountLevelsMsg }     = require('../messages');
const logger                                  = require('../../utils/logger');

// ── Step 1: ask user for capital amount ──────────────────────────────────────
const handleProfitStart = async (bot, chatId) => {
  try {
    await setState(chatId, 'awaiting_profit_amount');
    await bot.sendMessage(chatId, askCapitalMsg(), {
      parse_mode: 'Markdown',
      ...cancelKeyboard(),
    });
  } catch (err) {
    logger.error('handleProfitStart:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Step 2: receive amount, validate, calculate, reply ───────────────────────
const handleProfitInput = async (bot, chatId, text) => {
  try {
    // Strip commas, spaces, currency symbols
    const raw     = text.replace(/[,،\s$]/g, '');
    const capital = parseFloat(raw);

    if (isNaN(capital) || capital <= 0) {
      await bot.sendMessage(
        chatId,
        `⚠️ *رقم غير صالح*\n\nيرجى إدخال رقم موجب فقط.\n_مثال: 500 أو 1000_`,
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      return;
    }

    if (capital > 10_000_000) {
      await bot.sendMessage(
        chatId,
        `⚠️ الحد الأقصى المسموح به هو *10,000,000 USDT*.`,
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      return;
    }

    // All good — clear state and reply with results
    await clearState(chatId);

    await logStatement({
      telegramId:   chatId,
      type:         'profit_estimate',
      amount:       capital,
      description:  `Profit estimate for ${capital} USDT`,
      descriptionAr:`📊 تقدير الأرباح لرأس مال: ${capital} USDT`,
    });

    const message = buildProfitMessage(capital);

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...profitKeyboard(),
    });
  } catch (err) {
    logger.error('handleProfitInput:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

// ── Account levels screen ────────────────────────────────────────────────────
const handleAccountLevels = async (bot, chatId) => {
  try {
    await bot.sendMessage(chatId, accountLevelsMsg(), {
      parse_mode: 'Markdown',
      ...accountLevelsKeyboard(),
    });
  } catch (err) {
    logger.error('handleAccountLevels:', err);
    await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
};

module.exports = { handleProfitStart, handleProfitInput, handleAccountLevels };
