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
    username: process.env.SUPPORT_USERNAME || 'support',
    link:     process.env.SUPPORT_LINK     || 'https://t.me/PTradingSupport',
  },
  payment: {
    wallets: [
      {
        name:    process.env.WALLET_NAME_1    || '💳 USDT TRC20',
        link:    process.env.WALLET_LINK_1    || 'https://t.me/PTradingSupport',
        address: process.env.WALLET_ADDRESS_1 || 'TMhcuKpcLY7CV7d2kpAY52NimCqZQ2GP4D',
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

  // ── نسب الربح اليومي لكل مستوى — بكسور عشرية لتبدو طبيعية وغير ثابتة ──────
  // المستوى 1: ~2%   المستوى 2: ~2.5%   المستوى 3: ~3%
  // المستوى 4: ~3.5% المستوى 5: ~4%
  // كل تشغيل يختار نسبة عشوائية من النطاق الخاص بالمستوى
  accountLevelRanges: [
    { level: 1, min: 0.0187, max: 0.0213 }, // 1.87% – 2.13%
    { level: 2, min: 0.0234, max: 0.0268 }, // 2.34% – 2.68%
    { level: 3, min: 0.0281, max: 0.0319 }, // 2.81% – 3.19%
    { level: 4, min: 0.0328, max: 0.0372 }, // 3.28% – 3.72%
    { level: 5, min: 0.0375, max: 0.0425 }, // 3.75% – 4.25%
  ],

  accountLevels: [
    { level: 1, name: 'مبتدئ ⚡️',       dailyTrades: 'حتى 10',     profitRate: 'أساسي',      signalPriority: 'منخفضة',      support: null,                        minBalance: 0,    dailyProfitRate: 0.02  },
    { level: 2, name: 'مبتدئ 🎉',        dailyTrades: 'حتى 20',     profitRate: 'محسّن',      signalPriority: 'متوسطة',      support: null,                        minBalance: 150,  dailyProfitRate: 0.025 },
    { level: 3, name: 'متوسط 🔥',        dailyTrades: 'حتى 40',     profitRate: 'مرتفع',      signalPriority: 'مرتفعة',      support: null,                        minBalance: 400,  dailyProfitRate: 0.03  },
    { level: 4, name: 'متداول متقدم 🌟', dailyTrades: 'حتى 60',     profitRate: 'مرتفع جدًا', signalPriority: 'مرتفعة جدًا', support: 'دعم مميز 24/7',            minBalance: 1000, dailyProfitRate: 0.035 },
    { level: 5, name: 'متداول VIP 🚀',   dailyTrades: 'غير محدودة', profitRate: 'أعلى مستوى', signalPriority: 'أعلى مستوى', support: 'مدير حساب VIP شخصي 24/7', minBalance: 3000, dailyProfitRate: 0.04  },
  ],
};

module.exports = config;
