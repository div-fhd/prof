'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    telegramId:    { type: String, required: true, index: true },
    type:          {
      type: String,
      enum: ['deposit', 'withdrawal', 'bot_started', 'bot_stopped', 'profit_estimate', 'level_upgrade', 'system'],
      required: true,
    },
    amount:        { type: Number, default: 0 },
    balanceBefore: { type: Number, default: 0 },
    balanceAfter:  { type: Number, default: 0 },
    description:   { type: String, required: true },
    descriptionAr: { type: String, default: '' },
    referenceId:   { type: String, default: null },
    status:        { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AccountStatement', schema);
