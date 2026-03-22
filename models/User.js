'use strict';
const mongoose = require('mongoose');
const config   = require('../config');

const userSchema = new mongoose.Schema(
  {
    telegramId:       { type: String, required: true, unique: true, index: true },
    username:         { type: String, default: null },
    firstName:        { type: String, default: '' },
    lastName:         { type: String, default: '' },

    // Finance
    balance:          { type: Number, default: () => config.bot.seedBalance || 0 },
    totalDeposits:    { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },

    // Account
    accountLevel:     { type: Number, default: 1, min: 1, max: 5 },
    isVip:            { type: Boolean, default: false },
    invitedFriends:   { type: Number, default: 0 },
    referredBy:       { type: String, default: null },

    // Bot
    botStatus:        { type: String, enum: ['active', 'stopped'], default: 'stopped' },

    // Conversation state machine
    state:            { type: String, default: null },
    stateData:        { type: mongoose.Schema.Types.Mixed, default: null },

    lastActivity:     { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/** Full display name */
userSchema.methods.displayName = function () {
  const full = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  return full || this.username || `User_${this.telegramId}`;
};

/** Arabic level label */
userSchema.methods.levelName = function () {
  if (this.isVip) return 'المدعو المتميز 👑';
  const labels = { 1: 'مبتدئ ⚡️', 2: 'مبتدئ 🎉', 3: 'متوسط 🔥', 4: 'متداول متقدم 🌟', 5: 'متداول VIP 🚀' };
  return labels[this.accountLevel] || 'مبتدئ ⚡️';
};

/** Recalculate level from balance and save if changed */
userSchema.methods.recalculateLevel = async function () {
  const levels = config.accountLevels;
  let newLevel = 1;
  for (const l of levels) {
    if (this.balance >= l.minBalance) newLevel = l.level;
  }
  if (newLevel !== this.accountLevel) {
    this.accountLevel = newLevel;
    await this.save();
  }
  return this;
};

module.exports = mongoose.model('User', userSchema);
