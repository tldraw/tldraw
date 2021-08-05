"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _browserslist = _interopRequireDefault(require("browserslist"));

var _cssnanoUtils = require("cssnano-utils");

var _ensureCompatibility = require("./lib/ensureCompatibility");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {postcss.Declaration} a
 * @param {postcss.Declaration} b
 * @return {boolean}
 */
function declarationIsEqual(a, b) {
  return a.important === b.important && a.prop === b.prop && a.value === b.value;
}
/**
 * @param {postcss.Declaration[]} array
 * @param {postcss.Declaration} decl
 * @return {number}
 */


function indexOfDeclaration(array, decl) {
  return array.findIndex(d => declarationIsEqual(d, decl));
}
/**
 * Returns filtered array of matched or unmatched declarations
 * @param {postcss.Declaration[]} a
 * @param {postcss.Declaration[]} b
 * @param {boolean} [not=false]
 * @return {postcss.Declaration[]}
 */


function intersect(a, b, not) {
  return a.filter(c => {
    const index = ~indexOfDeclaration(b, c);
    return not ? !index : index;
  });
}
/**
 * @param {postcss.Declaration[]} a
 * @param {postcss.Declaration[]} b
 * @return {boolean}
 */


function sameDeclarationsAndOrder(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((d, index) => declarationIsEqual(d, b[index]));
}
/**
 * @param {postcss.Rule} ruleA
 * @param {postcss.Rule} ruleB
 * @param {string[]=} browsers
 * @param {Object.<string, boolean>=} compatibilityCache
 * @return {boolean}
 */


function canMerge(ruleA, ruleB, browsers, compatibilityCache) {
  const a = ruleA.selectors;
  const b = ruleB.selectors;
  const selectors = a.concat(b);

  if (!(0, _ensureCompatibility.ensureCompatibility)(selectors, browsers, compatibilityCache)) {
    return false;
  }

  const parent = (0, _cssnanoUtils.sameParent)(ruleA, ruleB);
  const {
    name
  } = ruleA.parent;

  if (parent && name && ~name.indexOf('keyframes')) {
    return false;
  }

  return parent && (selectors.every(_ensureCompatibility.noVendor) || (0, _ensureCompatibility.sameVendor)(a, b));
}
/**
 * @param {postcss.Rule} rule
 * @return {postcss.Declaration[]}
 */


function getDecls(rule) {
  return rule.nodes.filter(node => node.type === 'decl');
}

const joinSelectors = (...rules) => rules.map(s => s.selector).join();

function ruleLength(...rules) {
  return rules.map(r => r.nodes.length ? String(r) : '').join('').length;
}
/**
 * @param {string} prop
 * @return {{prefix: string, base:string, rest:string[]}}
 */


function splitProp(prop) {
  // Treat vendor prefixed properties as if they were unprefixed;
  // moving them when combined with non-prefixed properties can
  // cause issues. e.g. moving -webkit-background-clip when there
  // is a background shorthand definition.
  const parts = prop.split('-');

  if (prop[0] !== '-') {
    return {
      prefix: '',
      base: parts[0],
      rest: parts.slice(1)
    };
  } // Don't split css variables


  if (prop[1] === '-') {
    return {
      prefix: null,
      base: null,
      rest: [prop]
    };
  } // Found prefix


  return {
    prefix: parts[1],
    base: parts[2],
    rest: parts.slice(3)
  };
}
/**
 * @param {string} propA
 * @param {string} propB
 */


function isConflictingProp(propA, propB) {
  if (propA === propB) {
    // Same specificity
    return true;
  }

  const a = splitProp(propA);
  const b = splitProp(propB); // Don't resort css variables

  if (!a.base && !b.base) {
    return true;
  } // Different base;


  if (a.base !== b.base) {
    return false;
  } // Conflict if rest-count mismatches


  if (a.rest.length !== b.rest.length) {
    return true;
  } // Conflict if rest parameters are equal (same but unprefixed)


  return a.rest.every((s, index) => b.rest[index] === s);
}
/**
 * @param {postcss.Rule} first
 * @param {postcss.Rule} second
 * @return {boolean} merged
 */


function mergeParents(first, second) {
  // Null check for detached rules
  if (!first.parent || !second.parent) {
    return false;
  } // Check if parents share node


  if (first.parent === second.parent) {
    return false;
  } // sameParent() already called by canMerge()


  second.remove();
  first.parent.append(second);
  return true;
}
/**
 * @param {postcss.Rule} first
 * @param {postcss.Rule} second
 * @return {postcss.Rule} mergedRule
 */


function partialMerge(first, second) {
  let intersection = intersect(getDecls(first), getDecls(second));

  if (!intersection.length) {
    return second;
  }

  let nextRule = second.next();

  if (!nextRule) {
    // Grab next cousin
    const parentSibling = second.parent.next();
    nextRule = parentSibling && parentSibling.nodes && parentSibling.nodes[0];
  }

  if (nextRule && nextRule.type === 'rule' && canMerge(second, nextRule)) {
    let nextIntersection = intersect(getDecls(second), getDecls(nextRule));

    if (nextIntersection.length > intersection.length) {
      mergeParents(second, nextRule);
      first = second;
      second = nextRule;
      intersection = nextIntersection;
    }
  }

  const firstDecls = getDecls(first); // Filter out intersections with later conflicts in First

  intersection = intersection.filter((decl, intersectIndex) => {
    const indexOfDecl = indexOfDeclaration(firstDecls, decl);
    const nextConflictInFirst = firstDecls.slice(indexOfDecl + 1).filter(d => isConflictingProp(d.prop, decl.prop));

    if (!nextConflictInFirst.length) {
      return true;
    }

    const nextConflictInIntersection = intersection.slice(intersectIndex + 1).filter(d => isConflictingProp(d.prop, decl.prop));

    if (!nextConflictInIntersection.length) {
      return false;
    }

    if (nextConflictInFirst.length !== nextConflictInIntersection.length) {
      return false;
    }

    return nextConflictInFirst.every((d, index) => declarationIsEqual(d, nextConflictInIntersection[index]));
  }); // Filter out intersections with previous conflicts in Second

  const secondDecls = getDecls(second);
  intersection = intersection.filter(decl => {
    const nextConflictIndex = secondDecls.findIndex(d => isConflictingProp(d.prop, decl.prop));

    if (nextConflictIndex === -1) {
      return false;
    }

    if (!declarationIsEqual(secondDecls[nextConflictIndex], decl)) {
      return false;
    }

    if (decl.prop.toLowerCase() !== 'direction' && decl.prop.toLowerCase() !== 'unicode-bidi' && secondDecls.some(declaration => declaration.prop.toLowerCase() === 'all')) {
      return false;
    }

    secondDecls.splice(nextConflictIndex, 1);
    return true;
  });

  if (!intersection.length) {
    // Nothing to merge
    return second;
  }

  const receivingBlock = second.clone();
  receivingBlock.selector = joinSelectors(first, second);
  receivingBlock.nodes = [];
  second.parent.insertBefore(second, receivingBlock);
  const firstClone = first.clone();
  const secondClone = second.clone();
  /**
   * @param {function(postcss.Declaration):void} callback
   * @return {function(postcss.Declaration)}
   */

  function moveDecl(callback) {
    return decl => {
      if (~indexOfDeclaration(intersection, decl)) {
        callback.call(this, decl);
      }
    };
  }

  firstClone.walkDecls(moveDecl(decl => {
    decl.remove();
    receivingBlock.append(decl);
  }));
  secondClone.walkDecls(moveDecl(decl => decl.remove()));
  const merged = ruleLength(firstClone, receivingBlock, secondClone);
  const original = ruleLength(first, second);

  if (merged < original) {
    first.replaceWith(firstClone);
    second.replaceWith(secondClone);
    [firstClone, receivingBlock, secondClone].forEach(r => {
      if (!r.nodes.length) {
        r.remove();
      }
    });

    if (!secondClone.parent) {
      return receivingBlock;
    }

    return secondClone;
  } else {
    receivingBlock.remove();
    return second;
  }
}
/**
 * @param {string[]} browsers
 * @param {Object.<string, boolean>} compatibilityCache
 * @return {function(postcss.Rule)}
 */


function selectorMerger(browsers, compatibilityCache) {
  /** @type {postcss.Rule} */
  let cache = null;
  return function (rule) {
    // Prime the cache with the first rule, or alternately ensure that it is
    // safe to merge both declarations before continuing
    if (!cache || !canMerge(rule, cache, browsers, compatibilityCache)) {
      cache = rule;
      return;
    } // Ensure that we don't deduplicate the same rule; this is sometimes
    // caused by a partial merge


    if (cache === rule) {
      cache = rule;
      return;
    } // Parents merge: check if the rules have same parents, but not same parent nodes


    mergeParents(cache, rule); // Merge when declarations are exactly equal
    // e.g. h1 { color: red } h2 { color: red }

    if (sameDeclarationsAndOrder(getDecls(rule), getDecls(cache))) {
      rule.selector = joinSelectors(cache, rule);
      cache.remove();
      cache = rule;
      return;
    } // Merge when both selectors are exactly equal
    // e.g. a { color: blue } a { font-weight: bold }


    if (cache.selector === rule.selector) {
      const cached = getDecls(cache);
      rule.walk(decl => {
        if (~indexOfDeclaration(cached, decl)) {
          return decl.remove();
        }

        cache.append(decl);
      });
      rule.remove();
      return;
    } // Partial merge: check if the rule contains a subset of the last; if
    // so create a joined selector with the subset, if smaller.


    cache = partialMerge(cache, rule);
  };
}

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-merge-rules',

    prepare(result) {
      const resultOpts = result.opts || {};
      const browsers = (0, _browserslist.default)(null, {
        stats: resultOpts.stats,
        path: __dirname,
        env: resultOpts.env
      });
      const compatibilityCache = {};
      return {
        OnceExit(css) {
          css.walkRules(selectorMerger(browsers, compatibilityCache));
        }

      };
    }

  };
}

pluginCreator.postcss = true;
var _default = pluginCreator;
exports.default = _default;
module.exports = exports.default;