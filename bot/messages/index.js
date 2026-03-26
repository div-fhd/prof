'use strict';
/**
 * ALL messages use plain Markdown (parse_mode: 'Markdown') only.
 * MarkdownV2 is intentionally avoided — it requires escaping dozens of
 * characters and causes "Bad Request: can't parse entities" errors in practice.
 *
 * Rules for plain Markdown:
 *   *bold*   _italic_   `code`   [text](url)
 * Do NOT use: ~ | { } > # + - = . ! ( ) [ ] outside of the above patterns.
 * Arabic text is safe as-is. Numbers and USDT amounts are safe.
 */

const config = require('../../config');
const { formatCurrency, formatDate, STATEMENT_TYPE_AR, STATUS_AR } = require('../../utils/formatters');

const SEP = `➖➖➖➖➖➖➖➖`;

// ─────────────────────────────────────────────────────────────────────────────
//  Welcome
// ─────────────────────────────────────────────────────────────────────────────
const welcomeMsg = (name) =>
  `🌟 *أهلاً وسهلاً ${name}!* 🌟\n\n` +
  `مرحباً بك في *منصة التداول الذكية* 🤖💹\n\n` +
  `نحن نستخدم أحدث خوارزميات الذكاء الاصطناعي\n` +
  `لتحقيق أقصى عائد على استثماراتك.\n\n` +
  `🚀 *مميزات المنصة:*\n` +
  `✅ معدل ربح يومي يصل إلى 4 بالمئة\n` +
  `✅ تداول آلي على مدار الساعة\n` +
  `✅ شبكة TRC20 الآمنة\n` +
  `✅ سحب وإيداع سريع\n\n` +
  `${SEP}\n` +
  `👇 *اختر من القائمة أدناه للبدء:*`;

const mainMenuMsg = () =>
  `🏠 *القائمة الرئيسية*\n\n` +
  `اختر أحد الخيارات التالية:`;

// ─────────────────────────────────────────────────────────────────────────────
//  Deposit
// ─────────────────────────────────────────────────────────────────────────────
const depositMsg = () =>
  `💲 *إيداع رأس المال* 💲\n\n` +
  `💰 *الرسوم:* 5 بالمئة\n` +
  `⚙️ *المعالجة:* تلقائية\n\n` +
  `${SEP}\n` +
  `📌 *تعليمات الإيداع:*\n` +
  `• أرسل USDT عبر الشبكة المحددة فقط\n` +
  `• احتفظ بإيصال التحويل\n` +
  `• سيُفعَّل حسابك تلقائيًا بعد التأكيد\n\n` +
  `👇 *اختر محفظة الدفع:*`;

// ─────────────────────────────────────────────────────────────────────────────
//  Profit calculator
// ─────────────────────────────────────────────────────────────────────────────
const askCapitalMsg = () =>
  `📊 *حساب الأرباح المتوقعة*\n\n` +
  `💡 أدخل رأس المال المقترح بالدولار وسنحسب\n` +
  `أرباحك المتوقعة يوميًا وأسبوعيًا وشهريًا:\n\n` +
  `_مثال: 500 أو 1000 أو 5000_\n\n` +
  `اضغط ❌ إلغاء للعودة.`;

// ─────────────────────────────────────────────────────────────────────────────
//  Account levels
// ─────────────────────────────────────────────────────────────────────────────
const accountLevelsMsg = () => {
  const levels = config.accountLevels;
  let msg = `📋 *مستويات الحساب*\n${SEP}\n\n`;

  levels.forEach((l) => {
    msg += `*المستوى ${l.level}: ${l.name}*\n`;
    msg += `🔸 التداولات في اليوم: ${l.dailyTrades}\n`;
    msg += `🔸 معدل الربح: ${l.profitRate}\n`;
    msg += `🔸 أولوية الإشارة: ${l.signalPriority}\n`;
    if (l.support) msg += `🔸 الدعم: ${l.support}\n`;
    const minDisplay = l.minBalance === 0 ? 50 : l.minBalance;
    msg += `🔸 الرصيد المطلوب: *${minDisplay} USDT*\n`;
    msg += `${SEP}\n\n`;
  });

  msg +=
    `*المستوى الخاص: المدعو المتميز 👑*\n` +
    `⚡️ فعّله بدعوة *20 صديقًا* على الأقل\n` +
    `🔸 التداولات في اليوم: حتى 100\n` +
    `🔸 معدل الربح: الأعلى مع مكافآت إضافية\n` +
    `🔸 أولوية الإشارة: تنفيذ فوري ⚡️\n` +
    `🔸 الدعم: حصري على مدار الساعة\n` +
    `🔸 الرصيد المطلوب: غير مطلوب\n` +
    `🎁 المكافأة: مكافآت لأفضل المدعوين\n` +
    `${SEP}`;

  return msg;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Account dashboard
// ─────────────────────────────────────────────────────────────────────────────
const accountDashboardMsg = (user) => {
  const botStatus = user.botStatus === 'active' ? '🟢 نشط' : '🔴 متوقف';
  const updated   = formatDate(user.updatedAt || user.createdAt);

  return (
    `👤 *حسابي*\n` +
    `${SEP}\n\n` +
    `🏷️ *الاسم:* ${user.displayName()}\n` +
    `🆔 *المعرف:* ${user.telegramId}\n\n` +
    `💰 *الرصيد الحالي:* ${formatCurrency(user.balance)} USDT\n` +
    `📊 *مستوى الحساب:* ${user.levelName()}\n` +
    `🤖 *حالة البوت:* ${botStatus}\n\n` +
    `${SEP}\n` +
    `📥 *إجمالي الإيداعات:*  ${formatCurrency(user.totalDeposits)} USDT\n` +
    `📤 *إجمالي السحوبات:*  ${formatCurrency(user.totalWithdrawals)} USDT\n\n` +
    `🕐 *آخر تحديث:* ${updated}\n` +
    `${SEP}`
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Bot control
// ─────────────────────────────────────────────────────────────────────────────
const botStartedMsg = (user) =>
  `✅ *تم تشغيل البوت بنجاح!*\n\n` +
  `🤖 البوت الآن *نشط* ويعمل على مدار الساعة.\n\n` +
  `📊 *لمحة سريعة:*\n` +
  `💰 الرصيد: ${formatCurrency(user.balance)} USDT\n` +
  `📈 المستوى: ${user.levelName()}\n\n` +
  `🚀 _سيبدأ النظام بتحليل السوق وتنفيذ الصفقات تلقائيًا._`;

const botStoppedMsg = (user) =>
  `⏹️ *تم إيقاف البوت بنجاح.*\n\n` +
  `🔴 البوت الآن *متوقف*.\n\n` +
  `💰 الرصيد: ${formatCurrency(user.balance)} USDT\n\n` +
  `ℹ️ _يمكنك إعادة تشغيله متى شئت من قائمة حسابي._`;

// ─────────────────────────────────────────────────────────────────────────────
//  Withdraw
// ─────────────────────────────────────────────────────────────────────────────
const withdrawInfoMsg = (user) =>
  `💸 *سحب الأموال* 💸\n\n` +
  `❗️ يتم قبول USDT عبر شبكة TRC20 فقط\n` +
  `⚠️ رسوم السحب: *5 بالمئة*\n` +
  `⏳ المعالجة: *من1 الى 2أيام عمل*\n` +
  `🚫 سيتم إيقاف التداول مؤقتًا أثناء السحب\n` +
  `🔑 الحد الأدنى: *${config.bot.minWithdrawal} USDT*\n` +
  `🚨 أوقف البوت 12 ساعة قبل السحب لتجنب المخاطر\n\n` +
  `${SEP}\n` +
  `💰 *الرصيد الحالي:* ${formatCurrency(user.balance)} USDT\n\n` +
  `▶️ _قد لا تكون بعض الأموال متاحة بسبب صفقات مفتوحة._`;

const askWithdrawAmountMsg = (user) =>
  `💸 *طلب سحب جديد*\n\n` +
  `💰 رصيدك الحالي: *${formatCurrency(user.balance)} USDT*\n` +
  `🔑 الحد الأدنى: *${config.bot.minWithdrawal} USDT*\n\n` +
  `أدخل المبلغ الذي تريد سحبه:\n` +
  `_مثال: 50 أو 200_\n\n` +
  `اضغط ❌ إلغاء للعودة.`;

const withdrawConfirmMsg = (withdrawal) =>
  `✅ *تم استلام طلب السحب!*\n\n` +
  `📤 المبلغ المطلوب: *${withdrawal.amount} USDT*\n` +
  `💸 رسوم السحب 5 بالمئة: *${withdrawal.fee} USDT*\n` +
  `💰 المبلغ الصافي: *${withdrawal.netAmount} USDT*\n` +
  `🌐 الشبكة: *TRC20*\n\n` +
  `${SEP}\n` +
  `📨 *يرجى إرسال عنوان محفظة السحب إلى الدعم الفني.*\n\n` +
  `⚠️ *تحذير:* TRC20 فقط — أي شبكة أخرى تؤدي لفقدان الأموال\n\n` +
  `🆔 *رقم الطلب:* ${withdrawal._id}\n\n` +
  `_سيتم معالجة طلبك خلال1 الى 2أيام عمل._`;

const howItWorksMsg = () =>
  `ℹ️ *كيف يعمل السحب؟*\n\n` +
  `${SEP}\n` +
  `🔹 *المعالجة يدوية*\n` +
  `يراجع فريق الدعم كل طلب سحب قبل تنفيذه.\n\n` +
  `🔹 *الشبكة المدعومة*\n` +
  `TRC20 فقط. لا تُرسل عبر أي شبكة أخرى.\n\n` +
  `🔹 *الرسوم*\n` +
  `5 بالمئة تُخصم من كل عملية سحب.\n\n` +
  `🔹 *مدة المعالجة*\n` +
  `من1 الى 2أيام عمل.\n\n` +
  `🔹 *إيقاف التداول*\n` +
  `يُوقَف التداول مؤقتًا أثناء معالجة السحب.\n\n` +
  `🔹 *الحد الأدنى*\n` +
  `${config.bot.minWithdrawal} USDT كحد أدنى لكل سحب.\n\n` +
  `${SEP}\n` +
  `📞 للاستفسار تواصل مع الدعم الفني.`;

// ─────────────────────────────────────────────────────────────────────────────
//  Account statement
// ─────────────────────────────────────────────────────────────────────────────
const statementMsg = (entries) => {
  if (!entries || entries.length === 0) {
    return `📄 *كشف الحساب*\n${SEP}\n\n_لا توجد سجلات حتى الآن._`;
  }

  let msg = `📄 *كشف الحساب* - آخر ${entries.length} عمليات\n${SEP}\n\n`;

  entries.forEach((e, i) => {
    const typeLabel   = STATEMENT_TYPE_AR[e.type] || e.type;
    const statusLabel = STATUS_AR[e.status]        || e.status;
    const desc        = e.descriptionAr            || e.description;
    const date        = formatDate(e.createdAt);

    msg += `*${i + 1}. ${typeLabel}*\n`;
    msg += `📝 ${desc}\n`;
    if (e.amount > 0) msg += `💵 المبلغ: ${e.amount} USDT\n`;
    msg += `📊 الحالة: ${statusLabel}\n`;
    msg += `🕐 ${date}\n`;
    msg += `${SEP}\n\n`;
  });

  return msg;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Generic
// ─────────────────────────────────────────────────────────────────────────────
const errorMsg  = () => `❌ حدث خطأ، يرجى المحاولة مرة أخرى.`;
const cancelMsg = () => `✅ تم الإلغاء.\n\n👇 اختر من القائمة:`;

module.exports = {
  welcomeMsg,
  mainMenuMsg,
  depositMsg,
  askCapitalMsg,
  accountLevelsMsg,
  accountDashboardMsg,
  botStartedMsg,
  botStoppedMsg,
  withdrawInfoMsg,
  askWithdrawAmountMsg,
  withdrawConfirmMsg,
  howItWorksMsg,
  statementMsg,
  errorMsg,
  cancelMsg,
};
