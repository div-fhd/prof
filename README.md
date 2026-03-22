# 🤖 Arabic Telegram Investment Bot v2

A fully stateful, production-style Arabic Telegram investment bot prototype built with **Node.js**, **Express**, **MongoDB/Mongoose**, and **node-telegram-bot-api**.

---

## 📁 Project Structure

```
telegram-investment-bot/
├── index.js                          # Entry point — wires everything together
│
├── config/
│   ├── index.js                      # All config & business rules
│   └── database.js                   # MongoDB connection
│
├── models/
│   ├── User.js                       # User profile, balance, state machine, level helpers
│   ├── DepositRecord.js              # Deposit history
│   ├── WithdrawalRequest.js          # Withdrawal requests
│   ├── AccountStatement.js           # Full activity ledger
│   ├── BotState.js                   # Bot on/off tracking per user
│   └── index.js                      # Re-exports all models
│
├── services/
│   ├── userService.js                # User CRUD, state machine, bot control, statements
│   ├── depositService.js             # Create & approve deposits
│   ├── withdrawalService.js          # Create & complete withdrawals
│   └── profitService.js              # Profit calculation logic
│
├── bot/
│   ├── index.js                      # Message router + callback_query router
│   ├── messages/
│   │   └── index.js                  # All Arabic message builders (single source of truth)
│   ├── keyboards/
│   │   └── index.js                  # All reply & inline keyboards
│   └── handlers/
│       ├── startHandler.js           # /start
│       ├── depositHandler.js         # USDT deposit screen
│       ├── profitHandler.js          # Profit calculator + account levels
│       ├── accountHandler.js         # Account dashboard
│       ├── botControlHandler.js      # Start/stop bot
│       ├── withdrawHandler.js        # Withdraw flow (stateful)
│       └── statementHandler.js       # Account statement
│
├── routes/
│   ├── health.js                     # GET /health
│   └── admin.js                      # Admin REST API (approve/reject deposits & withdrawals)
│
├── utils/
│   ├── logger.js                     # Console logger with timestamps
│   └── formatters.js                 # Currency, number, date, label formatters
│
├── .env.example                      # Copy to .env and fill in
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Setup

### 1. Prerequisites
- **Node.js** v18+
- **MongoDB** — local (`mongod`) or [MongoDB Atlas](https://cloud.mongodb.com) (free tier works)
- **Telegram Bot Token** — create one at [@BotFather](https://t.me/BotFather)

### 2. Install

```bash
git clone <repo>
cd telegram-investment-bot
npm install
```

### 3. Configure

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

```
BOT_TOKEN=7123456789:AAF...your_token_here
MONGODB_URI=mongodb://localhost:27017/investment_bot
SEED_BALANCE=100
```

### 4. Run

```bash
# Development (auto-restarts on file change)
npm run dev

# Production
npm start
```

You should see:
```
[INFO] MongoDB connected: localhost
[INFO] HTTP server running on port 3000 [development]
[INFO] Telegram bot started in polling mode.
[INFO] Demo mode: new users receive 100 USDT seed balance.
[INFO] All bot handlers registered.
```

---

## 🤖 Bot Flow Reference

### Main Menu (reply keyboard — always visible)
| Button | Action |
|--------|--------|
| 💲 USDT | Show deposit screen with wallet links |
| 📊 الأرباح المتوقعة | Enter profit calculator (stateful input) |
| 👤 حسابي | Account dashboard |
| 🔙 العودة للخلف | Return to main menu |

### Account Dashboard (inline keyboard)
| Button | Action |
|--------|--------|
| ▶️ تشغيل البوت | Set bot status = active, log statement |
| ⏹️ إيقاف البوت | Set bot status = stopped, log statement |
| 💰 إيداع | Deposit screen |
| 💸 سحب | Withdraw info + flow |
| 📄 كشف الحساب | Last 10 account entries |
| 🔙 رجوع | Back to main menu |

### Profit Calculator Flow
1. User taps **📊 الأرباح المتوقعة**
2. Bot sets state → `awaiting_profit_amount` and asks for capital
3. User types amount (e.g. `1000`)
4. Bot validates → calculates daily/weekly/monthly → replies → clears state
5. Buttons: إعادة الحساب / مستويات الحساب / إيداع / رجوع

### Withdraw Flow
1. User taps **💸 سحب** → sees info screen
2. Taps **تقديم طلب سحب** → bot checks balance ≥ minimum
3. Bot sets state → `awaiting_withdrawal_amount` and asks for amount
4. User types amount → bot validates (positive, ≥ min, ≤ balance)
5. Bot saves `WithdrawalRequest` to DB → logs statement → shows confirmation
6. Admin processes via REST API

---

## 🔒 Admin REST API

All endpoints require header: `x-admin-key: <ADMIN_API_KEY>`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/admin/users` | All users |
| GET | `/admin/users/:telegramId` | Single user |
| GET | `/admin/deposits?status=pending` | Deposits (filterable) |
| POST | `/admin/deposits/:id/approve` | Approve deposit → credit balance |
| POST | `/admin/deposits/:id/reject` | Reject deposit |
| GET | `/admin/withdrawals?status=pending` | Withdrawals (filterable) |
| POST | `/admin/withdrawals/:id/complete` | Complete withdrawal → debit balance |
| POST | `/admin/withdrawals/:id/reject` | Reject withdrawal |
| POST | `/admin/users/:telegramId/balance` | Manually set/add balance (demo) |

### Balance adjustment body (demo use):
```json
{ "amount": 500, "operation": "add" }
{ "amount": 100, "operation": "set" }
```

---

## 📊 Profit Formula

```
Daily Profit  = Capital × 4%
Weekly Profit = Daily × 7
Monthly Profit = Daily × 30
```

Rate is configurable in `.env` via `PROFIT_RATE_DAILY`.

---

## 🏆 Account Levels

| Level | Name | Min Balance |
|-------|------|-------------|
| 1 | مبتدئ ⚡️ | 50 USDT |
| 2 | مبتدئ 🎉 | 150 USDT |
| 3 | متوسط 🔥 | 400 USDT |
| 4 | متداول متقدم 🌟 | 1,000 USDT |
| 5 | متداول VIP 🚀 | 3,000 USDT |
| Special | المدعو المتميز 👑 | Invite 20 friends |

Levels are auto-recalculated when deposits are approved or withdrawals completed.

---

## 🌱 Prototype Demo Mode

Set `SEED_BALANCE=100` in `.env` to give every new user 100 USDT automatically.
This lets testers explore all features (including withdraw) without needing to go through the deposit approval flow.

---

## ⚠️ Disclaimer

This is a **prototype for testing and demo purposes only**.
No real trading, no real funds are handled.
