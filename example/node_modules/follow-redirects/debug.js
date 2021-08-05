var debug;

module.exports = function () {
  if (!debug) {
    try {
      /* eslint global-require: off */
      debug = require("debug")("follow-redirects");
    }
    catch (error) {
      debug = function () { /* */ };
    }
  }
  debug.apply(null, arguments);
};
