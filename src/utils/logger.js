/**
 * FairWork Structured Application Logger
 * Provides high-performance, structured JSON logging with correlation IDs and log levels.
 */

const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};

const CURRENT_LEVEL = process.env.NODE_ENV === 'test' ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;

class Logger {
  constructor(context = 'FairWork') {
    this.context = context;
  }

  _format(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...meta
    });
  }

  debug(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      process.stdout.write(this._format('DEBUG', message, meta) + '\n');
    }
  }

  info(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      process.stdout.write(this._format('INFO', message, meta) + '\n');
    }
  }

  warn(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      process.stderr.write(this._format('WARN', message, meta) + '\n');
    }
  }

  error(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      process.stderr.write(this._format('ERROR', message, meta) + '\n');
    }
  }
}

export const logger = new Logger();
