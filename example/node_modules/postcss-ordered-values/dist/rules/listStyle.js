"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = listStyleNormalizer;

var _postcssValueParser = _interopRequireDefault(require("postcss-value-parser"));

var _listStyleTypes = _interopRequireDefault(require("./listStyleTypes.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const definedTypes = _listStyleTypes.default['list-style-type'];
const definedPosition = ['inside', 'outside'];

function listStyleNormalizer(listStyle) {
  const order = {
    type: '',
    position: '',
    image: ''
  };
  listStyle.walk(decl => {
    if (decl.type === 'word') {
      if (definedTypes.includes(decl.value)) {
        // its a type field
        order.type = `${order.type} ${decl.value}`;
      } else if (definedPosition.includes(decl.value)) {
        order.position = `${order.position} ${decl.value}`;
      } else if (decl.value === 'none') {
        if (order.type.split(' ').filter(e => e !== '' && e !== ' ').includes('none')) {
          order.image = `${order.image} ${decl.value}`;
        } else {
          order.type = `${order.type} ${decl.value}`;
        }
      } else {
        order.type = `${order.type} ${decl.value}`;
      }
    }

    if (decl.type === 'function') {
      order.image = `${order.image} ${_postcssValueParser.default.stringify(decl)}`;
    }
  });
  return `${order.type.trim()} ${order.position.trim()} ${order.image.trim()}`.trim();
}

module.exports = exports.default;