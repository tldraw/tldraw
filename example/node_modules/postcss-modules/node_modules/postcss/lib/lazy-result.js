"use strict";

exports.__esModule = true;
exports.default = void 0;

var _mapGenerator = _interopRequireDefault(require("./map-generator"));

var _stringify2 = _interopRequireDefault(require("./stringify"));

var _warnOnce = _interopRequireDefault(require("./warn-once"));

var _result = _interopRequireDefault(require("./result"));

var _parse = _interopRequireDefault(require("./parse"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } it = o[Symbol.iterator](); return it.next.bind(it); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function isPromise(obj) {
  return typeof obj === 'object' && typeof obj.then === 'function';
}
/**
 * A Promise proxy for the result of PostCSS transformations.
 *
 * A `LazyResult` instance is returned by {@link Processor#process}.
 *
 * @example
 * const lazy = postcss([autoprefixer]).process(css)
 */


var LazyResult = /*#__PURE__*/function () {
  function LazyResult(processor, css, opts) {
    this.stringified = false;
    this.processed = false;
    var root;

    if (typeof css === 'object' && css !== null && css.type === 'root') {
      root = css;
    } else if (css instanceof LazyResult || css instanceof _result.default) {
      root = css.root;

      if (css.map) {
        if (typeof opts.map === 'undefined') opts.map = {};
        if (!opts.map.inline) opts.map.inline = false;
        opts.map.prev = css.map;
      }
    } else {
      var parser = _parse.default;
      if (opts.syntax) parser = opts.syntax.parse;
      if (opts.parser) parser = opts.parser;
      if (parser.parse) parser = parser.parse;

      try {
        root = parser(css, opts);
      } catch (error) {
        this.error = error;
      }
    }

    this.result = new _result.default(processor, root, opts);
  }
  /**
   * Returns a {@link Processor} instance, which will be used
   * for CSS transformations.
   *
   * @type {Processor}
   */


  var _proto = LazyResult.prototype;

  /**
   * Processes input CSS through synchronous plugins
   * and calls {@link Result#warnings()}.
   *
   * @return {Warning[]} Warnings from plugins.
   */
  _proto.warnings = function warnings() {
    return this.sync().warnings();
  }
  /**
   * Alias for the {@link LazyResult#css} property.
   *
   * @example
   * lazy + '' === lazy.css
   *
   * @return {string} Output CSS.
   */
  ;

  _proto.toString = function toString() {
    return this.css;
  }
  /**
   * Processes input CSS through synchronous and asynchronous plugins
   * and calls `onFulfilled` with a Result instance. If a plugin throws
   * an error, the `onRejected` callback will be executed.
   *
   * It implements standard Promise API.
   *
   * @param {onFulfilled} onFulfilled Callback will be executed
   *                                  when all plugins will finish work.
   * @param {onRejected}  onRejected  Callback will be executed on any error.
   *
   * @return {Promise} Promise API to make queue.
   *
   * @example
   * postcss([autoprefixer]).process(css, { from: cssPath }).then(result => {
   *   console.log(result.css)
   * })
   */
  ;

  _proto.then = function then(onFulfilled, onRejected) {
    if (process.env.NODE_ENV !== 'production') {
      if (!('from' in this.opts)) {
        (0, _warnOnce.default)('Without `from` option PostCSS could generate wrong source map ' + 'and will not find Browserslist config. Set it to CSS file path ' + 'or to `undefined` to prevent this warning.');
      }
    }

    return this.async().then(onFulfilled, onRejected);
  }
  /**
   * Processes input CSS through synchronous and asynchronous plugins
   * and calls onRejected for each error thrown in any plugin.
   *
   * It implements standard Promise API.
   *
   * @param {onRejected} onRejected Callback will be executed on any error.
   *
   * @return {Promise} Promise API to make queue.
   *
   * @example
   * postcss([autoprefixer]).process(css).then(result => {
   *   console.log(result.css)
   * }).catch(error => {
   *   console.error(error)
   * })
   */
  ;

  _proto.catch = function _catch(onRejected) {
    return this.async().catch(onRejected);
  }
  /**
   * Processes input CSS through synchronous and asynchronous plugins
   * and calls onFinally on any error or when all plugins will finish work.
   *
   * It implements standard Promise API.
   *
   * @param {onFinally} onFinally Callback will be executed on any error or
   *                              when all plugins will finish work.
   *
   * @return {Promise} Promise API to make queue.
   *
   * @example
   * postcss([autoprefixer]).process(css).finally(() => {
   *   console.log('processing ended')
   * })
   */
  ;

  _proto.finally = function _finally(onFinally) {
    return this.async().then(onFinally, onFinally);
  };

  _proto.handleError = function handleError(error, plugin) {
    try {
      this.error = error;

      if (error.name === 'CssSyntaxError' && !error.plugin) {
        error.plugin = plugin.postcssPlugin;
        error.setMessage();
      } else if (plugin.postcssVersion) {
        if (process.env.NODE_ENV !== 'production') {
          var pluginName = plugin.postcssPlugin;
          var pluginVer = plugin.postcssVersion;
          var runtimeVer = this.result.processor.version;
          var a = pluginVer.split('.');
          var b = runtimeVer.split('.');

          if (a[0] !== b[0] || parseInt(a[1]) > parseInt(b[1])) {
            console.error('Unknown error from PostCSS plugin. Your current PostCSS ' + 'version is ' + runtimeVer + ', but ' + pluginName + ' uses ' + pluginVer + '. Perhaps this is the source of the error below.');
          }
        }
      }
    } catch (err) {
      if (console && console.error) console.error(err);
    }
  };

  _proto.asyncTick = function asyncTick(resolve, reject) {
    var _this = this;

    if (this.plugin >= this.processor.plugins.length) {
      this.processed = true;
      return resolve();
    }

    try {
      var plugin = this.processor.plugins[this.plugin];
      var promise = this.run(plugin);
      this.plugin += 1;

      if (isPromise(promise)) {
        promise.then(function () {
          _this.asyncTick(resolve, reject);
        }).catch(function (error) {
          _this.handleError(error, plugin);

          _this.processed = true;
          reject(error);
        });
      } else {
        this.asyncTick(resolve, reject);
      }
    } catch (error) {
      this.processed = true;
      reject(error);
    }
  };

  _proto.async = function async() {
    var _this2 = this;

    if (this.processed) {
      return new Promise(function (resolve, reject) {
        if (_this2.error) {
          reject(_this2.error);
        } else {
          resolve(_this2.stringify());
        }
      });
    }

    if (this.processing) {
      return this.processing;
    }

    this.processing = new Promise(function (resolve, reject) {
      if (_this2.error) return reject(_this2.error);
      _this2.plugin = 0;

      _this2.asyncTick(resolve, reject);
    }).then(function () {
      _this2.processed = true;
      return _this2.stringify();
    });
    return this.processing;
  };

  _proto.sync = function sync() {
    if (this.processed) return this.result;
    this.processed = true;

    if (this.processing) {
      throw new Error('Use process(css).then(cb) to work with async plugins');
    }

    if (this.error) throw this.error;

    for (var _iterator = _createForOfIteratorHelperLoose(this.result.processor.plugins), _step; !(_step = _iterator()).done;) {
      var plugin = _step.value;
      var promise = this.run(plugin);

      if (isPromise(promise)) {
        throw new Error('Use process(css).then(cb) to work with async plugins');
      }
    }

    return this.result;
  };

  _proto.run = function run(plugin) {
    this.result.lastPlugin = plugin;

    try {
      return plugin(this.result.root, this.result);
    } catch (error) {
      this.handleError(error, plugin);
      throw error;
    }
  };

  _proto.stringify = function stringify() {
    if (this.stringified) return this.result;
    this.stringified = true;
    this.sync();
    var opts = this.result.opts;
    var str = _stringify2.default;
    if (opts.syntax) str = opts.syntax.stringify;
    if (opts.stringifier) str = opts.stringifier;
    if (str.stringify) str = str.stringify;
    var map = new _mapGenerator.default(str, this.result.root, this.result.opts);
    var data = map.generate();
    this.result.css = data[0];
    this.result.map = data[1];
    return this.result;
  };

  _createClass(LazyResult, [{
    key: "processor",
    get: function get() {
      return this.result.processor;
    }
    /**
     * Options from the {@link Processor#process} call.
     *
     * @type {processOptions}
     */

  }, {
    key: "opts",
    get: function get() {
      return this.result.opts;
    }
    /**
     * Processes input CSS through synchronous plugins, converts `Root`
     * to a CSS string and returns {@link Result#css}.
     *
     * This property will only work with synchronous plugins.
     * If the processor contains any asynchronous plugins
     * it will throw an error. This is why this method is only
     * for debug purpose, you should always use {@link LazyResult#then}.
     *
     * @type {string}
     * @see Result#css
     */

  }, {
    key: "css",
    get: function get() {
      return this.stringify().css;
    }
    /**
     * An alias for the `css` property. Use it with syntaxes
     * that generate non-CSS output.
     *
     * This property will only work with synchronous plugins.
     * If the processor contains any asynchronous plugins
     * it will throw an error. This is why this method is only
     * for debug purpose, you should always use {@link LazyResult#then}.
     *
     * @type {string}
     * @see Result#content
     */

  }, {
    key: "content",
    get: function get() {
      return this.stringify().content;
    }
    /**
     * Processes input CSS through synchronous plugins
     * and returns {@link Result#map}.
     *
     * This property will only work with synchronous plugins.
     * If the processor contains any asynchronous plugins
     * it will throw an error. This is why this method is only
     * for debug purpose, you should always use {@link LazyResult#then}.
     *
     * @type {SourceMapGenerator}
     * @see Result#map
     */

  }, {
    key: "map",
    get: function get() {
      return this.stringify().map;
    }
    /**
     * Processes input CSS through synchronous plugins
     * and returns {@link Result#root}.
     *
     * This property will only work with synchronous plugins. If the processor
     * contains any asynchronous plugins it will throw an error.
     *
     * This is why this method is only for debug purpose,
     * you should always use {@link LazyResult#then}.
     *
     * @type {Root}
     * @see Result#root
     */

  }, {
    key: "root",
    get: function get() {
      return this.sync().root;
    }
    /**
     * Processes input CSS through synchronous plugins
     * and returns {@link Result#messages}.
     *
     * This property will only work with synchronous plugins. If the processor
     * contains any asynchronous plugins it will throw an error.
     *
     * This is why this method is only for debug purpose,
     * you should always use {@link LazyResult#then}.
     *
     * @type {Message[]}
     * @see Result#messages
     */

  }, {
    key: "messages",
    get: function get() {
      return this.sync().messages;
    }
  }]);

  return LazyResult;
}();

var _default = LazyResult;
/**
 * @callback onFulfilled
 * @param {Result} result
 */

/**
 * @callback onRejected
 * @param {Error} error
 */

exports.default = _default;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxhenktcmVzdWx0LmVzNiJdLCJuYW1lcyI6WyJpc1Byb21pc2UiLCJvYmoiLCJ0aGVuIiwiTGF6eVJlc3VsdCIsInByb2Nlc3NvciIsImNzcyIsIm9wdHMiLCJzdHJpbmdpZmllZCIsInByb2Nlc3NlZCIsInJvb3QiLCJ0eXBlIiwiUmVzdWx0IiwibWFwIiwiaW5saW5lIiwicHJldiIsInBhcnNlciIsInBhcnNlIiwic3ludGF4IiwiZXJyb3IiLCJyZXN1bHQiLCJ3YXJuaW5ncyIsInN5bmMiLCJ0b1N0cmluZyIsIm9uRnVsZmlsbGVkIiwib25SZWplY3RlZCIsInByb2Nlc3MiLCJlbnYiLCJOT0RFX0VOViIsImFzeW5jIiwiY2F0Y2giLCJmaW5hbGx5Iiwib25GaW5hbGx5IiwiaGFuZGxlRXJyb3IiLCJwbHVnaW4iLCJuYW1lIiwicG9zdGNzc1BsdWdpbiIsInNldE1lc3NhZ2UiLCJwb3N0Y3NzVmVyc2lvbiIsInBsdWdpbk5hbWUiLCJwbHVnaW5WZXIiLCJydW50aW1lVmVyIiwidmVyc2lvbiIsImEiLCJzcGxpdCIsImIiLCJwYXJzZUludCIsImNvbnNvbGUiLCJlcnIiLCJhc3luY1RpY2siLCJyZXNvbHZlIiwicmVqZWN0IiwicGx1Z2lucyIsImxlbmd0aCIsInByb21pc2UiLCJydW4iLCJQcm9taXNlIiwic3RyaW5naWZ5IiwicHJvY2Vzc2luZyIsIkVycm9yIiwibGFzdFBsdWdpbiIsInN0ciIsInN0cmluZ2lmaWVyIiwiTWFwR2VuZXJhdG9yIiwiZGF0YSIsImdlbmVyYXRlIiwiY29udGVudCIsIm1lc3NhZ2VzIl0sIm1hcHBpbmdzIjoiOzs7OztBQUFBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7Ozs7Ozs7Ozs7OztBQUVBLFNBQVNBLFNBQVQsQ0FBb0JDLEdBQXBCLEVBQXlCO0FBQ3ZCLFNBQU8sT0FBT0EsR0FBUCxLQUFlLFFBQWYsSUFBMkIsT0FBT0EsR0FBRyxDQUFDQyxJQUFYLEtBQW9CLFVBQXREO0FBQ0Q7QUFFRDs7Ozs7Ozs7OztJ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SUFBSWtELHFCQUFKLENBQWlCRixHQUFqQixFQUFzQixLQUFLekMsTUFBTCxDQUFZVixJQUFsQyxFQUF3QyxLQUFLVSxNQUFMLENBQVliLElBQXBELENBQVY7QUFDQSxRQUFJeUQsSUFBSSxHQUFHbkQsR0FBRyxDQUFDb0QsUUFBSixFQUFYO0FBQ0EsU0FBSzdDLE1BQUwsQ0FBWWQsR0FBWixHQUFrQjBELElBQUksQ0FBQyxDQUFELENBQXRCO0FBQ0EsU0FBSzVDLE1BQUwsQ0FBWVAsR0FBWixHQUFrQm1ELElBQUksQ0FBQyxDQUFELENBQXRCO0FBRUEsV0FBTyxLQUFLNUMsTUFBWjtBQUNELEc7Ozs7d0JBalVnQjtBQUNmLGFBQU8sS0FBS0EsTUFBTCxDQUFZZixTQUFuQjtBQUNEO0FBRUQ7Ozs7Ozs7O3dCQUtZO0FBQ1YsYUFBTyxLQUFLZSxNQUFMLENBQVliLElBQW5CO0FBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7Ozs7O3dCQVlXO0FBQ1QsYUFBTyxLQUFLa0QsU0FBTCxHQUFpQm5ELEdBQXhCO0FBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7Ozs7O3dCQVllO0FBQ2IsYUFBTyxLQUFLbUQsU0FBTCxHQUFpQlMsT0FBeEI7QUFDRDtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7d0JBWVc7QUFDVCxhQUFPLEtBQUtULFNBQUwsR0FBaUI1QyxHQUF4QjtBQUNEO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7d0JBYVk7QUFDVixhQUFPLEtBQUtTLElBQUwsR0FBWVosSUFBbkI7QUFDRDtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7O3dCQWFnQjtBQUNkLGFBQU8sS0FBS1ksSUFBTCxHQUFZNkMsUUFBbkI7QUFDRDs7Ozs7O2VBdU9ZL0QsVTtBQUVmOzs7OztBQUtBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE1hcEdlbmVyYXRvciBmcm9tICcuL21hcC1nZW5lcmF0b3InXG5pbXBvcnQgc3RyaW5naWZ5IGZyb20gJy4vc3RyaW5naWZ5J1xuaW1wb3J0IHdhcm5PbmNlIGZyb20gJy4vd2Fybi1vbmNlJ1xuaW1wb3J0IFJlc3VsdCBmcm9tICcuL3Jlc3VsdCdcbmltcG9ydCBwYXJzZSBmcm9tICcuL3BhcnNlJ1xuXG5mdW5jdGlvbiBpc1Byb21pc2UgKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG9iai50aGVuID09PSAnZnVuY3Rpb24nXG59XG5cbi8qKlxuICogQSBQcm9taXNlIHByb3h5IGZvciB0aGUgcmVzdWx0IG9mIFBvc3RDU1MgdHJhbnNmb3JtYXRpb25zLlxuICpcbiAqIEEgYExhenlSZXN1bHRgIGluc3RhbmNlIGlzIHJldHVybmVkIGJ5IHtAbGluayBQcm9jZXNzb3IjcHJvY2Vzc30uXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IGxhenkgPSBwb3N0Y3NzKFthdXRvcHJlZml4ZXJdKS5wcm9jZXNzKGNzcylcbiAqL1xuY2xhc3MgTGF6eVJlc3VsdCB7XG4gIGNvbnN0cnVjdG9yIChwcm9jZXNzb3IsIGNzcywgb3B0cykge1xuICAgIHRoaXMuc3RyaW5naWZpZWQgPSBmYWxzZVxuICAgIHRoaXMucHJvY2Vzc2VkID0gZmFsc2VcblxuICAgIGxldCByb290XG4gICAgaWYgKHR5cGVvZiBjc3MgPT09ICdvYmplY3QnICYmIGNzcyAhPT0gbnVsbCAmJiBjc3MudHlwZSA9PT0gJ3Jvb3QnKSB7XG4gICAgICByb290ID0gY3NzXG4gICAgfSBlbHNlIGlmIChjc3MgaW5zdGFuY2VvZiBMYXp5UmVzdWx0IHx8IGNzcyBpbnN0YW5jZW9mIFJlc3VsdCkge1xuICAgICAgcm9vdCA9IGNzcy5yb290XG4gICAgICBpZiAoY3NzLm1hcCkge1xuICAgICAgICBpZiAodHlwZW9mIG9wdHMubWFwID09PSAndW5kZWZpbmVkJykgb3B0cy5tYXAgPSB7IH1cbiAgICAgICAgaWYgKCFvcHRzLm1hcC5pbmxpbmUpIG9wdHMubWFwLmlubGluZSA9IGZhbHNlXG4gICAgICAgIG9wdHMubWFwLnByZXYgPSBjc3MubWFwXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBwYXJzZXIgPSBwYXJzZVxuICAgICAgaWYgKG9wdHMuc3ludGF4KSBwYXJzZXIgPSBvcHRzLnN5bnRheC5wYXJzZVxuICAgICAgaWYgKG9wdHMucGFyc2VyKSBwYXJzZXIgPSBvcHRzLnBhcnNlclxuICAgICAgaWYgKHBhcnNlci5wYXJzZSkgcGFyc2VyID0gcGFyc2VyLnBhcnNlXG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJvb3QgPSBwYXJzZXIoY3NzLCBvcHRzKVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5lcnJvciA9IGVycm9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5yZXN1bHQgPSBuZXcgUmVzdWx0KHByb2Nlc3Nvciwgcm9vdCwgb3B0cylcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEge0BsaW5rIFByb2Nlc3Nvcn0gaW5zdGFuY2UsIHdoaWNoIHdpbGwgYmUgdXNlZFxuICAgKiBmb3IgQ1NTIHRyYW5zZm9ybWF0aW9ucy5cbiAgICpcbiAgICogQHR5cGUge1Byb2Nlc3Nvcn1cbiAgICovXG4gIGdldCBwcm9jZXNzb3IgKCkge1xuICAgIHJldHVybiB0aGlzLnJlc3VsdC5wcm9jZXNzb3JcbiAgfVxuXG4gIC8qKlxuICAgKiBPcHRpb25zIGZyb20gdGhlIHtAbGluayBQcm9jZXNzb3IjcHJvY2Vzc30gY2FsbC5cbiAgICpcbiAgICogQHR5cGUge3Byb2Nlc3NPcHRpb25zfVxuICAgKi9cbiAgZ2V0IG9wdHMgKCkge1xuICAgIHJldHVybiB0aGlzLnJlc3VsdC5vcHRzXG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIGlucHV0IENTUyB0aHJvdWdoIHN5bmNocm9ub3VzIHBsdWdpbnMsIGNvbnZlcnRzIGBSb290YFxuICAgKiB0byBhIENTUyBzdHJpbmcgYW5kIHJldHVybnMge0BsaW5rIFJlc3VsdCNjc3N9LlxuICAgKlxuICAgKiBUaGlzIHByb3BlcnR5IHdpbGwgb25seSB3b3JrIHdpdGggc3luY2hyb25vdXMgcGx1Z2lucy5cbiAgICogSWYgdGhlIHByb2Nlc3NvciBjb250YWlucyBhbnkgYXN5bmNocm9ub3VzIHBsdWdpbnNcbiAgICogaXQgd2lsbCB0aHJvdyBhbiBlcnJvci4gVGhpcyBpcyB3aHkgdGhpcyBtZXRob2QgaXMgb25seVxuICAgKiBmb3IgZGVidWcgcHVycG9zZSwgeW91IHNob3VsZCBhbHdheXMgdXNlIHtAbGluayBMYXp5UmVzdWx0I3RoZW59LlxuICAgKlxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAc2VlIFJlc3VsdCNjc3NcbiAgICovXG4gIGdldCBjc3MgKCkge1xuICAgIHJldHVybiB0aGlzLnN0cmluZ2lmeSgpLmNzc1xuICB9XG5cbiAgLyoqXG4gICAqIEFuIGFsaWFzIGZvciB0aGUgYGNzc2AgcHJvcGVydHkuIFVzZSBpdCB3aXRoIHN5bnRheGVzXG4gICAqIHRoYXQgZ2VuZXJhdGUgbm9uLUNTUyBvdXRwdXQuXG4gICAqXG4gICAqIFRoaXMgcHJvcGVydHkgd2lsbCBvbmx5IHdvcmsgd2l0aCBzeW5jaHJvbm91cyBwbHVnaW5zLlxuICAgKiBJZiB0aGUgcHJvY2Vzc29yIGNvbnRhaW5zIGFueSBhc3luY2hyb25vdXMgcGx1Z2luc1xuICAgKiBpdCB3aWxsIHRocm93IGFuIGVycm9yLiBUaGlzIGlzIHdoeSB0aGlzIG1ldGhvZCBpcyBvbmx5XG4gICAqIGZvciBkZWJ1ZyBwdXJwb3NlLCB5b3Ugc2hvdWxkIGFsd2F5cyB1c2Uge0BsaW5rIExhenlSZXN1bHQjdGhlbn0uXG4gICAqXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBzZWUgUmVzdWx0I2NvbnRlbnRcbiAgICovXG4gIGdldCBjb250ZW50ICgpIHtcbiAgICByZXR1cm4gdGhpcy5zdHJpbmdpZnkoKS5jb250ZW50XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIGlucHV0IENTUyB0aHJvdWdoIHN5bmNocm9ub3VzIHBsdWdpbnNcbiAgICogYW5kIHJldHVybnMge0BsaW5rIFJlc3VsdCNtYXB9LlxuICAgKlxuICAgKiBUaGlzIHByb3BlcnR5IHdpbGwgb25seSB3b3JrIHdpdGggc3luY2hyb25vdXMgcGx1Z2lucy5cbiAgICogSWYgdGhlIHByb2Nlc3NvciBjb250YWlucyBhbnkgYXN5bmNocm9ub3VzIHBsdWdpbnNcbiAgICogaXQgd2lsbCB0aHJvdyBhbiBlcnJvci4gVGhpcyBpcyB3aHkgdGhpcyBtZXRob2QgaXMgb25seVxuICAgKiBmb3IgZGVidWcgcHVycG9zZSwgeW91IHNob3VsZCBhbHdheXMgdXNlIHtAbGluayBMYXp5UmVzdWx0I3RoZW59LlxuICAgKlxuICAgKiBAdHlwZSB7U291cmNlTWFwR2VuZXJhdG9yfVxuICAgKiBAc2VlIFJlc3VsdCNtYXBcbiAgICovXG4gIGdldCBtYXAgKCkge1xuICAgIHJldHVybiB0aGlzLnN0cmluZ2lmeSgpLm1hcFxuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyBpbnB1dCBDU1MgdGhyb3VnaCBzeW5jaHJvbm91cyBwbHVnaW5zXG4gICAqIGFuZCByZXR1cm5zIHtAbGluayBSZXN1bHQjcm9vdH0uXG4gICAqXG4gICAqIFRoaXMgcHJvcGVydHkgd2lsbCBvbmx5IHdvcmsgd2l0aCBzeW5jaHJvbm91cyBwbHVnaW5zLiBJZiB0aGUgcHJvY2Vzc29yXG4gICAqIGNvbnRhaW5zIGFueSBhc3luY2hyb25vdXMgcGx1Z2lucyBpdCB3aWxsIHRocm93IGFuIGVycm9yLlxuICAgKlxuICAgKiBUaGlzIGlzIHdoeSB0aGlzIG1ldGhvZCBpcyBvbmx5IGZvciBkZWJ1ZyBwdXJwb3NlLFxuICAgKiB5b3Ugc2hvdWxkIGFsd2F5cyB1c2Uge0BsaW5rIExhenlSZXN1bHQjdGhlbn0uXG4gICAqXG4gICAqIEB0eXBlIHtSb290fVxuICAgKiBAc2VlIFJlc3VsdCNyb290XG4gICAqL1xuICBnZXQgcm9vdCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3luYygpLnJvb3RcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgaW5wdXQgQ1NTIHRocm91Z2ggc3luY2hyb25vdXMgcGx1Z2luc1xuICAgKiBhbmQgcmV0dXJucyB7QGxpbmsgUmVzdWx0I21lc3NhZ2VzfS5cbiAgICpcbiAgICogVGhpcyBwcm9wZXJ0eSB3aWxsIG9ubHkgd29yayB3aXRoIHN5bmNocm9ub3VzIHBsdWdpbnMuIElmIHRoZSBwcm9jZXNzb3JcbiAgICogY29udGFpbnMgYW55IGFzeW5jaHJvbm91cyBwbHVnaW5zIGl0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAqXG4gICAqIFRoaXMgaXMgd2h5IHRoaXMgbWV0aG9kIGlzIG9ubHkgZm9yIGRlYnVnIHB1cnBvc2UsXG4gICAqIHlvdSBzaG91bGQgYWx3YXlzIHVzZSB7QGxpbmsgTGF6eVJlc3VsdCN0aGVufS5cbiAgICpcbiAgICogQHR5cGUge01lc3NhZ2VbXX1cbiAgICogQHNlZSBSZXN1bHQjbWVzc2FnZXNcbiAgICovXG4gIGdldCBtZXNzYWdlcyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3luYygpLm1lc3NhZ2VzXG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIGlucHV0IENTUyB0aHJvdWdoIHN5bmNocm9ub3VzIHBsdWdpbnNcbiAgICogYW5kIGNhbGxzIHtAbGluayBSZXN1bHQjd2FybmluZ3MoKX0uXG4gICAqXG4gICAqIEByZXR1cm4ge1dhcm5pbmdbXX0gV2FybmluZ3MgZnJvbSBwbHVnaW5zLlxuICAgKi9cbiAgd2FybmluZ3MgKCkge1xuICAgIHJldHVybiB0aGlzLnN5bmMoKS53YXJuaW5ncygpXG4gIH1cblxuICAvKipcbiAgICogQWxpYXMgZm9yIHRoZSB7QGxpbmsgTGF6eVJlc3VsdCNjc3N9IHByb3BlcnR5LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBsYXp5ICsgJycgPT09IGxhenkuY3NzXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ30gT3V0cHV0IENTUy5cbiAgICovXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gdGhpcy5jc3NcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgaW5wdXQgQ1NTIHRocm91Z2ggc3luY2hyb25vdXMgYW5kIGFzeW5jaHJvbm91cyBwbHVnaW5zXG4gICAqIGFuZCBjYWxscyBgb25GdWxmaWxsZWRgIHdpdGggYSBSZXN1bHQgaW5zdGFuY2UuIElmIGEgcGx1Z2luIHRocm93c1xuICAgKiBhbiBlcnJvciwgdGhlIGBvblJlamVjdGVkYCBjYWxsYmFjayB3aWxsIGJlIGV4ZWN1dGVkLlxuICAgKlxuICAgKiBJdCBpbXBsZW1lbnRzIHN0YW5kYXJkIFByb21pc2UgQVBJLlxuICAgKlxuICAgKiBAcGFyYW0ge29uRnVsZmlsbGVkfSBvbkZ1bGZpbGxlZCBDYWxsYmFjayB3aWxsIGJlIGV4ZWN1dGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gYWxsIHBsdWdpbnMgd2lsbCBmaW5pc2ggd29yay5cbiAgICogQHBhcmFtIHtvblJlamVjdGVkfSAgb25SZWplY3RlZCAgQ2FsbGJhY2sgd2lsbCBiZSBleGVjdXRlZCBvbiBhbnkgZXJyb3IuXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IFByb21pc2UgQVBJIHRvIG1ha2UgcXVldWUuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHBvc3Rjc3MoW2F1dG9wcmVmaXhlcl0pLnByb2Nlc3MoY3NzLCB7IGZyb206IGNzc1BhdGggfSkudGhlbihyZXN1bHQgPT4ge1xuICAgKiAgIGNvbnNvbGUubG9nKHJlc3VsdC5jc3MpXG4gICAqIH0pXG4gICAqL1xuICB0aGVuIChvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICBpZiAoISgnZnJvbScgaW4gdGhpcy5vcHRzKSkge1xuICAgICAgICB3YXJuT25jZShcbiAgICAgICAgICAnV2l0aG91dCBgZnJvbWAgb3B0aW9uIFBvc3RDU1MgY291bGQgZ2VuZXJhdGUgd3Jvbmcgc291cmNlIG1hcCAnICtcbiAgICAgICAgICAnYW5kIHdpbGwgbm90IGZpbmQgQnJvd3NlcnNsaXN0IGNvbmZpZy4gU2V0IGl0IHRvIENTUyBmaWxlIHBhdGggJyArXG4gICAgICAgICAgJ29yIHRvIGB1bmRlZmluZWRgIHRvIHByZXZlbnQgdGhpcyB3YXJuaW5nLidcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hc3luYygpLnRoZW4ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpXG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIGlucHV0IENTUyB0aHJvdWdoIHN5bmNocm9ub3VzIGFuZCBhc3luY2hyb25vdXMgcGx1Z2luc1xuICAgKiBhbmQgY2FsbHMgb25SZWplY3RlZCBmb3IgZWFjaCBlcnJvciB0aHJvd24gaW4gYW55IHBsdWdpbi5cbiAgICpcbiAgICogSXQgaW1wbGVtZW50cyBzdGFuZGFyZCBQcm9taXNlIEFQSS5cbiAgICpcbiAgICogQHBhcmFtIHtvblJlamVjdGVkfSBvblJlamVjdGVkIENhbGxiYWNrIHdpbGwgYmUgZXhlY3V0ZWQgb24gYW55IGVycm9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBQcm9taXNlIEFQSSB0byBtYWtlIHF1ZXVlLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBwb3N0Y3NzKFthdXRvcHJlZml4ZXJdKS5wcm9jZXNzKGNzcykudGhlbihyZXN1bHQgPT4ge1xuICAgKiAgIGNvbnNvbGUubG9nKHJlc3VsdC5jc3MpXG4gICAqIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICogICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgKiB9KVxuICAgKi9cbiAgY2F0Y2ggKG9uUmVqZWN0ZWQpIHtcbiAgICByZXR1cm4gdGhpcy5hc3luYygpLmNhdGNoKG9uUmVqZWN0ZWQpXG4gIH1cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyBpbnB1dCBDU1MgdGhyb3VnaCBzeW5jaHJvbm91cyBhbmQgYXN5bmNocm9ub3VzIHBsdWdpbnNcbiAgICogYW5kIGNhbGxzIG9uRmluYWxseSBvbiBhbnkgZXJyb3Igb3Igd2hlbiBhbGwgcGx1Z2lucyB3aWxsIGZpbmlzaCB3b3JrLlxuICAgKlxuICAgKiBJdCBpbXBsZW1lbnRzIHN0YW5kYXJkIFByb21pc2UgQVBJLlxuICAgKlxuICAgKiBAcGFyYW0ge29uRmluYWxseX0gb25GaW5hbGx5IENhbGxiYWNrIHdpbGwgYmUgZXhlY3V0ZWQgb24gYW55IGVycm9yIG9yXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiBhbGwgcGx1Z2lucyB3aWxsIGZpbmlzaCB3b3JrLlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBQcm9taXNlIEFQSSB0byBtYWtlIHF1ZXVlLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBwb3N0Y3NzKFthdXRvcHJlZml4ZXJdKS5wcm9jZXNzKGNzcykuZmluYWxseSgoKSA9PiB7XG4gICAqICAgY29uc29sZS5sb2coJ3Byb2Nlc3NpbmcgZW5kZWQnKVxuICAgKiB9KVxuICAgKi9cbiAgZmluYWxseSAob25GaW5hbGx5KSB7XG4gICAgcmV0dXJuIHRoaXMuYXN5bmMoKS50aGVuKG9uRmluYWxseSwgb25GaW5hbGx5KVxuICB9XG5cbiAgaGFuZGxlRXJyb3IgKGVycm9yLCBwbHVnaW4pIHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5lcnJvciA9IGVycm9yXG4gICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ0Nzc1N5bnRheEVycm9yJyAmJiAhZXJyb3IucGx1Z2luKSB7XG4gICAgICAgIGVycm9yLnBsdWdpbiA9IHBsdWdpbi5wb3N0Y3NzUGx1Z2luXG4gICAgICAgIGVycm9yLnNldE1lc3NhZ2UoKVxuICAgICAgfSBlbHNlIGlmIChwbHVnaW4ucG9zdGNzc1ZlcnNpb24pIHtcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgICAgICBsZXQgcGx1Z2luTmFtZSA9IHBsdWdpbi5wb3N0Y3NzUGx1Z2luXG4gICAgICAgICAgbGV0IHBsdWdpblZlciA9IHBsdWdpbi5wb3N0Y3NzVmVyc2lvblxuICAgICAgICAgIGxldCBydW50aW1lVmVyID0gdGhpcy5yZXN1bHQucHJvY2Vzc29yLnZlcnNpb25cbiAgICAgICAgICBsZXQgYSA9IHBsdWdpblZlci5zcGxpdCgnLicpXG4gICAgICAgICAgbGV0IGIgPSBydW50aW1lVmVyLnNwbGl0KCcuJylcblxuICAgICAgICAgIGlmIChhWzBdICE9PSBiWzBdIHx8IHBhcnNlSW50KGFbMV0pID4gcGFyc2VJbnQoYlsxXSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgICdVbmtub3duIGVycm9yIGZyb20gUG9zdENTUyBwbHVnaW4uIFlvdXIgY3VycmVudCBQb3N0Q1NTICcgK1xuICAgICAgICAgICAgICAndmVyc2lvbiBpcyAnICsgcnVudGltZVZlciArICcsIGJ1dCAnICsgcGx1Z2luTmFtZSArICcgdXNlcyAnICtcbiAgICAgICAgICAgICAgcGx1Z2luVmVyICsgJy4gUGVyaGFwcyB0aGlzIGlzIHRoZSBzb3VyY2Ugb2YgdGhlIGVycm9yIGJlbG93LidcbiAgICAgICAgICAgIClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGUuZXJyb3IpIGNvbnNvbGUuZXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jVGljayAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKHRoaXMucGx1Z2luID49IHRoaXMucHJvY2Vzc29yLnBsdWdpbnMubGVuZ3RoKSB7XG4gICAgICB0aGlzLnByb2Nlc3NlZCA9IHRydWVcbiAgICAgIHJldHVybiByZXNvbHZlKClcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgbGV0IHBsdWdpbiA9IHRoaXMucHJvY2Vzc29yLnBsdWdpbnNbdGhpcy5wbHVnaW5dXG4gICAgICBsZXQgcHJvbWlzZSA9IHRoaXMucnVuKHBsdWdpbilcbiAgICAgIHRoaXMucGx1Z2luICs9IDFcblxuICAgICAgaWYgKGlzUHJvbWlzZShwcm9taXNlKSkge1xuICAgICAgICBwcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIHRoaXMuYXN5bmNUaWNrKHJlc29sdmUsIHJlamVjdClcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgIHRoaXMuaGFuZGxlRXJyb3IoZXJyb3IsIHBsdWdpbilcbiAgICAgICAgICB0aGlzLnByb2Nlc3NlZCA9IHRydWVcbiAgICAgICAgICByZWplY3QoZXJyb3IpXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFzeW5jVGljayhyZXNvbHZlLCByZWplY3QpXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMucHJvY2Vzc2VkID0gdHJ1ZVxuICAgICAgcmVqZWN0KGVycm9yKVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jICgpIHtcbiAgICBpZiAodGhpcy5wcm9jZXNzZWQpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmVycm9yKSB7XG4gICAgICAgICAgcmVqZWN0KHRoaXMuZXJyb3IpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZSh0aGlzLnN0cmluZ2lmeSgpKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICBpZiAodGhpcy5wcm9jZXNzaW5nKSB7XG4gICAgICByZXR1cm4gdGhpcy5wcm9jZXNzaW5nXG4gICAgfVxuXG4gICAgdGhpcy5wcm9jZXNzaW5nID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaWYgKHRoaXMuZXJyb3IpIHJldHVybiByZWplY3QodGhpcy5lcnJvcilcbiAgICAgIHRoaXMucGx1Z2luID0gMFxuICAgICAgdGhpcy5hc3luY1RpY2socmVzb2x2ZSwgcmVqZWN0KVxuICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgdGhpcy5wcm9jZXNzZWQgPSB0cnVlXG4gICAgICByZXR1cm4gdGhpcy5zdHJpbmdpZnkoKVxuICAgIH0pXG5cbiAgICByZXR1cm4gdGhpcy5wcm9jZXNzaW5nXG4gIH1cblxuICBzeW5jICgpIHtcbiAgICBpZiAodGhpcy5wcm9jZXNzZWQpIHJldHVybiB0aGlzLnJlc3VsdFxuICAgIHRoaXMucHJvY2Vzc2VkID0gdHJ1ZVxuXG4gICAgaWYgKHRoaXMucHJvY2Vzc2luZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVXNlIHByb2Nlc3MoY3NzKS50aGVuKGNiKSB0byB3b3JrIHdpdGggYXN5bmMgcGx1Z2lucycpXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZXJyb3IpIHRocm93IHRoaXMuZXJyb3JcblxuICAgIGZvciAobGV0IHBsdWdpbiBvZiB0aGlzLnJlc3VsdC5wcm9jZXNzb3IucGx1Z2lucykge1xuICAgICAgbGV0IHByb21pc2UgPSB0aGlzLnJ1bihwbHVnaW4pXG4gICAgICBpZiAoaXNQcm9taXNlKHByb21pc2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnVXNlIHByb2Nlc3MoY3NzKS50aGVuKGNiKSB0byB3b3JrIHdpdGggYXN5bmMgcGx1Z2lucycpXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVzdWx0XG4gIH1cblxuICBydW4gKHBsdWdpbikge1xuICAgIHRoaXMucmVzdWx0Lmxhc3RQbHVnaW4gPSBwbHVnaW5cblxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gcGx1Z2luKHRoaXMucmVzdWx0LnJvb3QsIHRoaXMucmVzdWx0KVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmhhbmRsZUVycm9yKGVycm9yLCBwbHVnaW4pXG4gICAgICB0aHJvdyBlcnJvclxuICAgIH1cbiAgfVxuXG4gIHN0cmluZ2lmeSAoKSB7XG4gICAgaWYgKHRoaXMuc3RyaW5naWZpZWQpIHJldHVybiB0aGlzLnJlc3VsdFxuICAgIHRoaXMuc3RyaW5naWZpZWQgPSB0cnVlXG5cbiAgICB0aGlzLnN5bmMoKVxuXG4gICAgbGV0IG9wdHMgPSB0aGlzLnJlc3VsdC5vcHRzXG4gICAgbGV0IHN0ciA9IHN0cmluZ2lmeVxuICAgIGlmIChvcHRzLnN5bnRheCkgc3RyID0gb3B0cy5zeW50YXguc3RyaW5naWZ5XG4gICAgaWYgKG9wdHMuc3RyaW5naWZpZXIpIHN0ciA9IG9wdHMuc3RyaW5naWZpZXJcbiAgICBpZiAoc3RyLnN0cmluZ2lmeSkgc3RyID0gc3RyLnN0cmluZ2lmeVxuXG4gICAgbGV0IG1hcCA9IG5ldyBNYXBHZW5lcmF0b3Ioc3RyLCB0aGlzLnJlc3VsdC5yb290LCB0aGlzLnJlc3VsdC5vcHRzKVxuICAgIGxldCBkYXRhID0gbWFwLmdlbmVyYXRlKClcbiAgICB0aGlzLnJlc3VsdC5jc3MgPSBkYXRhWzBdXG4gICAgdGhpcy5yZXN1bHQubWFwID0gZGF0YVsxXVxuXG4gICAgcmV0dXJuIHRoaXMucmVzdWx0XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTGF6eVJlc3VsdFxuXG4vKipcbiAqIEBjYWxsYmFjayBvbkZ1bGZpbGxlZFxuICogQHBhcmFtIHtSZXN1bHR9IHJlc3VsdFxuICovXG5cbi8qKlxuICogQGNhbGxiYWNrIG9uUmVqZWN0ZWRcbiAqIEBwYXJhbSB7RXJyb3J9IGVycm9yXG4gKi9cbiJdLCJmaWxlIjoibGF6eS1yZXN1bHQuanMifQ==
