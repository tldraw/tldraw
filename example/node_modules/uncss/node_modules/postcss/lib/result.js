"use strict";

exports.__esModule = true;
exports.default = void 0;

var _warning = _interopRequireDefault(require("./warning"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * Provides the result of the PostCSS transformations.
 *
 * A Result instance is returned by {@link LazyResult#then}
 * or {@link Root#toResult} methods.
 *
 * @example
 * postcss([autoprefixer]).process(css).then(result => {
 *  console.log(result.css)
 * })
 *
 * @example
 * const result2 = postcss.parse(css).toResult()
 */
var Result = /*#__PURE__*/function () {
  /**
   * @param {Processor} processor Processor used for this transformation.
   * @param {Root}      root      Root node after all transformations.
   * @param {processOptions} opts Options from the {@link Processor#process}
   *                              or {@link Root#toResult}.
   */
  function Result(processor, root, opts) {
    /**
     * The Processor instance used for this transformation.
     *
     * @type {Processor}
     *
     * @example
     * for (const plugin of result.processor.plugins) {
     *   if (plugin.postcssPlugin === 'postcss-bad') {
     *     throw 'postcss-good is incompatible with postcss-bad'
     *   }
     * })
     */
    this.processor = processor;
    /**
     * Contains messages from plugins (e.g., warnings or custom messages).
     * Each message should have type and plugin properties.
     *
     * @type {Message[]}
     *
     * @example
     * postcss.plugin('postcss-min-browser', () => {
     *   return (root, result) => {
     *     const browsers = detectMinBrowsersByCanIUse(root)
     *     result.messages.push({
     *       type: 'min-browser',
     *       plugin: 'postcss-min-browser',
     *       browsers
     *     })
     *   }
     * })
     */

    this.messages = [];
    /**
     * Root node after all transformations.
     *
     * @type {Root}
     *
     * @example
     * root.toResult().root === root
     */

    this.root = root;
    /**
     * Options from the {@link Processor#process} or {@link Root#toResult} call
     * that produced this Result instance.
     *
     * @type {processOptions}
     *
     * @example
     * root.toResult(opts).opts === opts
     */

    this.opts = opts;
    /**
     * A CSS string representing of {@link Result#root}.
     *
     * @type {string}
     *
     * @example
     * postcss.parse('a{}').toResult().css //=> "a{}"
     */

    this.css = undefined;
    /**
     * An instance of `SourceMapGenerator` class from the `source-map` library,
     * representing changes to the {@link Result#root} instance.
     *
     * @type {SourceMapGenerator}
     *
     * @example
     * result.map.toJSON() //=> { version: 3, file: 'a.css', … }
     *
     * @example
     * if (result.map) {
     *   fs.writeFileSync(result.opts.to + '.map', result.map.toString())
     * }
     */

    this.map = undefined;
  }
  /**
   * Returns for @{link Result#css} content.
   *
   * @example
   * result + '' === result.css
   *
   * @return {string} String representing of {@link Result#root}.
   */


  var _proto = Result.prototype;

  _proto.toString = function toString() {
    return this.css;
  }
  /**
   * Creates an instance of {@link Warning} and adds it
   * to {@link Result#messages}.
   *
   * @param {string} text        Warning message.
   * @param {Object} [opts]      Warning options.
   * @param {Node}   opts.node   CSS node that caused the warning.
   * @param {string} opts.word   Word in CSS source that caused the warning.
   * @param {number} opts.index  Index in CSS node string that caused
   *                             the warning.
   * @param {string} opts.plugin Name of the plugin that created
   *                             this warning. {@link Result#warn} fills
   *                             this property automatically.
   *
   * @return {Warning} Created warning.
   */
  ;

  _proto.warn = function warn(text, opts) {
    if (opts === void 0) {
      opts = {};
    }

    if (!opts.plugin) {
      if (this.lastPlugin && this.lastPlugin.postcssPlugin) {
        opts.plugin = this.lastPlugin.postcssPlugin;
      }
    }

    var warning = new _warning.default(text, opts);
    this.messages.push(warning);
    return warning;
  }
  /**
     * Returns warnings from plugins. Filters {@link Warning} instances
     * from {@link Result#messages}.
     *
     * @example
     * result.warnings().forEach(warn => {
     *   console.warn(warn.toString())
     * })
     *
     * @return {Warning[]} Warnings from plugins.
     */
  ;

  _proto.warnings = function warnings() {
    return this.messages.filter(function (i) {
      return i.type === 'warning';
    });
  }
  /**
   * An alias for the {@link Result#css} property.
   * Use it with syntaxes that generate non-CSS output.
   *
   * @type {string}
   *
   * @example
   * result.css === result.content
   */
  ;

  _createClass(Result, [{
    key: "content",
    get: function get() {
      return this.css;
    }
  }]);

  return Result;
}();

var _default = Result;
/**
 * @typedef  {object} Message
 * @property {string} type   Message type.
 * @property {string} plugin Source PostCSS plugin name.
 */

exports.default = _default;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlc3VsdC5lczYiXSwibmFtZXMiOlsiUmVzdWx0IiwicHJvY2Vzc29yIiwicm9vdCIsIm9wdHMiLCJtZXNzYWdlcyIsImNzcyIsInVuZGVmaW5lZCIsIm1hcCIsInRvU3RyaW5nIiwid2FybiIsInRleHQiLCJwbHVnaW4iLCJsYXN0UGx1Z2luIiwicG9zdGNzc1BsdWdpbiIsIndhcm5pbmciLCJXYXJuaW5nIiwicHVzaCIsIndhcm5pbmdzIiwiZmlsdGVyIiwiaSIsInR5cGUiXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUE7Ozs7Ozs7O0FBRUE7Ozs7Ozs7Ozs7Ozs7O0lBY01BLE07QUFDSjs7Ozs7O0FBTUEsa0JBQWFDLFNBQWIsRUFBd0JDLElBQXhCLEVBQThCQyxJQUE5QixFQUFvQztBQUNsQzs7Ozs7Ozs7Ozs7O0FBWUEsU0FBS0YsU0FBTCxHQUFpQkEsU0FBakI7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQSxTQUFLRyxRQUFMLEdBQWdCLEVBQWhCO0FBQ0E7Ozs7Ozs7OztBQVFBLFNBQUtGLElBQUwsR0FBWUEsSUFBWjtBQUNBOzs7Ozs7Ozs7O0FBU0EsU0FBS0MsSUFBTCxHQUFZQSxJQUFaO0FBQ0E7Ozs7Ozs7OztBQVFBLFNBQUtFLEdBQUwsR0FBV0MsU0FBWDtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7QUFjQSxTQUFLQyxHQUFMLEdBQVdELFNBQVg7QUFDRDtBQUVEOzs7Ozs7Ozs7Ozs7U0FRQUUsUSxHQUFBLG9CQUFZO0FBQ1YsV0FBTyxLQUFLSCxHQUFaO0FBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7O1NBZ0JBSSxJLEdBQUEsY0FBTUMsSUFBTixFQUFZUCxJQUFaLEVBQXdCO0FBQUEsUUFBWkEsSUFBWTtBQUFaQSxNQUFBQSxJQUFZLEdBQUwsRUFBSztBQUFBOztBQUN0QixRQUFJLENBQUNBLElBQUksQ0FBQ1EsTUFBVixFQUFrQjtBQUNoQixVQUFJLEtBQUtDLFVBQUwsSUFBbUIsS0FBS0EsVUFBTCxDQUFnQkMsYUFBdkMsRUFBc0Q7QUFDcERWLFFBQUFBLElBQUksQ0FBQ1EsTUFBTCxHQUFjLEtBQUtDLFVBQUwsQ0FBZ0JDLGFBQTlCO0FBQ0Q7QUFDRjs7QUFFRCxRQUFJQyxPQUFPLEdBQUcsSUFBSUMsZ0JBQUosQ0FBWUwsSUFBWixFQUFrQlAsSUFBbEIsQ0FBZDtBQUNBLFNBQUtDLFFBQUwsQ0FBY1ksSUFBZCxDQUFtQkYsT0FBbkI7QUFFQSxXQUFPQSxPQUFQO0FBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7OztTQVdBRyxRLEdBQUEsb0JBQVk7QUFDVixXQUFPLEtBQUtiLFFBQUwsQ0FBY2MsTUFBZCxDQUFxQixVQUFBQyxDQUFDO0FBQUEsYUFBSUEsQ0FBQyxDQUFDQyxJQUFGLEtBQVcsU0FBZjtBQUFBLEtBQXRCLENBQVA7QUFDRDtBQUVEOzs7Ozs7Ozs7Ozs7O3dCQVNlO0FBQ2IsYUFBTyxLQUFLZixHQUFaO0FBQ0Q7Ozs7OztlQUdZTCxNO0FBRWYiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgV2FybmluZyBmcm9tICcuL3dhcm5pbmcnXG5cbi8qKlxuICogUHJvdmlkZXMgdGhlIHJlc3VsdCBvZiB0aGUgUG9zdENTUyB0cmFuc2Zvcm1hdGlvbnMuXG4gKlxuICogQSBSZXN1bHQgaW5zdGFuY2UgaXMgcmV0dXJuZWQgYnkge0BsaW5rIExhenlSZXN1bHQjdGhlbn1cbiAqIG9yIHtAbGluayBSb290I3RvUmVzdWx0fSBtZXRob2RzLlxuICpcbiAqIEBleGFtcGxlXG4gKiBwb3N0Y3NzKFthdXRvcHJlZml4ZXJdKS5wcm9jZXNzKGNzcykudGhlbihyZXN1bHQgPT4ge1xuICogIGNvbnNvbGUubG9nKHJlc3VsdC5jc3MpXG4gKiB9KVxuICpcbiAqIEBleGFtcGxlXG4gKiBjb25zdCByZXN1bHQyID0gcG9zdGNzcy5wYXJzZShjc3MpLnRvUmVzdWx0KClcbiAqL1xuY2xhc3MgUmVzdWx0IHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7UHJvY2Vzc29yfSBwcm9jZXNzb3IgUHJvY2Vzc29yIHVzZWQgZm9yIHRoaXMgdHJhbnNmb3JtYXRpb24uXG4gICAqIEBwYXJhbSB7Um9vdH0gICAgICByb290ICAgICAgUm9vdCBub2RlIGFmdGVyIGFsbCB0cmFuc2Zvcm1hdGlvbnMuXG4gICAqIEBwYXJhbSB7cHJvY2Vzc09wdGlvbnN9IG9wdHMgT3B0aW9ucyBmcm9tIHRoZSB7QGxpbmsgUHJvY2Vzc29yI3Byb2Nlc3N9XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3Ige0BsaW5rIFJvb3QjdG9SZXN1bHR9LlxuICAgKi9cbiAgY29uc3RydWN0b3IgKHByb2Nlc3Nvciwgcm9vdCwgb3B0cykge1xuICAgIC8qKlxuICAgICAqIFRoZSBQcm9jZXNzb3IgaW5zdGFuY2UgdXNlZCBmb3IgdGhpcyB0cmFuc2Zvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtQcm9jZXNzb3J9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGZvciAoY29uc3QgcGx1Z2luIG9mIHJlc3VsdC5wcm9jZXNzb3IucGx1Z2lucykge1xuICAgICAqICAgaWYgKHBsdWdpbi5wb3N0Y3NzUGx1Z2luID09PSAncG9zdGNzcy1iYWQnKSB7XG4gICAgICogICAgIHRocm93ICdwb3N0Y3NzLWdvb2QgaXMgaW5jb21wYXRpYmxlIHdpdGggcG9zdGNzcy1iYWQnXG4gICAgICogICB9XG4gICAgICogfSlcbiAgICAgKi9cbiAgICB0aGlzLnByb2Nlc3NvciA9IHByb2Nlc3NvclxuICAgIC8qKlxuICAgICAqIENvbnRhaW5zIG1lc3NhZ2VzIGZyb20gcGx1Z2lucyAoZS5nLiwgd2FybmluZ3Mgb3IgY3VzdG9tIG1lc3NhZ2VzKS5cbiAgICAgKiBFYWNoIG1lc3NhZ2Ugc2hvdWxkIGhhdmUgdHlwZSBhbmQgcGx1Z2luIHByb3BlcnRpZXMuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7TWVzc2FnZVtdfVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBwb3N0Y3NzLnBsdWdpbigncG9zdGNzcy1taW4tYnJvd3NlcicsICgpID0+IHtcbiAgICAgKiAgIHJldHVybiAocm9vdCwgcmVzdWx0KSA9PiB7XG4gICAgICogICAgIGNvbnN0IGJyb3dzZXJzID0gZGV0ZWN0TWluQnJvd3NlcnNCeUNhbklVc2Uocm9vdClcbiAgICAgKiAgICAgcmVzdWx0Lm1lc3NhZ2VzLnB1c2goe1xuICAgICAqICAgICAgIHR5cGU6ICdtaW4tYnJvd3NlcicsXG4gICAgICogICAgICAgcGx1Z2luOiAncG9zdGNzcy1taW4tYnJvd3NlcicsXG4gICAgICogICAgICAgYnJvd3NlcnNcbiAgICAgKiAgICAgfSlcbiAgICAgKiAgIH1cbiAgICAgKiB9KVxuICAgICAqL1xuICAgIHRoaXMubWVzc2FnZXMgPSBbXVxuICAgIC8qKlxuICAgICAqIFJvb3Qgbm9kZSBhZnRlciBhbGwgdHJhbnNmb3JtYXRpb25zLlxuICAgICAqXG4gICAgICogQHR5cGUge1Jvb3R9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHJvb3QudG9SZXN1bHQoKS5yb290ID09PSByb290XG4gICAgICovXG4gICAgdGhpcy5yb290ID0gcm9vdFxuICAgIC8qKlxuICAgICAqIE9wdGlvbnMgZnJvbSB0aGUge0BsaW5rIFByb2Nlc3NvciNwcm9jZXNzfSBvciB7QGxpbmsgUm9vdCN0b1Jlc3VsdH0gY2FsbFxuICAgICAqIHRoYXQgcHJvZHVjZWQgdGhpcyBSZXN1bHQgaW5zdGFuY2UuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7cHJvY2Vzc09wdGlvbnN9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHJvb3QudG9SZXN1bHQob3B0cykub3B0cyA9PT0gb3B0c1xuICAgICAqL1xuICAgIHRoaXMub3B0cyA9IG9wdHNcbiAgICAvKipcbiAgICAgKiBBIENTUyBzdHJpbmcgcmVwcmVzZW50aW5nIG9mIHtAbGluayBSZXN1bHQjcm9vdH0uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBwb3N0Y3NzLnBhcnNlKCdhe30nKS50b1Jlc3VsdCgpLmNzcyAvLz0+IFwiYXt9XCJcbiAgICAgKi9cbiAgICB0aGlzLmNzcyA9IHVuZGVmaW5lZFxuICAgIC8qKlxuICAgICAqIEFuIGluc3RhbmNlIG9mIGBTb3VyY2VNYXBHZW5lcmF0b3JgIGNsYXNzIGZyb20gdGhlIGBzb3VyY2UtbWFwYCBsaWJyYXJ5LFxuICAgICAqIHJlcHJlc2VudGluZyBjaGFuZ2VzIHRvIHRoZSB7QGxpbmsgUmVzdWx0I3Jvb3R9IGluc3RhbmNlLlxuICAgICAqXG4gICAgICogQHR5cGUge1NvdXJjZU1hcEdlbmVyYXRvcn1cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcmVzdWx0Lm1hcC50b0pTT04oKSAvLz0+IHsgdmVyc2lvbjogMywgZmlsZTogJ2EuY3NzJywg4oCmIH1cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogaWYgKHJlc3VsdC5tYXApIHtcbiAgICAgKiAgIGZzLndyaXRlRmlsZVN5bmMocmVzdWx0Lm9wdHMudG8gKyAnLm1hcCcsIHJlc3VsdC5tYXAudG9TdHJpbmcoKSlcbiAgICAgKiB9XG4gICAgICovXG4gICAgdGhpcy5tYXAgPSB1bmRlZmluZWRcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGZvciBAe2xpbmsgUmVzdWx0I2Nzc30gY29udGVudC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcmVzdWx0ICsgJycgPT09IHJlc3VsdC5jc3NcbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfSBTdHJpbmcgcmVwcmVzZW50aW5nIG9mIHtAbGluayBSZXN1bHQjcm9vdH0uXG4gICAqL1xuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3NzXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiB7QGxpbmsgV2FybmluZ30gYW5kIGFkZHMgaXRcbiAgICogdG8ge0BsaW5rIFJlc3VsdCNtZXNzYWdlc30uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0ICAgICAgICBXYXJuaW5nIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0c10gICAgICBXYXJuaW5nIG9wdGlvbnMuXG4gICAqIEBwYXJhbSB7Tm9kZX0gICBvcHRzLm5vZGUgICBDU1Mgbm9kZSB0aGF0IGNhdXNlZCB0aGUgd2FybmluZy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMud29yZCAgIFdvcmQgaW4gQ1NTIHNvdXJjZSB0aGF0IGNhdXNlZCB0aGUgd2FybmluZy5cbiAgICogQHBhcmFtIHtudW1iZXJ9IG9wdHMuaW5kZXggIEluZGV4IGluIENTUyBub2RlIHN0cmluZyB0aGF0IGNhdXNlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIHdhcm5pbmcuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLnBsdWdpbiBOYW1lIG9mIHRoZSBwbHVnaW4gdGhhdCBjcmVhdGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzIHdhcm5pbmcuIHtAbGluayBSZXN1bHQjd2Fybn0gZmlsbHNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgcHJvcGVydHkgYXV0b21hdGljYWxseS5cbiAgICpcbiAgICogQHJldHVybiB7V2FybmluZ30gQ3JlYXRlZCB3YXJuaW5nLlxuICAgKi9cbiAgd2FybiAodGV4dCwgb3B0cyA9IHsgfSkge1xuICAgIGlmICghb3B0cy5wbHVnaW4pIHtcbiAgICAgIGlmICh0aGlzLmxhc3RQbHVnaW4gJiYgdGhpcy5sYXN0UGx1Z2luLnBvc3Rjc3NQbHVnaW4pIHtcbiAgICAgICAgb3B0cy5wbHVnaW4gPSB0aGlzLmxhc3RQbHVnaW4ucG9zdGNzc1BsdWdpblxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCB3YXJuaW5nID0gbmV3IFdhcm5pbmcodGV4dCwgb3B0cylcbiAgICB0aGlzLm1lc3NhZ2VzLnB1c2god2FybmluZylcblxuICAgIHJldHVybiB3YXJuaW5nXG4gIH1cblxuICAvKipcbiAgICAgKiBSZXR1cm5zIHdhcm5pbmdzIGZyb20gcGx1Z2lucy4gRmlsdGVycyB7QGxpbmsgV2FybmluZ30gaW5zdGFuY2VzXG4gICAgICogZnJvbSB7QGxpbmsgUmVzdWx0I21lc3NhZ2VzfS5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcmVzdWx0Lndhcm5pbmdzKCkuZm9yRWFjaCh3YXJuID0+IHtcbiAgICAgKiAgIGNvbnNvbGUud2Fybih3YXJuLnRvU3RyaW5nKCkpXG4gICAgICogfSlcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge1dhcm5pbmdbXX0gV2FybmluZ3MgZnJvbSBwbHVnaW5zLlxuICAgICAqL1xuICB3YXJuaW5ncyAoKSB7XG4gICAgcmV0dXJuIHRoaXMubWVzc2FnZXMuZmlsdGVyKGkgPT4gaS50eXBlID09PSAnd2FybmluZycpXG4gIH1cblxuICAvKipcbiAgICogQW4gYWxpYXMgZm9yIHRoZSB7QGxpbmsgUmVzdWx0I2Nzc30gcHJvcGVydHkuXG4gICAqIFVzZSBpdCB3aXRoIHN5bnRheGVzIHRoYXQgZ2VuZXJhdGUgbm9uLUNTUyBvdXRwdXQuXG4gICAqXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJlc3VsdC5jc3MgPT09IHJlc3VsdC5jb250ZW50XG4gICAqL1xuICBnZXQgY29udGVudCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3NzXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUmVzdWx0XG5cbi8qKlxuICogQHR5cGVkZWYgIHtvYmplY3R9IE1lc3NhZ2VcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0eXBlICAgTWVzc2FnZSB0eXBlLlxuICogQHByb3BlcnR5IHtzdHJpbmd9IHBsdWdpbiBTb3VyY2UgUG9zdENTUyBwbHVnaW4gbmFtZS5cbiAqL1xuIl0sImZpbGUiOiJyZXN1bHQuanMifQ==
