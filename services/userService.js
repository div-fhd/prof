'use strict';
const { User, AccountStatement, BotState } = require('../models');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
//  User CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find or create user from Telegram `msg.from` object.
 * Seeds balance from env on first creation.
 */
const findOrCreateUser = async (telegramUser) => {
  const id = String(telegramUser.id);

  let user = await User.findOne({ telegramId: id });

  if (!user) {
    const { seedBalance } = require('../config').bot;

    user = await User.create({
      telegramId:  id,
      username:    telegramUser.username  || null,
      firstName:   telegramUser.first_name || '',
      lastName:    telegramUser.last_name  || '',
      balance:     seedBalance || 0,
      botStatus:   'stopped',
      accountLevel: 1,
    });

    // Ensure BotState row exists
    await BotState.create({ telegramId: id }).catch(() => {});

    // First statement
    await _logStatement({
      telegramId:   id,
      type:         'system',
      description:  'User registered',
      descriptionAr:'🎉 تسجيل المستخدم في المنصة',
      balanceBefore: 0,
      balanceAfter:  user.balance,
    });

    logger.info(`New user: ${id} (${telegramUser.username})`);
  } else {
    // Keep profile fresh
    user.username    = telegramUser.username    || user.username;
    user.firstName   = telegramUser.first_name  || user.firstName;
    user.lastName    = telegramUser.last_name   || user.lastName;
    user.lastActivity = new Date();
    await user.save();
  }

  return user;
};

const getUserById = async (telegramId) =>
  User.findOne({ telegramId: String(telegramId) });

// ─────────────────────────────────────────────────────────────────────────────
//  Conversation state machine
// ─────────────────────────────────────────────────────────────────────────────

/** Set named state, optionally with payload data */
const setState = async (telegramId, state, stateData = null) =>
  User.updateOne({ telegramId: String(telegramId) }, { state, stateData });

/** Clear state */
const clearState = async (telegramId) =>
  User.updateOne({ telegramId: String(telegramId) }, { state: null, stateData: null });

// ─────────────────────────────────────────────────────────────────────────────
//  Bot control
// ─────────────────────────────────────────────────────────────────────────────

const setBotStatus = async (telegramId, status) => {
  const user = await getUserById(telegramId);
  if (!user) throw new Error('User not found');

  user.botStatus = status;
  await user.save();

  const botUpdate =
    status === 'active'
      ? { status, startedAt: new Date(), currentSessionStart: new Date(), tradingPausedForWithdrawal: false }
      : { status, stoppedAt: new Date(), currentSessionStart: null };

  await BotState.updateOne({ telegramId: String(telegramId) }, botUpdate, { upsert: true });

  await _logStatement({
    telegramId,
    type:          status === 'active' ? 'bot_started' : 'bot_stopped',
    description:   `Bot ${status}`,
    descriptionAr: status === 'active' ? '▶️ تم تشغيل البوت' : '⏹️ تم إيقاف البوت',
    balanceBefore: user.balance,
    balanceAfter:  user.balance,
  });

  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Account level auto-upgrade
// ─────────────────────────────────────────────────────────────────────────────

const recalculateLevel = async (user) => {
  const levels = require('../config').accountLevels;
  let newLevel = 1;
  for (const l of levels) {
    if (user.balance >= l.minBalance) newLevel = l.level;
  }

  if (newLevel !== user.accountLevel) {
    const old = user.accountLevel;
    user.accountLevel = newLevel;
    await user.save();

    await _logStatement({
      telegramId:   user.telegramId,
      type:         'level_upgrade',
      description:  `Level ${old} → ${newLevel}`,
      descriptionAr:`⬆️ ترقية المستوى من ${old} إلى ${newLevel}`,
      balanceBefore: user.balance,
      balanceAfter:  user.balance,
    });
  }
  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Account statements
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public: create a statement entry. All handlers call this.
 */
const logStatement = async (opts) => _logStatement(opts);

const _logStatement = async ({
  telegramId,
  type,
  amount        = 0,
  balanceBefore = 0,
  balanceAfter  = 0,
  description,
  descriptionAr = '',
  referenceId   = null,
  status        = 'completed',
}) => {
  try {
    return await AccountStatement.create({
      telegramId: String(telegramId),
      type,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      descriptionAr,
      referenceId,
      status,
    });
  } catch (err) {
    logger.warn('logStatement failed (non-fatal):', err.message);
  }
};

const getStatements = async (telegramId, limit = 10) =>
  AccountStatement.find({ telegramId: String(telegramId) })
    .sort({ createdAt: -1 })
    .limit(limit);

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  findOrCreateUser,
  getUserById,
  setState,
  clearState,
  setBotStatus,
  recalculateLevel,
  logStatement,
  getStatements,
};
