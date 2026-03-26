'use strict';

const { findOrCreateUser, clearState } = require('../services/userService');

const { handleStart }           = require('./handlers/startHandler');
const {
  handleDeposit, handleWalletInfo,
  handleDepositConfirmStart, handleDepositNetworkSelected,
  handleDepositAmountInput,
}                               = require('./handlers/depositHandler');
const { handleProfitStart, handleProfitInput, handleAccountLevels } = require('./handlers/profitHandler');
const { handleMyAccount }       = require('./handlers/accountHandler');
const { handleBotStart, handleBotStop } = require('./handlers/botControlHandler');
const {
  handleWithdraw, handleWithdrawRequest,
  handleWithdrawAmountInput, handleWithdrawNetworkSelected,
  handleWithdrawAddressInput, handleHowItWorks,
}                               = require('./handlers/withdrawHandler');
const { handleAccountStatement } = require('./handlers/statementHandler');
const { handleTrading }          = require('./handlers/tradingHandler');
const { handleSupport }          = require('./handlers/supportHandler');
const { handleReferrals, handleReferralFriends } = require('./handlers/referralHandler');

const { mainMenuKeyboard, cancelKeyboard } = require('./keyboards');
const { mainMenuMsg, cancelMsg }           = require('./messages');
const logger                               = require('../utils/logger');

// ── Helpers ───────────────────────────────────────────────────────────────────
const sendMainMenu = (bot, chatId) =>
  bot.sendMessage(chatId, mainMenuMsg(), { parse_mode: 'Markdown', ...mainMenuKeyboard() });

const doCancel = async (bot, chatId) => {
  await clearState(chatId);
  await bot.sendMessage(chatId, cancelMsg(), { parse_mode: 'Markdown', ...mainMenuKeyboard() });
};

// ── Register ──────────────────────────────────────────────────────────────────
const registerHandlers = (bot) => {

  bot.onText(/\/start/, (msg) => handleStart(bot, msg));

  // ── Messages ────────────────────────────────────────────────────────────────
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;
    const text   = msg.text.trim();

    let user;
    try { user = await findOrCreateUser(msg.from); }
    catch (err) { logger.error('findOrCreateUser:', err); return; }

    const state     = user.state;
    const stateData = user.stateData || {};

    // ── الحالات الانتظارية ────────────────────────────────────────────────
    if (state === 'awaiting_deposit_amount') {
      if (text === '❌ إلغاء') await doCancel(bot, chatId);
      else                     await handleDepositAmountInput(bot, chatId, text, stateData);
      return;
    }
    if (state === 'awaiting_profit_amount') {
      if (text === '❌ إلغاء') await doCancel(bot, chatId);
      else                     await handleProfitInput(bot, chatId, text);
      return;
    }
    if (state === 'awaiting_withdrawal_amount') {
      if (text === '❌ إلغاء') await doCancel(bot, chatId);
      else                     await handleWithdrawAmountInput(bot, chatId, text);
      return;
    }
    if (state === 'awaiting_withdrawal_address') {
      if (text === '❌ إلغاء') await doCancel(bot, chatId);
      else                     await handleWithdrawAddressInput(bot, chatId, text, stateData);
      return;
    }

    // ── القائمة الرئيسية ─────────────────────────────────────────────────
    switch (text) {
      // case '💲 USDT':                  await handleDeposit(bot, chatId);      break;
      case '📊 الأرباح المتوقعة':     await handleProfitStart(bot, chatId);  break;
      case '📈 التداول':              await handleTrading(bot, chatId);       break;
      case '👤 حسابي':                await handleMyAccount(bot, chatId);     break;
      case '🎁 الإحالات':             await handleReferrals(bot, chatId);     break;
      case '🆘 الدعم':                await handleSupport(bot, chatId);       break;
      case '🔙 العودة للخلف':         await sendMainMenu(bot, chatId);        break;
      case '❌ إلغاء':                await doCancel(bot, chatId);            break;
      default:
        logger.debug(`Unhandled text from ${chatId}: "${text}"`);
        await sendMainMenu(bot, chatId);
    }
  });

  // ── Callbacks ─────────────────────────────────────────────────────────────
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data   = query.data;

    try { await bot.answerCallbackQuery(query.id); } catch (_) {}

    logger.debug(`Callback: ${data} from ${chatId}`);

    // جلب المستخدم لأي callback يحتاج stateData
    let user;
    try { user = await findOrCreateUser(query.from); } catch (_) {}
    const stateData = user?.stateData || {};

    try {
      // wallet_info_N — عرض عنوان المحفظة
      if (data.startsWith('wallet_info_')) {
        const idx = parseInt(data.replace('wallet_info_', ''), 10);
        await handleWalletInfo(bot, chatId, idx);
        return;
      }

      // deposit_network_N — اختيار الشبكة عند الإيداع
      if (data.startsWith('deposit_network_')) {
        const idx = parseInt(data.replace('deposit_network_', ''), 10);
        await handleDepositNetworkSelected(bot, chatId, idx);
        return;
      }

      // wnet_NETWORK — اختيار شبكة السحب
      if (data.startsWith('wnet_')) {
        const network = data.replace('wnet_', '');
        await handleWithdrawNetworkSelected(bot, chatId, network, stateData);
        return;
      }

      switch (data) {
        case 'back_main':          await sendMainMenu(bot, chatId);         break;
        case 'deposit':            await handleDeposit(bot, chatId);        break;
        case 'deposit_confirm':    await handleDepositConfirmStart(bot, chatId); break;
        case 'recalculate_profit': await handleProfitStart(bot, chatId);    break;
        case 'account_levels':     await handleAccountLevels(bot, chatId);  break;
        case 'my_account':         await handleMyAccount(bot, chatId);      break;
        case 'bot_start':          await handleBotStart(bot, chatId);       break;
        case 'bot_stop':           await handleBotStop(bot, chatId);        break;
        case 'withdraw':           await handleWithdraw(bot, chatId);       break;
        case 'withdraw_request':   await handleWithdrawRequest(bot, chatId);break;
        case 'how_it_works':       await handleHowItWorks(bot, chatId);     break;
        case 'account_statement':  await handleAccountStatement(bot, chatId);break;
        case 'trading':            await handleTrading(bot, chatId);        break;
        case 'support':            await handleSupport(bot, chatId);        break;
        case 'referrals':          await handleReferrals(bot, chatId);      break;
        case 'referral_friends':   await handleReferralFriends(bot, chatId);break;

        default:
          logger.warn(`Unknown callback: "${data}" from ${chatId}`);
          await bot.sendMessage(chatId, '⚠️ هذا الزر غير متاح حاليًا.', {
            reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_main' }]] },
          });
      }
    } catch (err) {
      logger.error(`Callback error [${data}]:`, err.message);
      try {
        await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى.', {
          reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'back_main' }]] },
        });
      } catch (_) {}
    }
  });

  bot.on('polling_error', (err) => {
    const msg = err.message || String(err);
    if (/EFATAL|ECONNRESET|ETIMEDOUT|ENOTFOUND/.test(msg)) logger.warn(`Polling blip: ${msg}`);
    else logger.error('Polling error:', msg);
  });

  bot.on('error', (err) => logger.error('Bot error:', err.message || err));

  logger.info('All bot handlers registered.');
};

module.exports = { registerHandlers };
