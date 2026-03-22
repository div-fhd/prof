'use strict';

const { findOrCreateUser, clearState } = require('../services/userService');

const { handleStart }                  = require('./handlers/startHandler');
const {
  handleDeposit,
  handleDepositConfirmStart,
  handleDepositAmountInput,
}                                      = require('./handlers/depositHandler');
const { handleProfitStart, handleProfitInput, handleAccountLevels } = require('./handlers/profitHandler');
const { handleMyAccount }              = require('./handlers/accountHandler');
const { handleBotStart, handleBotStop } = require('./handlers/botControlHandler');
const {
  handleWithdraw,
  handleWithdrawRequest,
  handleWithdrawAmountInput,
  handleHowItWorks,
}                                      = require('./handlers/withdrawHandler');
const { handleAccountStatement }       = require('./handlers/statementHandler');

const { mainMenuKeyboard, cancelKeyboard } = require('./keyboards');
const { mainMenuMsg, cancelMsg }           = require('./messages');
const config                               = require('../config');
const logger                               = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

const sendMainMenu = (bot, chatId) =>
  bot.sendMessage(chatId, mainMenuMsg(), {
    parse_mode: 'Markdown',
    ...mainMenuKeyboard(),
  });

const doCancel = async (bot, chatId) => {
  await clearState(chatId);
  await bot.sendMessage(chatId, cancelMsg(), {
    parse_mode: 'Markdown',
    ...mainMenuKeyboard(),
  });
};

// Wallet address display (non-URL links)
const sendWalletInfo = async (bot, chatId, index) => {
  const wallet = config.payment.wallets[index];
  if (!wallet) { await bot.sendMessage(chatId, '⚠️ المحفظة غير متاحة.'); return; }
  await bot.sendMessage(
    chatId,
    `💳 *${wallet.name}*\n\n` +
    `📋 *عنوان المحفظة:*\n` +
    `\`${wallet.link}\`\n\n` +
    `_انسخ العنوان وأرسل USDT إليه،\n` +
    `ثم اضغط *أرسلت الدفع* لتسجيل طلبك._`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ أرسلت الدفع — سجّل طلبي', callback_data: 'deposit_confirm' }],
          [{ text: '🔙 رجوع للإيداع', callback_data: 'deposit'   }],
          [{ text: '🔙 القائمة',       callback_data: 'back_main' }],
        ],
      },
    }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Register all handlers
// ─────────────────────────────────────────────────────────────────────────────

const registerHandlers = (bot) => {

  // ── /start ────────────────────────────────────────────────────────────────
  bot.onText(/\/start/, (msg) => handleStart(bot, msg));

  // ── Text messages ─────────────────────────────────────────────────────────
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const text   = msg.text.trim();

    let user;
    try {
      user = await findOrCreateUser(msg.from);
    } catch (err) {
      logger.error('findOrCreateUser failed:', err);
      return;
    }

    const state = user.state;

    // ── STATE: awaiting deposit amount ────────────────────────────────────
    if (state === 'awaiting_deposit_amount') {
      if (text === '❌ إلغاء') await doCancel(bot, chatId);
      else                     await handleDepositAmountInput(bot, chatId, text);
      return;
    }

    // ── STATE: awaiting profit capital ────────────────────────────────────
    if (state === 'awaiting_profit_amount') {
      if (text === '❌ إلغاء') await doCancel(bot, chatId);
      else                     await handleProfitInput(bot, chatId, text);
      return;
    }

    // ── STATE: awaiting withdrawal amount ─────────────────────────────────
    if (state === 'awaiting_withdrawal_amount') {
      if (text === '❌ إلغاء') await doCancel(bot, chatId);
      else                     await handleWithdrawAmountInput(bot, chatId, text);
      return;
    }

    // ── Main menu buttons ─────────────────────────────────────────────────
    switch (text) {
      case '💲 USDT':                 await handleDeposit(bot, chatId); break;
      case '📊 الأرباح المتوقعة':    await handleProfitStart(bot, chatId); break;
      case '👤 حسابي':               await handleMyAccount(bot, chatId); break;
      case '🔙 العودة للخلف':        await sendMainMenu(bot, chatId); break;
      case '❌ إلغاء':               await doCancel(bot, chatId); break;
      default:
        logger.debug(`Unhandled text from ${chatId}: "${text}"`);
        await sendMainMenu(bot, chatId);
    }
  });

  // ── Callback queries ──────────────────────────────────────────────────────
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data   = query.data;

    try { await bot.answerCallbackQuery(query.id); } catch (_) {}

    logger.debug(`Callback: ${data} from ${chatId}`);

    try {
      // wallet_info_N — non-URL wallet address
      if (data.startsWith('wallet_info_')) {
        const idx = parseInt(data.replace('wallet_info_', ''), 10);
        await sendWalletInfo(bot, chatId, idx);
        return;
      }

      switch (data) {
        case 'back_main':          await sendMainMenu(bot, chatId); break;
        case 'deposit':            await handleDeposit(bot, chatId); break;
        case 'deposit_confirm':    await handleDepositConfirmStart(bot, chatId); break;
        case 'recalculate_profit': await handleProfitStart(bot, chatId); break;
        case 'account_levels':     await handleAccountLevels(bot, chatId); break;
        case 'my_account':         await handleMyAccount(bot, chatId); break;
        case 'bot_start':          await handleBotStart(bot, chatId); break;
        case 'bot_stop':           await handleBotStop(bot, chatId); break;
        case 'withdraw':           await handleWithdraw(bot, chatId); break;
        case 'withdraw_request':   await handleWithdrawRequest(bot, chatId); break;
        case 'how_it_works':       await handleHowItWorks(bot, chatId); break;
        case 'account_statement':  await handleAccountStatement(bot, chatId); break;

        default:
          logger.warn(`Unknown callback: "${data}" from ${chatId}`);
          await bot.sendMessage(chatId, '⚠️ هذا الزر غير متاح حاليًا.', {
            reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_main' }]] },
          });
      }
    } catch (err) {
      logger.error(`Callback error [${data}] from ${chatId}:`, err.message);
      try {
        await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.', {
          reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_main' }]] },
        });
      } catch (_) {}
    }
  });

  // ── Polling errors — log only, do not crash ───────────────────────────────
  bot.on('polling_error', (err) => {
    const msg = err.message || String(err);
    if (/EFATAL|ECONNRESET|ETIMEDOUT|ENOTFOUND/.test(msg)) {
      logger.warn(`Polling blip (auto-recover): ${msg}`);
    } else {
      logger.error('Polling error:', msg);
    }
  });

  bot.on('error', (err) => logger.error('Bot error:', err.message || err));

  logger.info('All bot handlers registered.');
};

module.exports = { registerHandlers };
