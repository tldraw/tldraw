"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _postcssValueParser = _interopRequireDefault(require("postcss-value-parser"));

var _animation = _interopRequireDefault(require("./rules/animation"));

var _border = _interopRequireDefault(require("./rules/border"));

var _boxShadow = _interopRequireDefault(require("./rules/boxShadow"));

var _flexFlow = _interopRequireDefault(require("./rules/flexFlow"));

var _transition = _interopRequireDefault(require("./rules/transition"));

var _grid = require("./rules/grid");

var _listStyle = _interopRequireDefault(require("./rules/listStyle"));

var _columns = require("./rules/columns");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// rules
const borderRules = {
  border: _border.default,
  'border-block': _border.default,
  'border-inline': _border.default,
  'border-block-end': _border.default,
  'border-block-start': _border.default,
  'border-inline-end': _border.default,
  'border-inline-start': _border.default,
  'border-top': _border.default,
  'border-right': _border.default,
  'border-bottom': _border.default,
  'border-left': _border.default
};
const grid = {
  'grid-auto-flow': _grid.normalizeGridAutoFlow,
  'grid-column-gap': _grid.normalizeGridColumnRowGap,
  // normal | <length-percentage>
  'grid-row-gap': _grid.normalizeGridColumnRowGap,
  // normal | <length-percentage>
  'grid-column': _grid.normalizeGridColumnRow,
  // <grid-line>+
  'grid-row': _grid.normalizeGridColumnRow,
  // <grid-line>+
  'grid-row-start': _grid.normalizeGridColumnRow,
  // <grid-line>
  'grid-row-end': _grid.normalizeGridColumnRow,
  // <grid-line>
  'grid-column-start': _grid.normalizeGridColumnRow,
  // <grid-line>
  'grid-column-end': _grid.normalizeGridColumnRow // <grid-line>

};
const columnRules = {
  'column-rule': _columns.columnsRule,
  columns: _columns.column
};
const rules = {
  animation: _animation.default,
  outline: _border.default,
  'box-shadow': _boxShadow.default,
  'flex-flow': _flexFlow.default,
  'list-style': _listStyle.default,
  transition: _transition.default,
  ...borderRules,
  ...grid,
  ...columnRules
};

function vendorUnprefixed(prop) {
  return prop.replace(/^-\w+-/, '');
}

function isVariableFunctionNode(node) {
  if (node.type !== 'function') {
    return false;
  }

  return ['var', 'env'].includes(node.value.toLowerCase());
}

function shouldAbort(parsed) {
  let abort = false;
  parsed.walk(node => {
    if (node.type === 'comment' || isVariableFunctionNode(node) || node.type === 'word' && ~node.value.indexOf(`___CSS_LOADER_IMPORT___`)) {
      abort = true;
      return false;
    }
  });
  return abort;
}

function getValue(decl) {
  let {
    value,
    raws
  } = decl;

  if (raws && raws.value && raws.value.raw) {
    value = raws.value.raw;
  }

  return value;
}

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-ordered-values',

    prepare() {
      const cache = {};
      return {
        OnceExit(css) {
          css.walkDecls(decl => {
            const lowerCasedProp = decl.prop.toLowerCase();
            const normalizedProp = vendorUnprefixed(lowerCasedProp);
            const processor = rules[normalizedProp];

            if (!processor) {
              return;
            }

            const value = getValue(decl);

            if (cache[value]) {
              decl.value = cache[value];
              return;
            }

            const parsed = (0, _postcssValueParser.default)(value);

            if (parsed.nodes.length < 2 || shouldAbort(parsed)) {
              cache[value] = value;
              return;
            }

            const result = processor(parsed);
            decl.value = result.toString();
            cache[value] = result.toString();
          });
        }

      };
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;