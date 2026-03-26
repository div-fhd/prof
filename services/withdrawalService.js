'use strict';
const { WithdrawalRequest, User } = require('../models');
const { logStatement }            = require('./userService');
const notify                      = require('./notifyService');
const config                      = require('../config');
const logger                      = require('../utils/logger');

/** تسجيل طلب سحب جديد */
const createWithdrawalRequest = async ({ telegramId, amount, network = 'TRC20', walletAddress = null }) => {
  const fee       = parseFloat((amount * config.bot.withdrawalFee).toFixed(2));
  const netAmount = parseFloat((amount - fee).toFixed(2));

  const withdrawal = await WithdrawalRequest.create({
    telegramId: String(telegramId),
    amount, fee, netAmount,
    network, walletAddress,
    status: 'pending',
  });

  const user = await User.findOne({ telegramId: String(telegramId) });

  await logStatement({
    telegramId,
    type:          'withdrawal',
    amount,
    balanceBefore: user ? user.balance : 0,
    balanceAfter:  user ? user.balance : 0,
    description:   `Withdrawal request ${amount} USDT`,
    descriptionAr: `💸 طلب سحب: ${amount} USDT (قيد المراجعة)`,
    referenceId:   withdrawal._id.toString(),
    status:        'pending',
  });

  // إشعار: تم استلام الطلب
  await notify.onWithdrawalCreated(telegramId, withdrawal);

  logger.info(`Withdrawal created: ${telegramId} — ${amount} USDT — wallet: ${walletAddress}`);
  return withdrawal;
};

/** الأدمن ينفذ السحب → يُخصم الرصيد */
const completeWithdrawal = async (withdrawalId) => {
  const w = await WithdrawalRequest.findById(withdrawalId);
  if (!w) throw new Error('Withdrawal not found');
  if (w.status !== 'pending' && w.status !== 'processing') throw new Error('Already processed');

  w.status      = 'completed';
  w.processedAt = new Date();
  await w.save();

  const user = await User.findOne({ telegramId: w.telegramId });
  if (user) {
    const before = user.balance;
    user.balance          = Math.max(0, user.balance - w.amount);
    user.totalWithdrawals += w.amount;
    await user.save();
    await user.recalculateLevel();

    await logStatement({
      telegramId:    w.telegramId,
      type:          'withdrawal',
      amount:        w.amount,
      balanceBefore: before,
      balanceAfter:  user.balance,
      description:   `Withdrawal completed ${w.amount} USDT`,
      descriptionAr: `✅ تم تنفيذ السحب: ${w.amount} USDT`,
      referenceId:   w._id.toString(),
      status:        'completed',
    });

    // إشعار: تم التنفيذ
    await notify.onWithdrawalCompleted(w.telegramId, w, user);
  }

  return { withdrawal: w, user };
};

/** الأدمن يرفض السحب */
const rejectWithdrawal = async (withdrawalId, reason = '') => {
  const w = await WithdrawalRequest.findById(withdrawalId);
  if (!w) throw new Error('Withdrawal not found');
  if (w.status !== 'pending' && w.status !== 'processing') throw new Error('Already processed');

  w.status          = 'rejected';
  w.rejectionReason = reason || 'Rejected by admin';
  w.processedAt     = new Date();
  await w.save();

  // إشعار: تم الرفض
  await notify.onWithdrawalRejected(w.telegramId, w, reason);

  return { withdrawal: w };
};

const getUserWithdrawals = (telegramId) =>
  WithdrawalRequest.find({ telegramId: String(telegramId) }).sort({ createdAt: -1 }).limit(10);

module.exports = { createWithdrawalRequest, completeWithdrawal, rejectWithdrawal, getUserWithdrawals };
