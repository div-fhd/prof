'use strict';
const express  = require('express');
const router   = express.Router();
const { User, DepositRecord, WithdrawalRequest } = require('../models');
const { approveDeposit }    = require('../services/depositService');
const { completeWithdrawal } = require('../services/withdrawalService');
const logger = require('../utils/logger');

// ── Simple API key guard ──────────────────────────────────────────────────────
const guard = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.use(guard);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ count: users.length, users });
  } catch (err) {
    logger.error('GET /admin/users:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.telegramId }).lean();
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Deposits ──────────────────────────────────────────────────────────────────
router.get('/deposits', async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const deposits = await DepositRecord.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ count: deposits.length, deposits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/deposits/:id/approve
 * Credits user balance with net amount after fee.
 */
router.post('/deposits/:id/approve', async (req, res) => {
  try {
    const result = await approveDeposit(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('POST /admin/deposits/approve:', err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/deposits/:id/reject', async (req, res) => {
  try {
    const deposit = await DepositRecord.findById(req.params.id);
    if (!deposit) return res.status(404).json({ error: 'Not found' });
    deposit.status = 'rejected';
    deposit.notes  = req.body.reason || 'Rejected by admin';
    await deposit.save();
    res.json({ success: true, deposit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Withdrawals ───────────────────────────────────────────────────────────────
router.get('/withdrawals', async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const withdrawals = await WithdrawalRequest.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ count: withdrawals.length, withdrawals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/withdrawals/:id/complete
 * Debits user balance and marks withdrawal done.
 */
router.post('/withdrawals/:id/complete', async (req, res) => {
  try {
    const result = await completeWithdrawal(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('POST /admin/withdrawals/complete:', err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/withdrawals/:id/reject', async (req, res) => {
  try {
    const w = await WithdrawalRequest.findById(req.params.id);
    if (!w) return res.status(404).json({ error: 'Not found' });
    w.status          = 'rejected';
    w.rejectionReason = req.body.reason || 'Rejected by admin';
    w.processedAt     = new Date();
    await w.save();
    res.json({ success: true, withdrawal: w });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Manual balance adjustment (prototype use) ─────────────────────────────────
router.post('/users/:telegramId/balance', async (req, res) => {
  try {
    const { amount, operation } = req.body; // operation: 'set' | 'add'
    if (typeof amount !== 'number') return res.status(400).json({ error: 'amount must be a number' });

    const user = await User.findOne({ telegramId: req.params.telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (operation === 'add') {
      user.balance = Math.max(0, user.balance + amount);
    } else {
      user.balance = Math.max(0, amount);
    }

    await user.save();
    await user.recalculateLevel();
    res.json({ success: true, balance: user.balance, level: user.accountLevel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ── Stats summary (used by dashboard) ────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [users, deposits, withdrawals] = await Promise.all([
      User.find().lean(),
      DepositRecord.find().lean(),
      WithdrawalRequest.find().lean(),
    ]);
    res.json({
      users:            users.length,
      totalBalance:     users.reduce((s, u) => s + (u.balance || 0), 0),
      activeBots:       users.filter(u => u.botStatus === 'active').length,
      pendingDeposits:  deposits.filter(d => d.status === 'pending').length,
      pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
      totalDeposited:   deposits.filter(d => d.status === 'completed').reduce((s, d) => s + d.amount, 0),
      totalWithdrawn:   withdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + w.amount, 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
