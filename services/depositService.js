'use strict';
const { DepositRecord, User } = require('../models');
const { logStatement }        = require('./userService');
const config                  = require('../config');
const logger                  = require('../utils/logger');

/**
 * Record a deposit request (pending – admin approves later).
 */
const createDepositRecord = async ({ telegramId, amount, network = 'TRC20' }) => {
  const fee       = parseFloat((amount * config.bot.depositFee).toFixed(2));
  const netAmount = parseFloat((amount - fee).toFixed(2));

  const deposit = await DepositRecord.create({
    telegramId: String(telegramId),
    amount,
    fee,
    netAmount,
    paymentMethod: 'USDT',
    network,
    status: 'pending',
  });

  await logStatement({
    telegramId,
    type:          'deposit',
    amount,
    description:   `Deposit request ${amount} USDT`,
    descriptionAr: `💰 طلب إيداع: ${amount} USDT (قيد المراجعة)`,
    referenceId:   deposit._id.toString(),
    status:        'pending',
  });

  logger.info(`Deposit created: ${telegramId} — ${amount} USDT`);
  return deposit;
};

/**
 * Admin: approve deposit → credit balance.
 */
const approveDeposit = async (depositId) => {
  const deposit = await DepositRecord.findById(depositId);
  if (!deposit) throw new Error('Deposit not found');
  if (deposit.status !== 'pending') throw new Error('Already processed');

  deposit.status = 'completed';
  await deposit.save();

  const user = await User.findOne({ telegramId: deposit.telegramId });
  if (user) {
    const before = user.balance;
    user.balance       += deposit.netAmount;
    user.totalDeposits += deposit.amount;
    await user.save();
    await user.recalculateLevel();

    await logStatement({
      telegramId:   deposit.telegramId,
      type:         'deposit',
      amount:       deposit.netAmount,
      balanceBefore: before,
      balanceAfter:  user.balance,
      description:   `Deposit approved ${deposit.amount} USDT`,
      descriptionAr: `✅ تم قبول الإيداع: ${deposit.amount} USDT`,
      referenceId:   deposit._id.toString(),
      status:        'completed',
    });
  }

  return { deposit, user };
};

const getUserDeposits = (telegramId) =>
  DepositRecord.find({ telegramId: String(telegramId) }).sort({ createdAt: -1 }).limit(10);

module.exports = { createDepositRecord, approveDeposit, getUserDeposits };
