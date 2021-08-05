"use strict";

exports.__esModule = true;
exports.default = void 0;

var _namespace = _interopRequireDefault(require("./namespace"));

var _types = require("./types");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var Tag =
/*#__PURE__*/
function (_Namespace) {
  _inheritsLoose(Tag, _Namespace);

  function Tag(opts) {
    var _this;

    _this = _Namespace.call(this, opts) || this;
    _this.type = _types.TAG;
    return _this;
  }

  return Tag;
}(_namespace.default);

exports.default = Tag;
module.exports = exports.default;