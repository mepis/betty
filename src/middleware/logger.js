const morgan = require('morgan');
const config = require('../config');

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
  if (!req._startAt || !res._startAt) {
    return '';
  }

  const ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
    (res._startAt[1] - req._startAt[1]) * 1e-6;

  return ms.toFixed(3);
});

// Custom format with timestamp
const customFormat = ':method :url :status :response-time-ms ms - :res[content-length]';

// Create logger middleware
const logger = morgan(config.logLevel === 'dev' ? 'dev' : customFormat);

module.exports = logger;
