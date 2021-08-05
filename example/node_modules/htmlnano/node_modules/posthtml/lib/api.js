'use strict'

/**
 * # API
 *
 * @author Ivan Voischev (@voischev),
 *         Anton Winogradov (@awinogradov),
 *         Alexej Yaroshevich (@zxqfox),
 *         Vasiliy (@Yeti-or)
 *
 * @namespace tree
 */
function Api () {
  this.walk = walk
  this.match = match
}

/**
 * Walks the tree and passes all nodes via a callback
 *
 * @memberof tree
 *
 * @param  {Function} cb  Callback
 * @return {Function}     Callback(node)
 *
 *@example
 * ```js
 * export const walk = (tree) => {
 *   tree.walk((node) => {
 *     let classes = node.attrs && node.attrs.class.split(' ') || []
 *
 *     if (classes.includes(className)) return cb(node)
 *       return node
 *   })
 * }
 * ```
 */
function walk (cb) {
  return traverse(this, cb)
}

/**
 * Matches an expression to search for nodes in the tree
 *
 * @memberof tree
 *
 * @param  {String|RegExp|Object|Array} expression - Matcher(s) to search
 * @param  {Function} cb Callback
 *
 * @return {Function} Callback(node)
 *
 * @example
 * ```js
 * export const match = (tree) => {
 *   // Single matcher
 *   tree.match({ tag: 'custom-tag' }, (node) => {
 *     let tag = node.tag
 *
 *     Object.assign(node, { tag: 'div', attrs: {class: tag} })
 *
 *     return node
 *   })
 *   // Multiple matchers
 *   tree.match([{ tag: 'b' }, { tag: 'strong' }], (node) => {
 *     let style = 'font-weight: bold;'
 *
 *     node.tag = 'span'
 *
 *     node.attrs
 *       ? ( node.attrs.style
 *         ? ( node.attrs.style += style )
 *         : node.attrs.style = style
 *       )
 *       : node.attrs = { style: style }
 *
 *     return node
 *   })
 * }
 * ```
 */
function match (expression, cb) {
  return Array.isArray(expression)
    ? traverse(this, node => {
        for (let i = 0; i < expression.length; i++) {
          if (compare(expression[i], node)) return cb(node)
        }

        return node
      })
    : traverse(this, node => {
      if (compare(expression, node)) return cb(node)

      return node
    })
}

module.exports = Api
module.exports.match = match
module.exports.walk = walk

/** @private */
function traverse (tree, cb) {
  if (Array.isArray(tree)) {
    for (let i = 0; i < tree.length; i++) {
      tree[i] = traverse(cb(tree[i]), cb)
    }
  } else if (
    tree &&
      typeof tree === 'object' &&
      Object.prototype.hasOwnProperty.call(tree, 'content')
  ) traverse(tree.content, cb)

  return tree
}

/** @private */
function compare (expected, actual) {
  if (expected instanceof RegExp) {
    if (typeof actual === 'object') return false
    if (typeof actual === 'string') return expected.test(actual)
  }

  if (typeof expected !== typeof actual) return false
  if (typeof expected !== 'object' || expected === null) {
    return expected === actual
  }

  if (Array.isArray(expected)) {
    return expected.every(exp => [].some.call(actual, act => compare(exp, act)))
  }

  return Object.keys(expected).every(key => {
    const ao = actual[key]
    const eo = expected[key]

    if (typeof eo === 'object' && eo !== null && ao !== null) {
      return compare(eo, ao)
    }
    if (typeof eo === 'boolean') {
      return eo !== (ao == null)
    }

    return ao === eo
  })
}
