"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _stylehacks = require("stylehacks");

var _canMerge = _interopRequireDefault(require("../canMerge"));

var _getDecls = _interopRequireDefault(require("../getDecls"));

var _minifyTrbl = _interopRequireDefault(require("../minifyTrbl"));

var _parseTrbl = _interopRequireDefault(require("../parseTrbl"));

var _insertCloned = _interopRequireDefault(require("../insertCloned"));

var _mergeRules = _interopRequireDefault(require("../mergeRules"));

var _mergeValues = _interopRequireDefault(require("../mergeValues"));

var _remove = _interopRequireDefault(require("../remove"));

var _trbl = _interopRequireDefault(require("../trbl"));

var _isCustomProp = _interopRequireDefault(require("../isCustomProp"));

var _canExplode = _interopRequireDefault(require("../canExplode"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = prop => {
  const properties = _trbl.default.map(direction => `${prop}-${direction}`);

  const cleanup = rule => {
    let decls = (0, _getDecls.default)(rule, [prop].concat(properties));

    while (decls.length) {
      const lastNode = decls[decls.length - 1]; // remove properties of lower precedence

      const lesser = decls.filter(node => !(0, _stylehacks.detect)(lastNode) && !(0, _stylehacks.detect)(node) && node !== lastNode && node.important === lastNode.important && lastNode.prop === prop && node.prop !== lastNode.prop);
      lesser.forEach(_remove.default);
      decls = decls.filter(node => !~lesser.indexOf(node)); // get duplicate properties

      let duplicates = decls.filter(node => !(0, _stylehacks.detect)(lastNode) && !(0, _stylehacks.detect)(node) && node !== lastNode && node.important === lastNode.important && node.prop === lastNode.prop && !(!(0, _isCustomProp.default)(node) && (0, _isCustomProp.default)(lastNode)));
      duplicates.forEach(_remove.default);
      decls = decls.filter(node => node !== lastNode && !~duplicates.indexOf(node));
    }
  };

  const processor = {
    explode: rule => {
      rule.walkDecls(new RegExp('^' + prop + '$', 'i'), decl => {
        if (!(0, _canExplode.default)(decl)) {
          return;
        }

        if ((0, _stylehacks.detect)(decl)) {
          return;
        }

        const values = (0, _parseTrbl.default)(decl.value);

        _trbl.default.forEach((direction, index) => {
          (0, _insertCloned.default)(decl.parent, decl, {
            prop: properties[index],
            value: values[index]
          });
        });

        decl.remove();
      });
    },
    merge: rule => {
      (0, _mergeRules.default)(rule, properties, (rules, lastNode) => {
        if ((0, _canMerge.default)(rules) && !rules.some(_stylehacks.detect)) {
          (0, _insertCloned.default)(lastNode.parent, lastNode, {
            prop,
            value: (0, _minifyTrbl.default)((0, _mergeValues.default)(...rules))
          });
          rules.forEach(_remove.default);
          return true;
        }
      });
      cleanup(rule);
    }
  };
  return processor;
};

exports.default = _default;
module.exports = exports.default;