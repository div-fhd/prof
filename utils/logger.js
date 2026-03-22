'use strict';

const ts = () => new Date().toISOString();

const logger = {
  info:  (msg, ...a) => console.log(`[INFO]  ${ts()} ${msg}`, ...a),
  warn:  (msg, ...a) => console.warn(`[WARN]  ${ts()} ${msg}`, ...a),
  error: (msg, ...a) => console.error(`[ERROR] ${ts()} ${msg}`, ...a),
  debug: (msg, ...a) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${ts()} ${msg}`, ...a);
    }
  },
};

module.exports = logger;
