"use strict";

exports.__esModule = true;
exports.default = void 0;

var _namespace = _interopRequireDefault(require("./namespace"));

var _types = require("./types");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Universal =
/*#__PURE__*/
function (_Namespace) {
  _inheritsLoose(Universal, _Namespace);

  function Universal(opts) {
    var _this;

    _this = _Namespace.call(this, opts) || this;
    _this.type = _types.UNIVERSAL;
    _this.value = '*';
    return _this;
  }

  return Universal;
}(_namespace.default);

exports.default = Universal;
module.exports = exports.default;