"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _commentRemover = _interopRequireDefault(require("./lib/commentRemover"));

var _commentParser = _interopRequireDefault(require("./lib/commentParser"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function pluginCreator(opts = {}) {
  const remover = new _commentRemover.default(opts);
  const matcherCache = {};
  const replacerCache = {};

  function matchesComments(source) {
    if (matcherCache[source]) {
      return matcherCache[source];
    }

    const result = (0, _commentParser.default)(source).filter(([type]) => type);
    matcherCache[source] = result;
    return result;
  }

  function replaceComments(source, space, separator = ' ') {
    const key = source + '@|@' + separator;

    if (replacerCache[key]) {
      return replacerCache[key];
    }

    const parsed = (0, _commentParser.default)(source).reduce((value, [type, start, end]) => {
      const contents = source.slice(start, end);

      if (!type) {
        return value + contents;
      }

      if (remover.canRemove(contents)) {
        return value + separator;
      }

      return `${value}/*${contents}*/`;
    }, '');
    const result = space(parsed).join(' ');
    replacerCache[key] = result;
    return result;
  }

  return {
    postcssPlugin: 'postcss-discard-comments',

    OnceExit(css, {
      list
    }) {
      css.walk(node => {
        if (node.type === 'comment' && remover.canRemove(node.text)) {
          node.remove();
          return;
        }

        if (node.raws.between) {
          node.raws.between = replaceComments(node.raws.between, list.space);
        }

        if (node.type === 'decl') {
          if (node.raws.value && node.raws.value.raw) {
            if (node.raws.value.value === node.value) {
              node.value = replaceComments(node.raws.value.raw, list.space);
            } else {
              node.value = replaceComments(node.value, list.space);
            }

            node.raws.value = null;
          }

          if (node.raws.important) {
            node.raws.important = replaceComments(node.raws.important, list.space);
            const b = matchesComments(node.raws.important);
            node.raws.important = b.length ? node.raws.important : '!important';
          }

          return;
        }

        if (node.type === 'rule' && node.raws.selector && node.raws.selector.raw) {
          node.raws.selector.raw = replaceComments(node.raws.selector.raw, list.space, '');
          return;
        }

        if (node.type === 'atrule') {
          if (node.raws.afterName) {
            const commentsReplaced = replaceComments(node.raws.afterName, list.space);

            if (!commentsReplaced.length) {
              node.raws.afterName = commentsReplaced + ' ';
            } else {
              node.raws.afterName = ' ' + commentsReplaced + ' ';
            }
          }

          if (node.raws.params && node.raws.params.raw) {
            node.raws.params.raw = replaceComments(node.raws.params.raw, list.space);
          }
        }
      });
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;