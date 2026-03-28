'use strict';
const mongoose = require('mongoose');
const config   = require('../config');

const userSchema = new mongoose.Schema(
  {
    telegramId:       { type: String, required: true, unique: true, index: true },
    username:         { type: String, default: null },
    firstName:        { type: String, default: '' },
    lastName:         { type: String, default: '' },

    balance:          { type: Number, default: () => config.bot.seedBalance || 0 },
    totalDeposits:    { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    totalProfit:      { type: Number, default: 0 },

    accountLevel:     { type: Number, default: 1, min: 1, max: 5 },
    isVip:            { type: Boolean, default: false },

    referralCode:     { type: String, unique: true, sparse: true },
    referredBy:       { type: String, default: null },
    invitedFriends:   { type: Number, default: 0 },

    botStatus:        { type: String, enum: ['active', 'stopped'], default: 'stopped' },
    // وقت آخر إيقاف — لشرط 12 ساعة قبل السحب
    botStoppedAt:     { type: Date, default: null },

    state:            { type: String, default: null },
    stateData:        { type: mongoose.Schema.Types.Mixed, default: null },

    lastActivity:     { type: Date, default: Date.now },
    lastProfitAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.displayName = function () {
  const full = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  return full || this.username || `User_${this.telegramId}`;
};

userSchema.methods.levelName = function () {
  if (this.isVip) return 'المدعو المتميز 👑';
  const labels = { 1:'مبتدئ ⚡️', 2:'مبتدئ 🎉', 3:'متوسط 🔥', 4:'متداول متقدم 🌟', 5:'متداول VIP 🚀' };
  return labels[this.accountLevel] || 'مبتدئ ⚡️';
};

userSchema.methods.dailyProfitRate = function () {
  const range = config.accountLevelRanges.find(r => r.level === this.accountLevel)
             || config.accountLevelRanges[0];
  return parseFloat(((range.min + range.max) / 2).toFixed(4));
};

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
  // إيقاف البوت تلقائياً إذا الرصيد أقل من 10
  if (this.balance < 10 && this.botStatus === 'active') {
    this.botStatus    = 'stopped';
    this.botStoppedAt = new Date();
    await this.save();
  }
  return this;
};

// هل مر 12 ساعة على آخر إيقاف؟
userSchema.methods.canWithdraw = function () {
  if (this.botStatus === 'active') return false;
  if (!this.botStoppedAt) return true;
  const hours = (Date.now() - this.botStoppedAt.getTime()) / 3_600_000;
  return hours >= 24;
};

// كم ساعة تبقى لاكتمال الـ 12 ساعة
userSchema.methods.hoursUntilWithdraw = function () {
  if (!this.botStoppedAt) return 0;
  const hours = (Date.now() - this.botStoppedAt.getTime()) / 3_600_000;
  return Math.max(0, 24 - hours);
};

userSchema.methods.ensureReferralCode = async function () {
  if (!this.referralCode) {
    this.referralCode = String(this.telegramId);
    await this.save();
  }
  return this.referralCode;
};

module.exports = mongoose.model('User', userSchema);
