'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    telegramId:    { type: String, required: true, index: true },
    amount:        { type: Number, required: true },
    fee:           { type: Number, default: 0 },
    netAmount:     { type: Number, required: true },
    paymentMethod: { type: String, default: 'USDT' },
    network:       { type: String, default: 'TRC20' },
    status:        { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
    txHash:        { type: String, default: null },
    notes:         { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DepositRecord', schema);
