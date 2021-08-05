"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _alphanumSort = _interopRequireDefault(require("alphanum-sort"));

var _uniqs = _interopRequireDefault(require("uniqs"));

var _postcssSelectorParser = _interopRequireDefault(require("postcss-selector-parser"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function parseSelectors(selectors, callback) {
  return (0, _postcssSelectorParser.default)(callback).processSync(selectors);
}

function unique(rule) {
  rule.selector = (0, _alphanumSort.default)((0, _uniqs.default)(rule.selectors), {
    insensitive: true
  }).join();
}

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-unique-selectors',

    OnceExit(css) {
      css.walkRules(nodes => {
        let comments = [];
        nodes.selector = parseSelectors(nodes.selector, selNode => {
          selNode.walk(sel => {
            if (sel.type === 'comment') {
              comments.push(sel.value);
              sel.remove();
              return;
            } else {
              return sel;
            }
          });
        });
        unique(nodes);
        nodes.selectors = nodes.selectors.concat(comments);
      });
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;