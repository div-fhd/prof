'use strict';

/** 1000.5 → "1,000.50" */
const formatCurrency = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 23300 → "23,300" */
const formatNumber = (n) =>
  Number(n || 0).toLocaleString('en-US');

/** Date → Arabic-style readable string */
const formatDate = (d) =>
  new Date(d).toLocaleString('ar', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

/** Map statement type → Arabic label */
const STATEMENT_TYPE_AR = {
  deposit:         '💰 إيداع',
  withdrawal:      '💸 سحب',
  bot_started:     '▶️ تشغيل البوت',
  bot_stopped:     '⏹️ إيقاف البوت',
  profit_estimate: '📊 تقدير الأرباح',
  level_upgrade:   '⬆️ ترقية المستوى',
  system:          '⚙️ نظام',
};

/** Map status → Arabic label */
const STATUS_AR = {
  pending:    '⏳ قيد الانتظار',
  processing: '⚙️ قيد المعالجة',
  completed:  '✅ مكتمل',
  rejected:   '❌ مرفوض',
  failed:     '❌ فشل',
  active:     '🟢 نشط',
  stopped:    '🔴 متوقف',
};

module.exports = { formatCurrency, formatNumber, formatDate, STATEMENT_TYPE_AR, STATUS_AR };
