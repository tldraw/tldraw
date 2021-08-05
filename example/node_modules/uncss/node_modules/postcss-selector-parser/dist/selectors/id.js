"use strict";

exports.__esModule = true;
exports.default = void 0;

var _node = _interopRequireDefault(require("./node"));

var _types = require("./types");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var ID =
/*#__PURE__*/
function (_Node) {
  _inheritsLoose(ID, _Node);

  function ID(opts) {
    var _this;

    _this = _Node.call(this, opts) || this;
    _this.type = _types.ID;
    return _this;
  }

  var _proto = ID.prototype;

  _proto.toString = function toString() {
    return [this.rawSpaceBefore, String('#' + this.stringifyProperty("value")), this.rawSpaceAfter].join('');
  };

  return ID;
}(_node.default);

exports.default = ID;
module.exports = exports.default;