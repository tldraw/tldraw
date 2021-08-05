'use strict';

var timsort = require('timsort');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () {
            return e[k];
          }
        });
      }
    });
  }
  n['default'] = e;
  return Object.freeze(n);
}

const shorthandData = {
  'animation': [
    'animation-name',
    'animation-duration',
    'animation-timing-function',
    'animation-delay',
    'animation-iteration-count',
    'animation-direction',
    'animation-fill-mode',
    'animation-play-state',
  ],
  'background': [
    'background-image',
    'background-size',
    'background-position',
    'background-repeat',
    'background-origin',
    'background-clip',
    'background-attachment',
    'background-color',
  ],
  'border': [
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'border-width',
    'border-style',
    'border-color',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
  ],
  'border-top': [
    'border-width',
    'border-style',
    'border-color',
    'border-top-width',
    'border-top-style',
    'border-top-color',
  ],
  'border-right': [
    'border-width',
    'border-style',
    'border-color',
    'border-right-width',
    'border-right-style',
    'border-right-color',
  ],
  'border-bottom': [
    'border-width',
    'border-style',
    'border-color',
    'border-bottom-width',
    'border-bottom-style',
    'border-bottom-color',
  ],
  'border-left': [
    'border-width',
    'border-style',
    'border-color',
    'border-left-width',
    'border-left-style',
    'border-left-color',
  ],
  'border-color': [
    'border-top-color',
    'border-bottom-color',
    'border-left-color',
    'border-right-color',
  ],
  'border-width': [
    'border-top-width',
    'border-bottom-width',
    'border-left-width',
    'border-right-width',
  ],
  'border-style': [
    'border-top-style',
    'border-bottom-style',
    'border-left-style',
    'border-right-style',
  ],
  'border-radius': [
    'border-top-right-radius',
    'border-top-left-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius',
  ],
  'border-block-start': [
    'border-block-start-width',
    'border-block-start-style',
    'border-block-start-color',
  ],
  'border-block-end': [
    'border-block-end-width',
    'border-block-end-style',
    'border-block-end-color',
  ],
  'border-image': [
    'border-image-source',
    'border-image-slice',
    'border-image-width',
    'border-image-outset',
    'border-image-repeat',
  ],
  'border-inline-start': [
    'border-inline-start-width',
    'border-inline-start-style',
    'border-inline-start-color',
  ],
  'border-inline-end': [
    'border-inline-end-width',
    'border-inline-end-style',
    'border-inline-end-color',
  ],
  'columns': [
    'column-width',
    'column-count',
  ],
  'column-rule': [
    'column-rule-width',
    'column-rule-style',
    'column-rule-color',
  ],
  'flex': [
    'flex-grow',
    'flex-shrink',
    'flex-basis',
  ],
  'flex-flow': [
    'flex-direction',
    'flex-wrap',
  ],
  'font': [
    'font-style',
    'font-variant',
    'font-weight',
    'font-stretch',
    'font-size',
    'font-family',
    'line-height',
  ],
  'grid': [
    'grid-template-rows',
    'grid-template-columns',
    'grid-template-areas',
    'grid-auto-rows',
    'grid-auto-columns',
    'grid-auto-flow',
    'column-gap',
    'row-gap',
  ],
  'grid-area': [
    'grid-row-start',
    'grid-column-start',
    'grid-row-end',
    'grid-column-end',
  ],
  'grid-column': [
    'grid-column-start',
    'grid-column-end',
  ],
  'grid-row': [
    'grid-row-start',
    'grid-row-end',
  ],
  'grid-template': [
    'grid-template-columns',
    'grid-template-rows',
    'grid-template-areas',
  ],
  'list-style': [
    'list-style-type',
    'list-style-position',
    'list-style-image',
  ],
  'margin': [
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
  ],
  'mask': [
    'mask-image',
    'mask-mode',
    'mask-position',
    'mask-size',
    'mask-repeat',
    'mask-origin',
    'mask-clip',
    'mask-composite',
  ],
  'outline': [
    'outline-color',
    'outline-style',
    'outline-width',
  ],
  'overflow': [
    'overflow-x',
    'overflow-y',
  ],
  'padding': [
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ],
  'padding-inline': [
    'padding-inline-start',
    'padding-inline-end',
  ],
  'padding-inline-start': [
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ],
  'padding-inline-end': [
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ],
  'place-content': [
    'align-content',
    'justify-content',
  ],
  'place-items': [
    'align-items',
    'justify-items',
  ],
  'place-self': [
    'align-self',
    'justify-self',
  ],
  'text-decoration': [
    'text-decoration-color',
    'text-decoration-style',
    'text-decoration-line',
  ],
  'transition': [
    'transition-delay',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
  ],
  'text-emphasis': [
    'text-emphasis-style',
    'text-emphasis-color',
  ],
};

const builtInOrders = [
  'alphabetical',
  'concentric-css',
  'smacss',
];

const pluginEntrypoint = ({ order = 'alphabetical', keepOverrides = false } = {}) => ({
  postcssPlugin: 'css-declaration-sorter',
  OnceExit (css) {
    let withKeepOverrides = comparator => comparator;
    if (keepOverrides) {
      withKeepOverrides = withOverridesComparator(shorthandData);
    }

    if (typeof order === 'function') {
      return processCss({ css, comparator: withKeepOverrides(order) });
    }

    if (!builtInOrders.includes(order))
      return Promise.reject(
        Error([
          `Invalid built-in order '${order}' provided.`,
          `Available built-in orders are: ${builtInOrders}`,
        ].join('\n'))
      );

    return Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(`../orders/${order}.cjs`)); })
      .then(({ properties }) => processCss({
        css,
        comparator: withKeepOverrides(orderComparator(properties)),
      }));
  },
});

pluginEntrypoint.postcss = true;

function processCss ({ css, comparator }) {
  const comments = [];
  const rulesCache = [];

  css.walk(node => {
    const nodes = node.nodes;
    const type = node.type;

    if (type === 'comment') {
      // Don't do anything to root comments or the last newline comment
      const isNewlineNode = node.raws.before && ~node.raws.before.indexOf('\n');
      const lastNewlineNode = isNewlineNode && !node.next();
      const onlyNode = !node.prev() && !node.next();

      if (lastNewlineNode || onlyNode || node.parent.type === 'root') {
        return;
      }

      if (isNewlineNode) {
        const pairedNode = node.next() ? node.next() : node.prev().prev();
        if (pairedNode) {
          comments.unshift({
            'comment': node,
            'pairedNode': pairedNode,
            'insertPosition': node.next() ? 'Before' : 'After',
          });
          node.remove();
        }
      } else {
        const pairedNode = node.prev() ? node.prev() : node.next().next();
        if (pairedNode) {
          comments.push({
            'comment': node,
            'pairedNode': pairedNode,
            'insertPosition': 'After',
          });
          node.remove();
        }
      }
      return;
    }

    // Add rule-like nodes to a cache so that we can remove all
    // comment nodes before we start sorting.
    const isRule = type === 'rule' || type === 'atrule';
    if (isRule && nodes && nodes.length > 1) {
      rulesCache.push(nodes);
    }
  });

  // Perform a sort once all comment nodes are removed
  rulesCache.forEach(nodes => {
    sortCssDeclarations({ nodes, comparator });
  });

  // Add comments back to the nodes they are paired with
  comments.forEach(node => {
    const pairedNode = node.pairedNode;
    node.comment.remove();
    pairedNode.parent['insert' + node.insertPosition](pairedNode, node.comment);
  });
}

function sortCssDeclarations ({ nodes, comparator }) {
  timsort.sort(nodes, (a, b) => {
    if (a.type === 'decl' && b.type === 'decl') {
      return comparator(a.prop, b.prop);
    } else {
      return compareDifferentType(a, b);
    }
  });
}

function withOverridesComparator (shorthandData) {
  return function (comparator) {
    return function (a, b) {
      a = removeVendorPrefix(a);
      b = removeVendorPrefix(b);

      if (shorthandData[a] && shorthandData[a].includes(b)) return 0;
      if (shorthandData[b] && shorthandData[b].includes(a)) return 0;

      return comparator(a, b);
    };
  };
}

function orderComparator (order) {
  return function (a, b) {
    return order.indexOf(a) - order.indexOf(b);
  };
}

function compareDifferentType (a, b) {
  if (b.type === 'atrule') {
    return 0;
  }

  return a.type === 'decl' ? -1 : b.type === 'decl' ? 1 : 0;
}

function removeVendorPrefix (property) {
  return property.replace(/^-\w+-/, '');
}

module.exports = pluginEntrypoint;
