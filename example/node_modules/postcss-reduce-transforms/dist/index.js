"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _postcssValueParser = _interopRequireWildcard(require("postcss-value-parser"));

var _cssnanoUtils = require("cssnano-utils");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function getValues(list, node, index) {
  if (index % 2 === 0) {
    let value = NaN;

    if (node.type === 'function' && (node.value === 'var' || node.value === 'env') && node.nodes.length === 1) {
      value = (0, _postcssValueParser.stringify)(node.nodes);
    } else if (node.type === 'word') {
      value = parseFloat(node.value);
    }

    return [...list, value];
  }

  return list;
}

function matrix3d(node, values) {
  if (values.length !== 16) {
    return;
  } // matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1) => matrix(a, b, c, d, tx, ty)


  if (values[15] && values[2] === 0 && values[3] === 0 && values[6] === 0 && values[7] === 0 && values[8] === 0 && values[9] === 0 && values[10] === 1 && values[11] === 0 && values[14] === 0 && values[15] === 1) {
    const {
      nodes
    } = node;
    node.value = 'matrix';
    node.nodes = [nodes[0], // a
    nodes[1], // ,
    nodes[2], // b
    nodes[3], // ,
    nodes[8], // c
    nodes[9], // ,
    nodes[10], // d
    nodes[11], // ,
    nodes[24], // tx
    nodes[25], // ,
    nodes[26] // ty
    ];
  }
}

const rotate3dMappings = [['rotateX', [1, 0, 0]], // rotate3d(1, 0, 0, a) => rotateX(a)
['rotateY', [0, 1, 0]], // rotate3d(0, 1, 0, a) => rotateY(a)
['rotate', [0, 0, 1]] // rotate3d(0, 0, 1, a) => rotate(a)
];
const rotate3dMatch = (0, _cssnanoUtils.getMatch)(rotate3dMappings);

function rotate3d(node, values) {
  if (values.length !== 4) {
    return;
  }

  const {
    nodes
  } = node;
  const match = rotate3dMatch(values.slice(0, 3));

  if (match.length) {
    node.value = match;
    node.nodes = [nodes[6]];
  }
}

function rotateZ(node, values) {
  if (values.length !== 1) {
    return;
  } // rotateZ(rz) => rotate(rz)


  node.value = 'rotate';
}

function scale(node, values) {
  if (values.length !== 2) {
    return;
  }

  const {
    nodes
  } = node;
  const [first, second] = values; // scale(sx, sy) => scale(sx)

  if (first === second) {
    node.nodes = [nodes[0]];
    return;
  } // scale(sx, 1) => scaleX(sx)


  if (second === 1) {
    node.value = 'scaleX';
    node.nodes = [nodes[0]];
    return;
  } // scale(1, sy) => scaleY(sy)


  if (first === 1) {
    node.value = 'scaleY';
    node.nodes = [nodes[2]];
    return;
  }
}

function scale3d(node, values) {
  if (values.length !== 3) {
    return;
  }

  const {
    nodes
  } = node;
  const [first, second, third] = values; // scale3d(sx, 1, 1) => scaleX(sx)

  if (second === 1 && third === 1) {
    node.value = 'scaleX';
    node.nodes = [nodes[0]];
    return;
  } // scale3d(1, sy, 1) => scaleY(sy)


  if (first === 1 && third === 1) {
    node.value = 'scaleY';
    node.nodes = [nodes[2]];
    return;
  } // scale3d(1, 1, sz) => scaleZ(sz)


  if (first === 1 && second === 1) {
    node.value = 'scaleZ';
    node.nodes = [nodes[4]];
    return;
  }
}

function translate(node, values) {
  if (values.length !== 2) {
    return;
  }

  const {
    nodes
  } = node; // translate(tx, 0) => translate(tx)

  if (values[1] === 0) {
    node.nodes = [nodes[0]];
    return;
  } // translate(0, ty) => translateY(ty)


  if (values[0] === 0) {
    node.value = 'translateY';
    node.nodes = [nodes[2]];
    return;
  }
}

function translate3d(node, values) {
  if (values.length !== 3) {
    return;
  }

  const {
    nodes
  } = node; // translate3d(0, 0, tz) => translateZ(tz)

  if (values[0] === 0 && values[1] === 0) {
    node.value = 'translateZ';
    node.nodes = [nodes[4]];
  }
}

const reducers = {
  matrix3d,
  rotate3d,
  rotateZ,
  scale,
  scale3d,
  translate,
  translate3d
};

function normalizeReducerName(name) {
  const lowerCasedName = name.toLowerCase();

  if (lowerCasedName === 'rotatez') {
    return 'rotateZ';
  }

  return lowerCasedName;
}

function reduce(node) {
  const {
    nodes,
    type,
    value
  } = node;
  const normalizedReducerName = normalizeReducerName(value);

  if (type === 'function' && Object.prototype.hasOwnProperty.call(reducers, normalizedReducerName)) {
    reducers[normalizedReducerName](node, nodes.reduce(getValues, []));
  }

  return false;
}

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-reduce-transforms',

    prepare() {
      const cache = {};
      return {
        OnceExit(css) {
          css.walkDecls(/transform$/i, decl => {
            const value = decl.value;

            if (!value) {
              return;
            }

            if (cache[value]) {
              decl.value = cache[value];
              return;
            }

            const result = (0, _postcssValueParser.default)(value).walk(reduce).toString();
            decl.value = result;
            cache[value] = result;
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