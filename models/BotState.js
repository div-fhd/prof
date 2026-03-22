'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    telegramId:                  { type: String, required: true, unique: true, index: true },
    status:                      { type: String, enum: ['active', 'stopped'], default: 'stopped' },
    startedAt:                   { type: Date,   default: null },
    stoppedAt:                   { type: Date,   default: null },
    currentSessionStart:         { type: Date,   default: null },
    tradingPausedForWithdrawal:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BotState', schema);
