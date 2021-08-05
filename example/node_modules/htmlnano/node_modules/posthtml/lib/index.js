const pkg = require('../package.json')
const Api = require('./api.js')

let { default: parser } = require('posthtml-parser')
let render = require('posthtml-render')

/**
 * @author Ivan Voischev (@voischev),
 *         Ivan Demidov (@scrum)
 *
 * @requires api
 * @requires posthtml-parser
 * @requires posthtml-render
 *
 * @constructor PostHTML
 * @param {Array} plugins - An array of PostHTML plugins
 */
class PostHTML {
  constructor (plugins) {
  /**
   * PostHTML Instance
   *
   * @prop plugins
   * @prop options
   */
    this.version = pkg.version
    this.name = pkg.name
    this.plugins = typeof plugins === 'function' ? [plugins] : plugins || []
    this.source = ''

    /**
     * Tree messages to store and pass metadata between plugins
     *
     * @memberof tree
     * @type {Array} messages
     *
     * @example
     * ```js
     * export default function plugin (options = {}) {
     *   return function (tree) {
     *      tree.messages.push({
     *        type: 'dependency',
     *        file: 'path/to/dependency.html',
     *        from: tree.options.from
     *      })
     *
     *      return tree
     *   }
     * }
     * ```
     */
    this.messages = []

    /**
     * Tree method parsing string inside plugins.
     *
     * @memberof tree
     * @type {Function} parser
     *
     * @example
     * ```js
     * export default function plugin (options = {}) {
     *   return function (tree) {
     *      tree.match({ tag: 'include' }, function(node) {
     *          node.tag = false;
     *          node.content = tree.parser(fs.readFileSync(node.attr.src))
     *          return node
     *      })
     *
     *      return tree
     *   }
     * }
     * ```
     */
    this.parser = parser

    /**
     * Tree method rendering tree to string inside plugins.
     *
     * @memberof tree
     * @type {Function} render
     *
     * @example
     * ```js
     * export default function plugin (options = {}) {
     *    return function (tree) {
     *      var outherTree = ['\n', {tag: 'div', content: ['1']}, '\n\t', {tag: 'div', content: ['2']}, '\n'];
     *      var htmlWitchoutSpaceless = tree.render(outherTree).replace(/[\n|\t]/g, '');
     *      return tree.parser(htmlWitchoutSpaceless)
     *    }
     * }
     * ```
     */
    this.render = render

    // extend api methods
    Api.call(this)
  }

  /**
  * @this posthtml
  * @param   {Function} plugin - A PostHTML plugin
  * @returns {Constructor} - this(PostHTML)
  *
  * **Usage**
  * ```js
  * ph.use((tree) => { tag: 'div', content: tree })
  *   .process('<html>..</html>', {})
  *   .then((result) => result))
  * ```
  */
  use (...args) {
    this.plugins.push(...args)

    return this
  }

  /**
   * @param   {String} html - Input (HTML)
   * @param   {?Object} options - PostHTML Options
   * @returns {Object<{html: String, tree: PostHTMLTree}>} - Sync Mode
   * @returns {Promise<{html: String, tree: PostHTMLTree}>} - Async Mode (default)
   *
   * **Usage**
   *
   * **Sync**
   * ```js
   * ph.process('<html>..</html>', { sync: true }).html
   * ```
   *
   * **Async**
   * ```js
   * ph.process('<html>..</html>', {}).then((result) => result))
   * ```
   */
  process (tree, options = {}) {
    /**
     * ## PostHTML Options
     *
     * @type {Object}
     * @prop {?Boolean} options.sync - enables sync mode, plugins will run synchronously, throws an error when used with async plugins
     * @prop {?Function} options.parser - use custom parser, replaces default (posthtml-parser)
     * @prop {?Function} options.render - use custom render, replaces default (posthtml-render)
     * @prop {?Boolean} options.skipParse - disable parsing
     * @prop {?Array} options.directives - Adds processing of custom [directives](https://github.com/posthtml/posthtml-parser#directives).
     */
    this.options = options
    this.source = tree

    if (options.parser) parser = this.parser = options.parser
    if (options.render) render = this.render = options.render

    tree = options.skipParse
      ? tree || []
      : parser(tree, options)

    tree = [].concat(tree)

    // sync mode
    if (options.sync === true) {
      this.plugins.forEach((plugin, index) => {
        _treeExtendApi(tree, this)

        let result

        if (plugin.length === 2 || isPromise(result = plugin(tree))) {
          throw new Error(
            `Can’t process contents in sync mode because of async plugin: ${plugin.name}`
          )
        }

        // clearing the tree of options
        if (index !== this.plugins.length - 1 && !options.skipParse) {
          tree = [].concat(tree)
        }

        // return the previous tree unless result is fulfilled
        tree = result || tree
      })

      return lazyResult(render, tree)
    }

    // async mode
    let i = 0

    const next = (result, cb) => {
      _treeExtendApi(result, this)

      // all plugins called
      if (this.plugins.length <= i) {
        cb(null, result)
        return
      }

      // little helper to go to the next iteration
      function _next (res) {
        if (res && !options.skipParse) {
          res = [].concat(res)
        }

        return next(res || result, cb)
      }

      // call next
      const plugin = this.plugins[i++]

      if (plugin.length === 2) {
        plugin(result, (err, res) => {
          if (err) return cb(err)
          _next(res)
        })
        return
      }

      // sync and promised plugins
      let err = null

      const res = tryCatch(() => plugin(result), e => {
        err = e
        return e
      })

      if (err) {
        cb(err)
        return
      }

      if (isPromise(res)) {
        res.then(_next).catch(cb)
        return
      }

      _next(res)
    }

    return new Promise((resolve, reject) => {
      next(tree, (err, tree) => {
        if (err) reject(err)
        else resolve(lazyResult(render, tree))
      })
    })
  }
}

/**
 * @exports posthtml
 *
 * @param  {Array} plugins
 * @return {Function} posthtml
 *
 * **Usage**
 * ```js
 * import posthtml from 'posthtml'
 * import plugin from 'posthtml-plugin'
 *
 * const ph = posthtml([ plugin() ])
 * ```
 */
module.exports = plugins => new PostHTML(plugins)

/**
 * Extension of options tree
 *
 * @private
 *
 * @param   {Array}    tree
 * @param   {Object}   PostHTML
 * @returns {?*}
 */
function _treeExtendApi (t, _t) {
  if (typeof t === 'object') {
    t = Object.assign(t, _t)
  }
}

/**
 * Checks if parameter is a Promise (or thenable) object.
 *
 * @private
 *
 * @param   {*} promise - Target `{}` to test
 * @returns {Boolean}
 */
function isPromise (promise) {
  return !!promise && typeof promise.then === 'function'
}

/**
 * Simple try/catch helper, if exists, returns result
 *
 * @private
 *
 * @param   {Function} tryFn - try block
 * @param   {Function} catchFn - catch block
 * @returns {?*}
 */
function tryCatch (tryFn, catchFn) {
  try {
    return tryFn()
  } catch (err) {
    catchFn(err)
  }
}

/**
 * Wraps the PostHTMLTree within an object using a getter to render HTML on demand.
 *
 * @private
 *
 * @param   {Function} render
 * @param   {Array}    tree
 * @returns {Object<{html: String, tree: Array}>}
 */
function lazyResult (render, tree) {
  return {
    get html () {
      return render(tree, tree.options)
    },
    tree,
    messages: tree.messages
  }
}
