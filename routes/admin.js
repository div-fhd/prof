'use strict';
const express  = require('express');
const router   = express.Router();
const { User, DepositRecord, WithdrawalRequest } = require('../models');
const { approveDeposit, rejectDeposit }   = require('../services/depositService');
const { completeWithdrawal, rejectWithdrawal } = require('../services/withdrawalService');
const logger = require('../utils/logger');

// يُحقن من index.js
let _bot = null;
router.setBotInstance = (bot) => { _bot = bot; };

// ── API key guard ─────────────────────────────────────────────────────────────
const guard = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_API_KEY)
    return res.status(401).json({ error: 'Unauthorized' });
  next();
};
router.use(guard);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ count: users.length, users });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.telegramId }).lean();
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Deposits ──────────────────────────────────────────────────────────────────
router.get('/deposits', async (req, res) => {
  try {
    const filter   = req.query.status ? { status: req.query.status } : {};
    const deposits = await DepositRecord.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ count: deposits.length, deposits });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/deposits/:id/approve', async (req, res) => {
  try {
    const result = await approveDeposit(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/deposits/:id/reject', async (req, res) => {
  try {
    const result = await rejectDeposit(req.params.id, req.body.reason || '');
    res.json({ success: true, ...result });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Withdrawals ───────────────────────────────────────────────────────────────
router.get('/withdrawals', async (req, res) => {
  try {
    const filter      = req.query.status ? { status: req.query.status } : {};
    const withdrawals = await WithdrawalRequest.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ count: withdrawals.length, withdrawals });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/withdrawals/:id/complete', async (req, res) => {
  try {
    const result = await completeWithdrawal(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/withdrawals/:id/reject', async (req, res) => {
  try {
    const result = await rejectWithdrawal(req.params.id, req.body.reason || '');
    res.json({ success: true, ...result });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Balance (demo) ────────────────────────────────────────────────────────────
router.post('/users/:telegramId/balance', async (req, res) => {
  try {
    const { amount, operation } = req.body;
    if (typeof amount !== 'number') return res.status(400).json({ error: 'amount must be a number' });
    const user = await User.findOne({ telegramId: req.params.telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (operation === 'add') user.balance = Math.max(0, user.balance + amount);
    else                     user.balance = Math.max(0, amount);
    await user.save();
    await user.recalculateLevel();
    res.json({ success: true, balance: user.balance, level: user.accountLevel });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [users, deposits, withdrawals] = await Promise.all([
      User.find().lean(),
      DepositRecord.find().lean(),
      WithdrawalRequest.find().lean(),
    ]);
    res.json({
      users:              users.length,
      totalBalance:       users.reduce((s, u) => s + (u.balance || 0), 0),
      activeBots:         users.filter(u => u.botStatus === 'active').length,
      pendingDeposits:    deposits.filter(d => d.status === 'pending').length,
      pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
      totalDeposited:     deposits.filter(d => d.status === 'completed').reduce((s, d) => s + d.amount, 0),
      totalWithdrawn:     withdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + w.amount, 0),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Notifications ─────────────────────────────────────────────────────────────

/**
 * POST /admin/notify/user
 * body: { telegramId, message }
 */
router.post('/notify/user', async (req, res) => {
  try {
    if (!_bot) return res.status(503).json({ error: 'Bot instance not available' });
    const { telegramId, message } = req.body;
    if (!telegramId || !message?.trim())
      return res.status(400).json({ error: 'telegramId و message مطلوبان' });

    const user = await User.findOne({ telegramId: String(telegramId) }).lean();
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    await _bot.sendMessage(telegramId, message.trim(), { parse_mode: 'Markdown' });
    logger.info(`Notify sent to ${telegramId}`);
    res.json({ success: true, sentTo: 1 });
  } catch (err) {
    logger.error('POST /admin/notify/user:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/notify/broadcast
 * body: { message, onlyActive? }
 */
router.post('/notify/broadcast', async (req, res) => {
  try {
    if (!_bot) return res.status(503).json({ error: 'Bot instance not available' });
    const { message, onlyActive } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message مطلوب' });

    const filter = onlyActive ? { botStatus: 'active' } : {};
    const users  = await User.find(filter).select('telegramId').lean();

    let sent = 0, failed = 0;
    for (const user of users) {
      try {
        await _bot.sendMessage(user.telegramId, message.trim(), { parse_mode: 'Markdown' });
        sent++;
        await new Promise(r => setTimeout(r, 40));
      } catch (e) {
        failed++;
        logger.warn(`Broadcast failed for ${user.telegramId}: ${e.message}`);
      }
    }

    logger.info(`Broadcast done — sent: ${sent}, failed: ${failed}`);
    res.json({ success: true, total: users.length, sent, failed });
  } catch (err) {
    logger.error('POST /admin/notify/broadcast:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
