"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._setStdio = _setStdio;
exports.writeOut = writeOut;
exports.persistMessage = persistMessage;
exports.updateSpinner = updateSpinner;
exports.persistSpinner = persistSpinner;
exports.resetWindow = resetWindow;
exports.table = table;
exports.isTTY = void 0;

function _readline() {
  const data = _interopRequireDefault(require("readline"));

  _readline = function () {
    return data;
  };

  return data;
}

function _ora() {
  const data = _interopRequireDefault(require("ora"));

  _ora = function () {
    return data;
  };

  return data;
}

function _stringWidth() {
  const data = _interopRequireDefault(require("string-width"));

  _stringWidth = function () {
    return data;
  };

  return data;
}

var _utils = require("./utils");

var emoji = _interopRequireWildcard(require("./emoji"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const isTTY = // $FlowFixMe
process.env.NODE_ENV !== 'test' && process.stdout.isTTY;
exports.isTTY = isTTY;
let stdout = process.stdout;
let stderr = process.stderr; // Some state so we clear the output properly

let lineCount = 0;
let errorLineCount = 0;
let statusPersisted = false;

function _setStdio(stdoutLike, stderrLike) {
  stdout = stdoutLike;
  stderr = stderrLike;
}

let spinner = (0, _ora().default)({
  color: 'green',
  stream: stdout,
  discardStdin: false
});
let persistedMessages = [];

function writeOut(message, isError = false) {
  let processedMessage = message + '\n';
  let hasSpinner = spinner.isSpinning; // Stop spinner so we don't duplicate it

  if (hasSpinner) {
    spinner.stop();
  }

  let lines = (0, _utils.countLines)(message);

  if (isError) {
    stderr.write(processedMessage);
    errorLineCount += lines;
  } else {
    stdout.write(processedMessage);
    lineCount += lines;
  } // Restart the spinner


  if (hasSpinner) {
    spinner.start();
  }
}

function persistMessage(message) {
  if (persistedMessages.includes(message)) return;
  persistedMessages.push(message);
  writeOut(message);
}

function updateSpinner(message) {
  // This helps the spinner play well with the tests
  if (!isTTY) {
    writeOut(message);
    return;
  }

  spinner.text = message + '\n';

  if (!spinner.isSpinning) {
    spinner.start();
  }
}

function persistSpinner(name, status, message) {
  spinner.stopAndPersist({
    symbol: emoji[status],
    text: message
  });
  statusPersisted = true;
}

function clearStream(stream, lines) {
  if (!isTTY) return;

  _readline().default.moveCursor(stream, 0, -lines);

  _readline().default.clearScreenDown(stream);
} // Reset the window's state


function resetWindow() {
  if (!isTTY) return; // If status has been persisted we add a line
  // Otherwise final states would remain in the terminal for rebuilds

  if (statusPersisted) {
    lineCount++;
    statusPersisted = false;
  }

  clearStream(stderr, errorLineCount);
  errorLineCount = 0;
  clearStream(stdout, lineCount);
  lineCount = 0;

  for (let m of persistedMessages) {
    writeOut(m);
  }
}

function table(columns, table) {
  // Measure column widths
  let colWidths = [];

  for (let row of table) {
    let i = 0;

    for (let item of row) {
      colWidths[i] = Math.max(colWidths[i] || 0, (0, _stringWidth().default)(item));
      i++;
    }
  } // Render rows


  for (let row of table) {
    let items = row.map((item, i) => {
      // Add padding between columns unless the alignment is the opposite to the
      // next column and pad to the column width.
      let padding = !columns[i + 1] || columns[i + 1].align === columns[i].align ? 4 : 0;
      return (0, _utils.pad)(item, colWidths[i] + padding, columns[i].align);
    });
    writeOut(items.join(''));
  }
}