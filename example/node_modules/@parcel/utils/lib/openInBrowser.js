"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = openInBrowser;

function _open() {
  const data = _interopRequireDefault(require("open"));

  _open = function () {
    return data;
  };

  return data;
}

function _child_process() {
  const data = require("child_process");

  _child_process = function () {
    return data;
  };

  return data;
}

function _logger() {
  const data = _interopRequireDefault(require("@parcel/logger"));

  _logger = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Chrome app name is platform dependent. we should not hard code it.
// https://github.com/react-native-community/cli/blob/e2be8a905285d9b37512fc78c9755b9635ecf805/packages/cli/src/commands/server/launchDebugger.ts#L28
function getChromeAppName() {
  switch (process.platform) {
    case 'darwin':
      return 'google chrome';

    case 'win32':
      return 'chrome';

    case 'linux':
      if (commandExistsUnixSync('google-chrome')) {
        return 'google-chrome';
      }

      if (commandExistsUnixSync('chromium-browser')) {
        return 'chromium-browser';
      }

      return 'chromium';

    default:
      return 'google-chrome';
  }
}

function commandExistsUnixSync(commandName) {
  try {
    const stdout = (0, _child_process().execSync)(`command -v ${commandName} 2>/dev/null` + ` && { echo >&1 '${commandName} found'; exit 0; }`);
    return !!stdout;
  } catch (error) {
    return false;
  }
}

function getAppName(appName) {
  if (['google', 'chrome'].includes(appName)) {
    return getChromeAppName();
  } else if (['brave', 'Brave'].includes(appName)) {
    return 'Brave Browser';
  } else return appName;
}

async function openInBrowser(url, browser) {
  try {
    const options = typeof browser === 'string' && browser.length > 0 ? {
      app: [getAppName(browser)]
    } : undefined;
    await (0, _open().default)(url, options);
  } catch (err) {
    _logger().default.error(`Unexpected error while opening in browser: ${browser}`, '@parcel/utils');

    _logger().default.error(err, '@parcel/utils');
  }
}