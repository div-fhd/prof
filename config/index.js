'use strict';
require('dotenv').config();

const config = {
  telegram: {
    token: process.env.BOT_TOKEN || '',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/investment_bot',
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env:  process.env.NODE_ENV || 'development',
  },
  admin: {
    telegramId: process.env.ADMIN_TELEGRAM_ID || '',
    apiKey:     process.env.ADMIN_API_KEY || 'changeme',
  },
  support: {
    username: process.env.SUPPORT_USERNAME || 'support',   // بدون @
    link:     process.env.SUPPORT_LINK     || 'https://t.me/PTradingSupport',
  },
  payment: {
    wallets: [
      {
        name:    process.env.WALLET_NAME_1    || '💳 USDT TRC20',
        link:    process.env.WALLET_LINK_1    || 'https://t.me/PTradingSupport',
        address: process.env.WALLET_ADDRESS_1 || 'TMhcuKpcLY7CV7d2kpAY52NimCqZQ2GP4D',   // عنوان المحفظة الفعلي
        network: process.env.WALLET_NETWORK_1 || 'TRC20',
      },
      {
        name:    process.env.WALLET_NAME_2    || '💳 USDT BEP20',
        link:    process.env.WALLET_LINK_2    || 'https://t.me/PTradingSupport',
        address: process.env.WALLET_ADDRESS_2 || '0x6d1d6BA4AddE95Be2B794c8892dcA2aAbEfA942f',
        network: process.env.WALLET_NETWORK_2 || 'BEP20',
      },
    ],
  },
  bot: {
    profitRateDaily: parseFloat(process.env.PROFIT_RATE_DAILY) || 0.04,
    withdrawalFee:   parseFloat(process.env.WITHDRAWAL_FEE)    || 0.05,
    depositFee:      parseFloat(process.env.DEPOSIT_FEE)       || 0.05,
    minWithdrawal:   parseFloat(process.env.MIN_WITHDRAWAL)    || 10,
    seedBalance:     parseFloat(process.env.SEED_BALANCE)      || 0,
  },
  // نسبة الربح اليومي لكل مستوى
  accountLevels: [
    { level: 1, name: 'مبتدئ ⚡️',       dailyTrades: 'حتى 10',     profitRate: 'أساسي',      signalPriority: 'منخفضة',      support: null,                        minBalance: 0,    dailyProfitRate: 0.02 },
    { level: 2, name: 'مبتدئ 🎉',        dailyTrades: 'حتى 20',     profitRate: 'محسّن',      signalPriority: 'متوسطة',      support: null,                        minBalance: 150,  dailyProfitRate: 0.025 },
    { level: 3, name: 'متوسط 🔥',        dailyTrades: 'حتى 40',     profitRate: 'مرتفع',      signalPriority: 'مرتفعة',      support: null,                        minBalance: 400,  dailyProfitRate: 0.03 },
    { level: 4, name: 'متداول متقدم 🌟', dailyTrades: 'حتى 60',     profitRate: 'مرتفع جدًا', signalPriority: 'مرتفعة جدًا', support: 'دعم مميز 24/7',            minBalance: 1000, dailyProfitRate: 0.035 },
    { level: 5, name: 'متداول VIP 🚀',   dailyTrades: 'غير محدودة', profitRate: 'أعلى مستوى', signalPriority: 'أعلى مستوى', support: 'مدير حساب VIP شخصي 24/7', minBalance: 3000, dailyProfitRate: 0.04 },
  ],
};

module.exports = config;
