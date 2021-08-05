"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getProgressMessage = getProgressMessage;
exports.getTerminalWidth = getTerminalWidth;
exports.pad = pad;
exports.formatFilename = formatFilename;
exports.countLines = countLines;

function _path() {
  const data = _interopRequireDefault(require("path"));

  _path = function () {
    return data;
  };

  return data;
}

function _chalk() {
  const data = _interopRequireDefault(require("chalk"));

  _chalk = function () {
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

function _termSize() {
  const data = _interopRequireDefault(require("term-size"));

  _termSize = function () {
    return data;
  };

  return data;
}

function _stripAnsi() {
  const data = _interopRequireDefault(require("strip-ansi"));

  _stripAnsi = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let terminalSize = (0, _termSize().default)();
process.stdout.on('resize', function () {
  terminalSize = (0, _termSize().default)();
});

function getProgressMessage(event) {
  switch (event.phase) {
    case 'transforming':
      return `Building ${_path().default.basename(event.filePath)}...`;

    case 'bundling':
      return 'Bundling...';

    case 'packaging':
      return `Packaging ${event.bundle.displayName}...`;

    case 'optimizing':
      return `Optimizing ${event.bundle.displayName}...`;
  }

  return null;
}

function getTerminalWidth() {
  return terminalSize;
} // Pad a string with spaces on either side


function pad(text, length, align = 'left') {
  let pad = ' '.repeat(length - (0, _stringWidth().default)(text));

  if (align === 'right') {
    return pad + text;
  }

  return text + pad;
}

function formatFilename(filename, color = _chalk().default.reset) {
  let dir = _path().default.relative(process.cwd(), _path().default.dirname(filename));

  return _chalk().default.dim(dir + (dir ? _path().default.sep : '')) + color(_path().default.basename(filename));
}

function countLines(message) {
  let {
    columns
  } = terminalSize;
  return (0, _stripAnsi().default)(message).split('\n').reduce((p, line) => p + Math.ceil(((0, _stringWidth().default)(line) || 1) / columns), 0);
}