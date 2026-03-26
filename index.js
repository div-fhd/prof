'use strict';
require('dotenv').config();

const express              = require('express');
const path                 = require('path');
const TelegramBot          = require('node-telegram-bot-api');
const connectDB            = require('./config/database');
const config               = require('./config');
const { registerHandlers } = require('./bot');
const { applyDailyProfits, setBotInstance: setProfitBot } = require('./services/dailyProfitService');
const { setBotInstance: setNotifyBot }          = require('./services/notifyService');
const adminRouter          = require('./routes/admin');
const logger               = require('./utils/logger');

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.get('/panel', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use('/health', require('./routes/health'));
app.use('/admin',  adminRouter);
app.get('/', (_req, res) => res.json({ name: 'Telegram Investment Bot', version: '3.0.0', status: 'running' }));

// ── Daily profit scheduler ────────────────────────────────────────────────────
const scheduleDailyProfits = () => {
  const runAtMidnight = () => {
    const now      = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const delayMs  = midnight.getTime() - now.getTime();

    setTimeout(async () => {
      await applyDailyProfits();
      scheduleDailyProfits();
    }, delayMs);

    logger.info(`Daily profit scheduled in ${Math.round(delayMs / 60000)} minutes`);
  };

  runAtMidnight();
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const start = async () => {
  if (!config.telegram.token) {
    logger.error('BOT_TOKEN is missing from .env — cannot start.');
    process.exit(1);
  }

  await connectDB();

  const bot = new TelegramBot(config.telegram.token, {
    polling: { interval: 2000, autoStart: true, params: { timeout: 10 } },
  });

  // حقن البوت في جميع الخدمات التي تحتاج إرسال رسائل
  setProfitBot(bot);
  setNotifyBot(bot);
  adminRouter.setBotInstance(bot);

  registerHandlers(bot);
  scheduleDailyProfits();

  const { port, env } = config.server;
  app.listen(port, () => {
    logger.info(`HTTP server on port ${port} [${env}]`);
    logger.info(`Admin panel → http://localhost:${port}/panel`);
    logger.info('Telegram bot started.');
    if (config.bot.seedBalance > 0)
      logger.info(`Demo mode: new users get ${config.bot.seedBalance} USDT seed balance.`);
  });
};

start().catch((err) => { logger.error('Fatal startup error:', err); process.exit(1); });
