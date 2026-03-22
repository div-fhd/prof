'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    telegramId:       { type: String, required: true, index: true },
    amount:           { type: Number, required: true },
    fee:              { type: Number, default: 0 },
    netAmount:        { type: Number, required: true },
    network:          { type: String, default: 'TRC20' },
    walletAddress:    { type: String, default: null },
    status:           { type: String, enum: ['pending', 'processing', 'completed', 'rejected'], default: 'pending' },
    rejectionReason:  { type: String, default: null },
    processedAt:      { type: Date,   default: null },
    notes:            { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WithdrawalRequest', schema);
