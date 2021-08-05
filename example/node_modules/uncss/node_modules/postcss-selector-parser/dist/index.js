"use strict";

exports.__esModule = true;
exports.default = void 0;

var _processor = _interopRequireDefault(require("./processor"));

var selectors = _interopRequireWildcard(require("./selectors"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var parser = function parser(processor) {
  return new _processor.default(processor);
};

Object.assign(parser, selectors);
delete parser.__esModule;
var _default = parser;
exports.default = _default;
module.exports = exports.default;