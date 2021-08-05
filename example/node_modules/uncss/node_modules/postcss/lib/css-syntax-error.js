"use strict";

exports.__esModule = true;
exports.default = void 0;

var _supportsColor = _interopRequireDefault(require("supports-color"));

var _chalk = _interopRequireDefault(require("chalk"));

var _terminalHighlight = _interopRequireDefault(require("./terminal-highlight"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/**
 * The CSS parser throws this error for broken CSS.
 *
 * Custom parsers can throw this error for broken custom syntax using
 * the {@link Node#error} method.
 *
 * PostCSS will use the input source map to detect the original error location.
 * If you wrote a Sass file, compiled it to CSS and then parsed it with PostCSS,
 * PostCSS will show the original position in the Sass file.
 *
 * If you need the position in the PostCSS input
 * (e.g., to debug the previous compiler), use `error.input.file`.
 *
 * @example
 * // Catching and checking syntax error
 * try {
 *   postcss.parse('a{')
 * } catch (error) {
 *   if (error.name === 'CssSyntaxError') {
 *     error //=> CssSyntaxError
 *   }
 * }
 *
 * @example
 * // Raising error from plugin
 * throw node.error('Unknown variable', { plugin: 'postcss-vars' })
 */
var CssSyntaxError = /*#__PURE__*/function (_Error) {
  _inheritsLoose(CssSyntaxError, _Error);

  /**
   * @param {string} message  Error message.
   * @param {number} [line]   Source line of the error.
   * @param {number} [column] Source column of the error.
   * @param {string} [source] Source code of the broken file.
   * @param {string} [file]   Absolute path to the broken file.
   * @param {string} [plugin] PostCSS plugin name, if error came from plugin.
   */
  function CssSyntaxError(message, line, column, source, file, plugin) {
    var _this;

    _this = _Error.call(this, message) || this;
    /**
     * Always equal to `'CssSyntaxError'`. You should always check error type
     * by `error.name === 'CssSyntaxError'`
     * instead of `error instanceof CssSyntaxError`,
     * because npm could have several PostCSS versions.
     *
     * @type {string}
     *
     * @example
     * if (error.name === 'CssSyntaxError') {
     *   error //=> CssSyntaxError
     * }
     */

    _this.name = 'CssSyntaxError';
    /**
     * Error message.
     *
     * @type {string}
     *
     * @example
     * error.message //=> 'Unclosed block'
     */

    _this.reason = message;

    if (file) {
      /**
       * Absolute path to the broken file.
       *
       * @type {string}
       *
       * @example
       * error.file       //=> 'a.sass'
       * error.input.file //=> 'a.css'
       */
      _this.file = file;
    }

    if (source) {
      /**
       * Source code of the broken file.
       *
       * @type {string}
       *
       * @example
       * error.source       //=> 'a { b {} }'
       * error.input.column //=> 'a b { }'
       */
      _this.source = source;
    }

    if (plugin) {
      /**
       * Plugin name, if error came from plugin.
       *
       * @type {string}
       *
       * @example
       * error.plugin //=> 'postcss-vars'
       */
      _this.plugin = plugin;
    }

    if (typeof line !== 'undefined' && typeof column !== 'undefined') {
      /**
       * Source line of the error.
       *
       * @type {number}
       *
       * @example
       * error.line       //=> 2
       * error.input.line //=> 4
       */
      _this.line = line;
      /**
       * Source column of the error.
       *
       * @type {number}
       *
       * @example
       * error.column       //=> 1
       * error.input.column //=> 4
       */

      _this.column = column;
    }

    _this.setMessage();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(_assertThisInitialized(_this), CssSyntaxError);
    }

    return _this;
  }

  var _proto = CssSyntaxError.prototype;

  _proto.setMessage = function setMessage() {
    /**
     * Full error text in the GNU error format
     * with plugin, file, line and column.
     *
     * @type {string}
     *
     * @example
     * error.message //=> 'a.css:1:1: Unclosed block'
     */
    this.message = this.plugin ? this.plugin + ': ' : '';
    this.message += this.file ? this.file : '<css input>';

    if (typeof this.line !== 'undefined') {
      this.message += ':' + this.line + ':' + this.column;
    }

    this.message += ': ' + this.reason;
  }
  /**
   * Returns a few lines of CSS source that caused the error.
   *
   * If the CSS has an input source map without `sourceContent`,
   * this method will return an empty string.
   *
   * @param {boolean} [color] Whether arrow will be colored red by terminal
   *                          color codes. By default, PostCSS will detect
   *                          color support by `process.stdout.isTTY`
   *                          and `process.env.NODE_DISABLE_COLORS`.
   *
   * @example
   * error.showSourceCode() //=> "  4 | }
   *                        //      5 | a {
   *                        //    > 6 |   bad
   *                        //        |   ^
   *                        //      7 | }
   *                        //      8 | b {"
   *
   * @return {string} Few lines of CSS source that caused the error.
   */
  ;

  _proto.showSourceCode = function showSourceCode(color) {
    var _this2 = this;

    if (!this.source) return '';
    var css = this.source;

    if (_terminalHighlight.default) {
      if (typeof color === 'undefined') color = _supportsColor.default.stdout;
      if (color) css = (0, _terminalHighlight.default)(css);
    }

    var lines = css.split(/\r?\n/);
    var start = Math.max(this.line - 3, 0);
    var end = Math.min(this.line + 2, lines.length);
    var maxWidth = String(end).length;

    function mark(text) {
      if (color && _chalk.default.red) {
        return _chalk.default.red.bold(text);
      }

      return text;
    }

    function aside(text) {
      if (color && _chalk.default.gray) {
        return _chalk.default.gray(text);
      }

      return text;
    }

    return lines.slice(start, end).map(function (line, index) {
      var number = start + 1 + index;
      var gutter = ' ' + (' ' + number).slice(-maxWidth) + ' | ';

      if (number === _this2.line) {
        var spacing = aside(gutter.replace(/\d/g, ' ')) + line.slice(0, _this2.column - 1).replace(/[^\t]/g, ' ');
        return mark('>') + aside(gutter) + line + '\n ' + spacing + mark('^');
      }

      return ' ' + aside(gutter) + line;
    }).join('\n');
  }
  /**
   * Returns error position, message and source code of the broken part.
   *
   * @example
   * error.toString() //=> "CssSyntaxError: app.css:1:1: Unclosed block
   *                  //    > 1 | a {
   *                  //        | ^"
   *
   * @return {string} Error position, message and source code.
   */
  ;

  _proto.toString = function toString() {
    var code = this.showSourceCode();

    if (code) {
      code = '\n\n' + code + '\n';
    }

    return this.name + ': ' + this.message + code;
  }
  /**
   * @memberof CssSyntaxError#
   * @member {Input} input Input object with PostCSS internal information
   *                       about input file. If input has source map
   *                       from previous tool, PostCSS will use origin
   *                       (for example, Sass) source. You can use this
   *                       object to get PostCSS input source.
   *
   * @example
   * error.input.file //=> 'a.css'
   * error.file       //=> 'a.sass'
   */
  ;

  return CssSyntaxError;
}( /*#__PURE__*/_wrapNativeSuper(Error));

var _default = CssSyntaxError;
exports.default = _default;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNzcy1zeW50YXgtZXJyb3IuZXM2Il0sIm5hbWVzIjpbIkNzc1N5bnRheEVycm9yIiwibWVzc2FnZSIsImxpbmUiLCJjb2x1bW4iLCJzb3VyY2UiLCJmaWxlIiwicGx1Z2luIiwibmFtZSIsInJlYXNvbiIsInNldE1lc3NhZ2UiLCJFcnJvciIsImNhcHR1cmVTdGFja1RyYWNlIiwic2hvd1NvdXJjZUNvZGUiLCJjb2xvciIsImNzcyIsInRlcm1pbmFsSGlnaGxpZ2h0Iiwic3VwcG9ydHNDb2xvciIsInN0ZG91dCIsImxpbmVzIiwic3BsaXQiLCJzdGFydCIsIk1hdGgiLCJtYXgiLCJlbmQiLCJtaW4iLCJsZW5ndGgiLCJtYXhXaWR0aCIsIlN0cmluZyIsIm1hcmsiLCJ0ZXh0IiwiY2hhbGsiLCJyZWQiLCJib2xkIiwiYXNpZGUiLCJncmF5Iiwic2xpY2UiLCJtYXAiLCJpbmRleCIsIm51bWJlciIsImd1dHRlciIsInNwYWNpbmciLCJyZXBsYWNlIiwiam9pbiIsInRvU3RyaW5nIiwiY29kZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQTs7QUFDQTs7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBMkJNQSxjOzs7QUFDSjs7Ozs7Ozs7QUFRQSwwQkFBYUMsT0FBYixFQUFzQkMsSUFBdEIsRUFBNEJDLE1BQTVCLEVBQW9DQyxNQUFwQyxFQUE0Q0MsSUFBNUMsRUFBa0RDLE1BQWxELEVBQTBEO0FBQUE7O0FBQ3hELDhCQUFNTCxPQUFOO0FBRUE7Ozs7Ozs7Ozs7Ozs7O0FBYUEsVUFBS00sSUFBTCxHQUFZLGdCQUFaO0FBQ0E7Ozs7Ozs7OztBQVFBLFVBQUtDLE1BQUwsR0FBY1AsT0FBZDs7QUFFQSxRQUFJSSxJQUFKLEVBQVU7QUFDUjs7Ozs7Ozs7O0FBU0EsWUFBS0EsSUFBTCxHQUFZQSxJQUFaO0FBQ0Q7O0FBQ0QsUUFBSUQsTUFBSixFQUFZO0FBQ1Y7Ozs7Ozs7OztBQVNBLFlBQUtBLE1BQUwsR0FBY0Es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QUFDQSxVQUFJWSxNQUFNLEtBQUssTUFBSSxDQUFDcEMsSUFBcEIsRUFBMEI7QUFDeEIsWUFBSXNDLE9BQU8sR0FBR1AsS0FBSyxDQUFDTSxNQUFNLENBQUNFLE9BQVAsQ0FBZSxLQUFmLEVBQXNCLEdBQXRCLENBQUQsQ0FBTCxHQUNadkMsSUFBSSxDQUFDaUMsS0FBTCxDQUFXLENBQVgsRUFBYyxNQUFJLENBQUNoQyxNQUFMLEdBQWMsQ0FBNUIsRUFBK0JzQyxPQUEvQixDQUF1QyxRQUF2QyxFQUFpRCxHQUFqRCxDQURGO0FBRUEsZUFBT2IsSUFBSSxDQUFDLEdBQUQsQ0FBSixHQUFZSyxLQUFLLENBQUNNLE1BQUQsQ0FBakIsR0FBNEJyQyxJQUE1QixHQUFtQyxLQUFuQyxHQUEyQ3NDLE9BQTNDLEdBQXFEWixJQUFJLENBQUMsR0FBRCxDQUFoRTtBQUNEOztBQUNELGFBQU8sTUFBTUssS0FBSyxDQUFDTSxNQUFELENBQVgsR0FBc0JyQyxJQUE3QjtBQUNELEtBVE0sRUFTSndDLElBVEksQ0FTQyxJQVRELENBQVA7QUFVRDtBQUVEOzs7Ozs7Ozs7Ozs7U0FVQUMsUSxHQUFBLG9CQUFZO0FBQ1YsUUFBSUMsSUFBSSxHQUFHLEtBQUtoQyxjQUFMLEVBQVg7O0FBQ0EsUUFBSWdDLElBQUosRUFBVTtBQUNSQSxNQUFBQSxJQUFJLEdBQUcsU0FBU0EsSUFBVCxHQUFnQixJQUF2QjtBQUNEOztBQUNELFdBQU8sS0FBS3JDLElBQUwsR0FBWSxJQUFaLEdBQW1CLEtBQUtOLE9BQXhCLEdBQWtDMkMsSUFBekM7QUFDRDtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7aUNBdE0yQmxDLEs7O2VBb05kVixjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHN1cHBvcnRzQ29sb3IgZnJvbSAnc3VwcG9ydHMtY29sb3InXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnXG5cbmltcG9ydCB0ZXJtaW5hbEhpZ2hsaWdodCBmcm9tICcuL3Rlcm1pbmFsLWhpZ2hsaWdodCdcblxuLyoqXG4gKiBUaGUgQ1NTIHBhcnNlciB0aHJvd3MgdGhpcyBlcnJvciBmb3IgYnJva2VuIENTUy5cbiAqXG4gKiBDdXN0b20gcGFyc2VycyBjYW4gdGhyb3cgdGhpcyBlcnJvciBmb3IgYnJva2VuIGN1c3RvbSBzeW50YXggdXNpbmdcbiAqIHRoZSB7QGxpbmsgTm9kZSNlcnJvcn0gbWV0aG9kLlxuICpcbiAqIFBvc3RDU1Mgd2lsbCB1c2UgdGhlIGlucHV0IHNvdXJjZSBtYXAgdG8gZGV0ZWN0IHRoZSBvcmlnaW5hbCBlcnJvciBsb2NhdGlvbi5cbiAqIElmIHlvdSB3cm90ZSBhIFNhc3MgZmlsZSwgY29tcGlsZWQgaXQgdG8gQ1NTIGFuZCB0aGVuIHBhcnNlZCBpdCB3aXRoIFBvc3RDU1MsXG4gKiBQb3N0Q1NTIHdpbGwgc2hvdyB0aGUgb3JpZ2luYWwgcG9zaXRpb24gaW4gdGhlIFNhc3MgZmlsZS5cbiAqXG4gKiBJZiB5b3UgbmVlZCB0aGUgcG9zaXRpb24gaW4gdGhlIFBvc3RDU1MgaW5wdXRcbiAqIChlLmcuLCB0byBkZWJ1ZyB0aGUgcHJldmlvdXMgY29tcGlsZXIpLCB1c2UgYGVycm9yLmlucHV0LmZpbGVgLlxuICpcbiAqIEBleGFtcGxlXG4gKiAvLyBDYXRjaGluZyBhbmQgY2hlY2tpbmcgc3ludGF4IGVycm9yXG4gKiB0cnkge1xuICogICBwb3N0Y3NzLnBhcnNlKCdheycpXG4gKiB9IGNhdGNoIChlcnJvcikge1xuICogICBpZiAoZXJyb3IubmFtZSA9PT0gJ0Nzc1N5bnRheEVycm9yJykge1xuICogICAgIGVycm9yIC8vPT4gQ3NzU3ludGF4RXJyb3JcbiAqICAgfVxuICogfVxuICpcbiAqIEBleGFtcGxlXG4gKiAvLyBSYWlzaW5nIGVycm9yIGZyb20gcGx1Z2luXG4gKiB0aHJvdyBub2RlLmVycm9yKCdVbmtub3duIHZhcmlhYmxlJywgeyBwbHVnaW46ICdwb3N0Y3NzLXZhcnMnIH0pXG4gKi9cbmNsYXNzIENzc1N5bnRheEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgIEVycm9yIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbbGluZV0gICBTb3VyY2UgbGluZSBvZiB0aGUgZXJyb3IuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbY29sdW1uXSBTb3VyY2UgY29sdW1uIG9mIHRoZSBlcnJvci5cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtzb3VyY2VdIFNvdXJjZSBjb2RlIG9mIHRoZSBicm9rZW4gZmlsZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtmaWxlXSAgIEFic29sdXRlIHBhdGggdG8gdGhlIGJyb2tlbiBmaWxlLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3BsdWdpbl0gUG9zdENTUyBwbHVnaW4gbmFtZSwgaWYgZXJyb3IgY2FtZSBmcm9tIHBsdWdpbi5cbiAgICovXG4gIGNvbnN0cnVjdG9yIChtZXNzYWdlLCBsaW5lLCBjb2x1bW4sIHNvdXJjZSwgZmlsZSwgcGx1Z2luKSB7XG4gICAgc3VwZXIobWVzc2FnZSlcblxuICAgIC8qKlxuICAgICAqIEFsd2F5cyBlcXVhbCB0byBgJ0Nzc1N5bnRheEVycm9yJ2AuIFlvdSBzaG91bGQgYWx3YXlzIGNoZWNrIGVycm9yIHR5cGVcbiAgICAgKiBieSBgZXJyb3IubmFtZSA9PT0gJ0Nzc1N5bnRheEVycm9yJ2BcbiAgICAgKiBpbnN0ZWFkIG9mIGBlcnJvciBpbnN0YW5jZW9mIENzc1N5bnRheEVycm9yYCxcbiAgICAgKiBiZWNhdXNlIG5wbSBjb3VsZCBoYXZlIHNldmVyYWwgUG9zdENTUyB2ZXJzaW9ucy5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGlmIChlcnJvci5uYW1lID09PSAnQ3NzU3ludGF4RXJyb3InKSB7XG4gICAgICogICBlcnJvciAvLz0+IENzc1N5bnRheEVycm9yXG4gICAgICogfVxuICAgICAqL1xuICAgIHRoaXMubmFtZSA9ICdDc3NTeW50YXhFcnJvcidcbiAgICAvKipcbiAgICAgKiBFcnJvciBtZXNzYWdlLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogZXJyb3IubWVzc2FnZSAvLz0+ICdVbmNsb3NlZCBibG9jaydcbiAgICAgKi9cbiAgICB0aGlzLnJlYXNvbiA9IG1lc3NhZ2VcblxuICAgIGlmIChmaWxlKSB7XG4gICAgICAvKipcbiAgICAgICAqIEFic29sdXRlIHBhdGggdG8gdGhlIGJyb2tlbiBmaWxlLlxuICAgICAgICpcbiAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqIGVycm9yLmZpbGUgICAgICAgLy89PiAnYS5zYXNzJ1xuICAgICAgICogZXJyb3IuaW5wdXQuZmlsZSAvLz0+ICdhLmNzcydcbiAgICAgICAqL1xuICAgICAgdGhpcy5maWxlID0gZmlsZVxuICAgIH1cbiAgICBpZiAoc291cmNlKSB7XG4gICAgICAvKipcbiAgICAgICAqIFNvdXJjZSBjb2RlIG9mIHRoZSBicm9rZW4gZmlsZS5cbiAgICAgICAqXG4gICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICpcbiAgICAgICAqIEBleGFtcGxlXG4gICAgICAgKiBlcnJvci5zb3VyY2UgICAgICAgLy89PiAnYSB7IGIge30gfSdcbiAgICAgICAqIGVycm9yLmlucHV0LmNvbHVtbiAvLz0+ICdhIGIgeyB9J1xuICAgICAgICovXG4gICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZVxuICAgIH1cbiAgICBpZiAocGx1Z2luKSB7XG4gICAgICAvKipcbiAgICAgICAqIFBsdWdpbiBuYW1lLCBpZiBlcnJvciBjYW1lIGZyb20gcGx1Z2luLlxuICAgICAgICpcbiAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqIGVycm9yLnBsdWdpbiAvLz0+ICdwb3N0Y3NzLXZhcnMnXG4gICAgICAgKi9cbiAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luXG4gICAgfVxuICAgIGlmICh0eXBlb2YgbGluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGNvbHVtbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIC8qKlxuICAgICAgICogU291cmNlIGxpbmUgb2YgdGhlIGVycm9yLlxuICAgICAgICpcbiAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqIGVycm9yLmxpbmUgICAgICAgLy89PiAyXG4gICAgICAgKiBlcnJvci5pbnB1dC5saW5lIC8vPT4gNFxuICAgICAgICovXG4gICAgICB0aGlzLmxpbmUgPSBsaW5lXG4gICAgICAvKipcbiAgICAgICAqIFNvdXJjZSBjb2x1bW4gb2YgdGhlIGVycm9yLlxuICAgICAgICpcbiAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqIGVycm9yLmNvbHVtbiAgICAgICAvLz0+IDFcbiAgICAgICAqIGVycm9yLmlucHV0LmNvbHVtbiAvLz0+IDRcbiAgICAgICAqL1xuICAgICAgdGhpcy5jb2x1bW4gPSBjb2x1bW5cbiAgICB9XG5cbiAgICB0aGlzLnNldE1lc3NhZ2UoKVxuXG4gICAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBDc3NTeW50YXhFcnJvcilcbiAgICB9XG4gIH1cblxuICBzZXRNZXNzYWdlICgpIHtcbiAgICAvKipcbiAgICAgKiBGdWxsIGVycm9yIHRleHQgaW4gdGhlIEdOVSBlcnJvciBmb3JtYXRcbiAgICAgKiB3aXRoIHBsdWdpbiwgZmlsZSwgbGluZSBhbmQgY29sdW1uLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogZXJyb3IubWVzc2FnZSAvLz0+ICdhLmNzczoxOjE6IFVuY2xvc2VkIGJsb2NrJ1xuICAgICAqL1xuICAgIHRoaXMubWVzc2FnZSA9IHRoaXMucGx1Z2luID8gdGhpcy5wbHVnaW4gKyAnOiAnIDogJydcbiAgICB0aGlzLm1lc3NhZ2UgKz0gdGhpcy5maWxlID8gdGhpcy5maWxlIDogJzxjc3MgaW5wdXQ+J1xuICAgIGlmICh0eXBlb2YgdGhpcy5saW5lICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5tZXNzYWdlICs9ICc6JyArIHRoaXMubGluZSArICc6JyArIHRoaXMuY29sdW1uXG4gICAgfVxuICAgIHRoaXMubWVzc2FnZSArPSAnOiAnICsgdGhpcy5yZWFzb25cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgZmV3IGxpbmVzIG9mIENTUyBzb3VyY2UgdGhhdCBjYXVzZWQgdGhlIGVycm9yLlxuICAgKlxuICAgKiBJZiB0aGUgQ1NTIGhhcyBhbiBpbnB1dCBzb3VyY2UgbWFwIHdpdGhvdXQgYHNvdXJjZUNvbnRlbnRgLFxuICAgKiB0aGlzIG1ldGhvZCB3aWxsIHJldHVybiBhbiBlbXB0eSBzdHJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbG9yXSBXaGV0aGVyIGFycm93IHdpbGwgYmUgY29sb3JlZCByZWQgYnkgdGVybWluYWxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yIGNvZGVzLiBCeSBkZWZhdWx0LCBQb3N0Q1NTIHdpbGwgZGV0ZWN0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvciBzdXBwb3J0IGJ5IGBwcm9jZXNzLnN0ZG91dC5pc1RUWWBcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgIGFuZCBgcHJvY2Vzcy5lbnYuTk9ERV9ESVNBQkxFX0NPTE9SU2AuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGVycm9yLnNob3dTb3VyY2VDb2RlKCkgLy89PiBcIiAgNCB8IH1cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgIDUgfCBhIHtcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAvLyAgICA+IDYgfCAgIGJhZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICB8ICAgXlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgNyB8IH1cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgIDggfCBiIHtcIlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9IEZldyBsaW5lcyBvZiBDU1Mgc291cmNlIHRoYXQgY2F1c2VkIHRoZSBlcnJvci5cbiAgICovXG4gIHNob3dTb3VyY2VDb2RlIChjb2xvcikge1xuICAgIGlmICghdGhpcy5zb3VyY2UpIHJldHVybiAnJ1xuXG4gICAgbGV0IGNzcyA9IHRoaXMuc291cmNlXG4gICAgaWYgKHRlcm1pbmFsSGlnaGxpZ2h0KSB7XG4gICAgICBpZiAodHlwZW9mIGNvbG9yID09PSAndW5kZWZpbmVkJykgY29sb3IgPSBzdXBwb3J0c0NvbG9yLnN0ZG91dFxuICAgICAgaWYgKGNvbG9yKSBjc3MgPSB0ZXJtaW5hbEhpZ2hsaWdodChjc3MpXG4gICAgfVxuXG4gICAgbGV0IGxpbmVzID0gY3NzLnNwbGl0KC9cXHI/XFxuLylcbiAgICBsZXQgc3RhcnQgPSBNYXRoLm1heCh0aGlzLmxpbmUgLSAzLCAwKVxuICAgIGxldCBlbmQgPSBNYXRoLm1pbih0aGlzLmxpbmUgKyAyLCBsaW5lcy5sZW5ndGgpXG5cbiAgICBsZXQgbWF4V2lkdGggPSBTdHJpbmcoZW5kKS5sZW5ndGhcblxuICAgIGZ1bmN0aW9uIG1hcmsgKHRleHQpIHtcbiAgICAgIGlmIChjb2xvciAmJiBjaGFsay5yZWQpIHtcbiAgICAgICAgcmV0dXJuIGNoYWxrLnJlZC5ib2xkKHRleHQpXG4gICAgICB9XG4gICAgICByZXR1cm4gdGV4dFxuICAgIH1cbiAgICBmdW5jdGlvbiBhc2lkZSAodGV4dCkge1xuICAgICAgaWYgKGNvbG9yICYmIGNoYWxrLmdyYXkpIHtcbiAgICAgICAgcmV0dXJuIGNoYWxrLmdyYXkodGV4dClcbiAgICAgIH1cbiAgICAgIHJldHVybiB0ZXh0XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpbmVzLnNsaWNlKHN0YXJ0LCBlbmQpLm1hcCgobGluZSwgaW5kZXgpID0+IHtcbiAgICAgIGxldCBudW1iZXIgPSBzdGFydCArIDEgKyBpbmRleFxuICAgICAgbGV0IGd1dHRlciA9ICcgJyArICgnICcgKyBudW1iZXIpLnNsaWNlKC1tYXhXaWR0aCkgKyAnIHwgJ1xuICAgICAgaWYgKG51bWJlciA9PT0gdGhpcy5saW5lKSB7XG4gICAgICAgIGxldCBzcGFjaW5nID0gYXNpZGUoZ3V0dGVyLnJlcGxhY2UoL1xcZC9nLCAnICcpKSArXG4gICAgICAgICAgbGluZS5zbGljZSgwLCB0aGlzLmNvbHVtbiAtIDEpLnJlcGxhY2UoL1teXFx0XS9nLCAnICcpXG4gICAgICAgIHJldHVybiBtYXJrKCc+JykgKyBhc2lkZShndXR0ZXIpICsgbGluZSArICdcXG4gJyArIHNwYWNpbmcgKyBtYXJrKCdeJylcbiAgICAgIH1cbiAgICAgIHJldHVybiAnICcgKyBhc2lkZShndXR0ZXIpICsgbGluZVxuICAgIH0pLmpvaW4oJ1xcbicpXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBlcnJvciBwb3NpdGlvbiwgbWVzc2FnZSBhbmQgc291cmNlIGNvZGUgb2YgdGhlIGJyb2tlbiBwYXJ0LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBlcnJvci50b1N0cmluZygpIC8vPT4gXCJDc3NTeW50YXhFcnJvcjogYXBwLmNzczoxOjE6IFVuY2xvc2VkIGJsb2NrXG4gICAqICAgICAgICAgICAgICAgICAgLy8gICAgPiAxIHwgYSB7XG4gICAqICAgICAgICAgICAgICAgICAgLy8gICAgICAgIHwgXlwiXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ30gRXJyb3IgcG9zaXRpb24sIG1lc3NhZ2UgYW5kIHNvdXJjZSBjb2RlLlxuICAgKi9cbiAgdG9TdHJpbmcgKCkge1xuICAgIGxldCBjb2RlID0gdGhpcy5zaG93U291cmNlQ29kZSgpXG4gICAgaWYgKGNvZGUpIHtcbiAgICAgIGNvZGUgPSAnXFxuXFxuJyArIGNvZGUgKyAnXFxuJ1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5uYW1lICsgJzogJyArIHRoaXMubWVzc2FnZSArIGNvZGVcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyb2YgQ3NzU3ludGF4RXJyb3IjXG4gICAqIEBtZW1iZXIge0lucHV0fSBpbnB1dCBJbnB1dCBvYmplY3Qgd2l0aCBQb3N0Q1NTIGludGVybmFsIGluZm9ybWF0aW9uXG4gICAqICAgICAgICAgICAgICAgICAgICAgICBhYm91dCBpbnB1dCBmaWxlLiBJZiBpbnB1dCBoYXMgc291cmNlIG1hcFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgZnJvbSBwcmV2aW91cyB0b29sLCBQb3N0Q1NTIHdpbGwgdXNlIG9yaWdpblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgKGZvciBleGFtcGxlLCBTYXNzKSBzb3VyY2UuIFlvdSBjYW4gdXNlIHRoaXNcbiAgICogICAgICAgICAgICAgICAgICAgICAgIG9iamVjdCB0byBnZXQgUG9zdENTUyBpbnB1dCBzb3VyY2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGVycm9yLmlucHV0LmZpbGUgLy89PiAnYS5jc3MnXG4gICAqIGVycm9yLmZpbGUgICAgICAgLy89PiAnYS5zYXNzJ1xuICAgKi9cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ3NzU3ludGF4RXJyb3JcbiJdLCJmaWxlIjoiY3NzLXN5bnRheC1lcnJvci5qcyJ9
