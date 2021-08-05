"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _alphanumSort = _interopRequireDefault(require("alphanum-sort"));

var _postcssSelectorParser = _interopRequireDefault(require("postcss-selector-parser"));

var _canUnquote = _interopRequireDefault(require("./lib/canUnquote.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const pseudoElements = ['::before', '::after', '::first-letter', '::first-line'];

function attribute(selector) {
  if (selector.value) {
    if (selector.raws.value) {
      // Join selectors that are split over new lines
      selector.raws.value = selector.raws.value.replace(/\\\n/g, '').trim();
    }

    if ((0, _canUnquote.default)(selector.value)) {
      selector.quoteMark = null;
    }

    if (selector.operator) {
      selector.operator = selector.operator.trim();
    }
  }

  selector.rawSpaceBefore = '';
  selector.rawSpaceAfter = '';
  selector.spaces.attribute = {
    before: '',
    after: ''
  };
  selector.spaces.operator = {
    before: '',
    after: ''
  };
  selector.spaces.value = {
    before: '',
    after: selector.insensitive ? ' ' : ''
  };
  selector.raws.spaces.attribute = {
    before: '',
    after: ''
  };
  selector.raws.spaces.operator = {
    before: '',
    after: ''
  };
  selector.raws.spaces.value = {
    before: '',
    after: selector.insensitive ? ' ' : ''
  };

  if (selector.insensitive) {
    selector.raws.spaces.insensitive = {
      before: '',
      after: ''
    };
  }

  selector.attribute = selector.attribute.trim();
}

function combinator(selector) {
  const value = selector.value.trim();
  selector.spaces.before = '';
  selector.spaces.after = '';
  selector.rawSpaceBefore = '';
  selector.rawsSpaceAfter = '';
  selector.value = value.length ? value : ' ';
}

const pseudoReplacements = {
  ':nth-child': ':first-child',
  ':nth-of-type': ':first-of-type',
  ':nth-last-child': ':last-child',
  ':nth-last-of-type': ':last-of-type'
};

function pseudo(selector) {
  const value = selector.value.toLowerCase();

  if (selector.nodes.length === 1 && pseudoReplacements[value]) {
    const first = selector.at(0);
    const one = first.at(0);

    if (first.length === 1) {
      if (one.value === '1') {
        selector.replaceWith(_postcssSelectorParser.default.pseudo({
          value: pseudoReplacements[value]
        }));
      }

      if (one.value.toLowerCase() === 'even') {
        one.value = '2n';
      }
    }

    if (first.length === 3) {
      const two = first.at(1);
      const three = first.at(2);

      if (one.value.toLowerCase() === '2n' && two.value === '+' && three.value === '1') {
        one.value = 'odd';
        two.remove();
        three.remove();
      }
    }

    return;
  }

  const uniques = [];
  selector.walk(child => {
    if (child.type === 'selector') {
      const childStr = String(child);

      if (!~uniques.indexOf(childStr)) {
        uniques.push(childStr);
      } else {
        child.remove();
      }
    }
  });

  if (~pseudoElements.indexOf(value)) {
    selector.value = selector.value.slice(1);
  }
}

const tagReplacements = {
  from: '0%',
  '100%': 'to'
};

function tag(selector) {
  const value = selector.value.toLowerCase();

  if (Object.prototype.hasOwnProperty.call(tagReplacements, value)) {
    selector.value = tagReplacements[value];
  }
}

function universal(selector) {
  const next = selector.next();

  if (next && next.type !== 'combinator') {
    selector.remove();
  }
}

const reducers = {
  attribute,
  combinator,
  pseudo,
  tag,
  universal
};

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-minify-selectors',

    OnceExit(css) {
      const cache = {};
      const processor = (0, _postcssSelectorParser.default)(selectors => {
        selectors.nodes = (0, _alphanumSort.default)(selectors.nodes, {
          insensitive: true
        });
        const uniqueSelectors = [];
        selectors.walk(sel => {
          const {
            type
          } = sel; // Trim whitespace around the value

          sel.spaces.before = sel.spaces.after = '';

          if (Object.prototype.hasOwnProperty.call(reducers, type)) {
            reducers[type](sel);
            return;
          }

          const toString = String(sel);

          if (type === 'selector' && sel.parent.type !== 'pseudo') {
            if (!~uniqueSelectors.indexOf(toString)) {
              uniqueSelectors.push(toString);
            } else {
              sel.remove();
            }
          }
        });
      });
      css.walkRules(rule => {
        const selector = rule.raws.selector && rule.raws.selector.value === rule.selector ? rule.raws.selector.raw : rule.selector; // If the selector ends with a ':' it is likely a part of a custom mixin,
        // so just pass through.

        if (selector[selector.length - 1] === ':') {
          return;
        }

        if (cache[selector]) {
          rule.selector = cache[selector];
          return;
        }

        const optimizedSelector = processor.processSync(selector);
        rule.selector = optimizedSelector;
        cache[selector] = optimizedSelector;
      });
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;