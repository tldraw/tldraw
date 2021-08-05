"use strict";

exports.__esModule = true;
exports.default = void 0;

var _sourceMap = _interopRequireDefault(require("source-map"));

var _path = _interopRequireDefault(require("path"));

var _fs = _interopRequireDefault(require("fs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function fromBase64(str) {
  if (Buffer) {
    return Buffer.from(str, 'base64').toString();
  } else {
    return window.atob(str);
  }
}
/**
 * Source map information from input CSS.
 * For example, source map after Sass compiler.
 *
 * This class will automatically find source map in input CSS or in file system
 * near input file (according `from` option).
 *
 * @example
 * const root = postcss.parse(css, { from: 'a.sass.css' })
 * root.input.map //=> PreviousMap
 */


var PreviousMap = /*#__PURE__*/function () {
  /**
   * @param {string}         css    Input CSS source.
   * @param {processOptions} [opts] {@link Processor#process} options.
   */
  function PreviousMap(css, opts) {
    this.loadAnnotation(css);
    /**
     * Was source map inlined by data-uri to input CSS.
     *
     * @type {boolean}
     */

    this.inline = this.startWith(this.annotation, 'data:');
    var prev = opts.map ? opts.map.prev : undefined;
    var text = this.loadMap(opts.from, prev);
    if (text) this.text = text;
  }
  /**
   * Create a instance of `SourceMapGenerator` class
   * from the `source-map` library to work with source map information.
   *
   * It is lazy method, so it will create object only on first call
   * and then it will use cache.
   *
   * @return {SourceMapGenerator} Object with source map information.
   */


  var _proto = PreviousMap.prototype;

  _proto.consumer = function consumer() {
    if (!this.consumerCache) {
      this.consumerCache = new _sourceMap.default.SourceMapConsumer(this.text);
    }

    return this.consumerCache;
  }
  /**
   * Does source map contains `sourcesContent` with input source text.
   *
   * @return {boolean} Is `sourcesContent` present.
   */
  ;

  _proto.withContent = function withContent() {
    return !!(this.consumer().sourcesContent && this.consumer().sourcesContent.length > 0);
  };

  _proto.startWith = function startWith(string, start) {
    if (!string) return false;
    return string.substr(0, start.length) === start;
  };

  _proto.getAnnotationURL = function getAnnotationURL(sourceMapString) {
    return sourceMapString.match(/\/\*\s*# sourceMappingURL=((?:(?!sourceMappingURL=).)*)\*\//)[1].trim();
  };

  _proto.loadAnnotation = function loadAnnotation(css) {
    var annotations = css.match(/\/\*\s*# sourceMappingURL=(?:(?!sourceMappingURL=).)*\*\//gm);

    if (annotations && annotations.length > 0) {
      // Locate the last sourceMappingURL to avoid picking up
      // sourceMappingURLs from comments, strings, etc.
      var lastAnnotation = annotations[annotations.length - 1];

      if (lastAnnotation) {
        this.annotation = this.getAnnotationURL(lastAnnotation);
      }
    }
  };

  _proto.decodeInline = function decodeInline(text) {
    var baseCharsetUri = /^data:application\/json;charset=utf-?8;base64,/;
    var baseUri = /^data:application\/json;base64,/;
    var uri = 'data:application/json,';

    if (this.startWith(text, uri)) {
      return decodeURIComponent(text.substr(uri.length));
    }

    if (baseCharsetUri.test(text) || baseUri.test(text)) {
      return fromBase64(text.substr(RegExp.lastMatch.length));
    }

    var encoding = text.match(/data:application\/json;([^,]+),/)[1];
    throw new Error('Unsupported source map encoding ' + encoding);
  };

  _proto.loadMap = function loadMap(file, prev) {
    if (prev === false) return false;

    if (prev) {
      if (typeof prev === 'string') {
        return prev;
      } else if (typeof prev === 'function') {
        var prevPath = prev(file);

        if (prevPath && _fs.default.existsSync && _fs.default.existsSync(prevPath)) {
          return _fs.default.readFileSync(prevPath, 'utf-8').toString().trim();
        } else {
          throw new Error('Unable to load previous source map: ' + prevPath.toString());
        }
      } else if (prev instanceof _sourceMap.default.SourceMapConsumer) {
        return _sourceMap.default.SourceMapGenerator.fromSourceMap(prev).toString();
      } else if (prev instanceof _sourceMap.default.SourceMapGenerator) {
        return prev.toString();
      } else if (this.isMap(prev)) {
        return JSON.stringify(prev);
      } else {
        throw new Error('Unsupported previous source map format: ' + prev.toString());
      }
    } else if (this.inline) {
      return this.decodeInline(this.annotation);
    } else if (this.annotation) {
      var map = this.annotation;
      if (file) map = _path.default.join(_path.default.dirname(file), map);
      this.root = _path.default.dirname(map);

      if (_fs.default.existsSync && _fs.default.existsSync(map)) {
        return _fs.default.readFileSync(map, 'utf-8').toString().trim();
      } else {
        return false;
      }
    }
  };

  _proto.isMap = function isMap(map) {
    if (typeof map !== 'object') return false;
    return typeof map.mappings === 'string' || typeof map._mappings === 'string';
  };

  return PreviousMap;
}();

var _default = PreviousMap;
exports.default = _default;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInByZXZpb3VzLW1hcC5lczYiXSwibmFtZXMiOlsiZnJvbUJhc2U2NCIsInN0ciIsIkJ1ZmZlciIsImZyb20iLCJ0b1N0cmluZyIsIndpbmRvdyIsImF0b2IiLCJQcmV2aW91c01hcCIsImNzcyIsIm9wdHMiLCJsb2FkQW5ub3RhdGlvbiIsImlubGluZSIsInN0YXJ0V2l0aCIsImFubm90YXRpb24iLCJwcmV2IiwibWFwIiwidW5kZWZpbmVkIiwidGV4dCIsImxvYWRNYXAiLCJjb25zdW1lciIsImNvbnN1bWVyQ2FjaGUiLCJtb3ppbGxhIiwiU291cmNlTWFwQ29uc3VtZXIiLCJ3aXRoQ29udGVudCIsInNvdXJjZXNDb250ZW50IiwibGVuZ3RoIiwic3RyaW5nIiwic3RhcnQiLCJzdWJzdHIiLCJnZXRBbm5vdGF0aW9uVVJMIiwic291cmNlTWFwU3RyaW5nIiwibWF0Y2giLCJ0cmltIiwiYW5ub3RhdGlvbnMiLCJsYXN0QW5ub3RhdGlvbiIsImRlY29kZUlubGluZSIsImJhc2VDaGFyc2V0VXJpIiwiYmFzZVVyaSIsInVyaSIsImRlY29kZVVSSUNvbXBvbmVudCIsInRlc3QiLCJSZWdFeHAiLCJsYXN0TWF0Y2giLCJlbmNvZGluZyIsIkVycm9yIiwiZmlsZSIsInByZXZQYXRoIiwiZnMiLCJleGlzdHNTeW5jIiwicmVhZEZpbGVTeW5jIiwiU291cmNlTWFwR2VuZXJhdG9yIiwiZnJvbVNvdXJjZU1hcCIsImlzTWFwIiwiSlNPTiIsInN0cmluZ2lmeSIsInBhdGgiLCJqb2luIiwiZGlybmFtZSIsInJvb3QiLCJtYXBwaW5ncyIsIl9tYXBwaW5ncyJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7OztBQUVBLFNBQVNBLFVBQVQsQ0FBcUJDLEdBQXJCLEVBQTBCO0FBQ3hCLE1BQUlDLE1BQUosRUFBWTtBQUNWLFdBQU9BLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZRixHQUFaLEVBQWlCLFFBQWpCLEVBQTJCRyxRQUEzQixFQUFQO0FBQ0QsR0FGRCxN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QUFMLENBQWV4QyxJQUFmLENBQVA7QUFDRCxPQUZNLE1BRUE7QUFDTCxjQUFNLElBQUk4QixLQUFKLENBQ0osNkNBQTZDOUIsSUFBSSxDQUFDVixRQUFMLEVBRHpDLENBQU47QUFFRDtBQUNGLEtBckJELE1BcUJPLElBQUksS0FBS08sTUFBVCxFQUFpQjtBQUN0QixhQUFPLEtBQUt3QixZQUFMLENBQWtCLEtBQUt0QixVQUF2QixDQUFQO0FBQ0QsS0FGTSxNQUVBLElBQUksS0FBS0EsVUFBVCxFQUFxQjtBQUMxQixVQUFJRSxHQUFHLEdBQUcsS0FBS0YsVUFBZjtBQUNBLFVBQUlnQyxJQUFKLEVBQVU5QixHQUFHLEdBQUd3QyxjQUFLQyxJQUFMLENBQVVELGNBQUtFLE9BQUwsQ0FBYVosSUFBYixDQUFWLEVBQThCOUIsR0FBOUIsQ0FBTjtBQUVWLFdBQUsyQyxJQUFMLEdBQVlILGNBQUtFLE9BQUwsQ0FBYTFDLEdBQWIsQ0FBWjs7QUFDQSxVQUFJZ0MsWUFBR0MsVUFBSCxJQUFpQkQsWUFBR0MsVUFBSCxDQUFjakMsR0FBZCxDQUFyQixFQUF5QztBQUN2QyxlQUFPZ0MsWUFBR0UsWUFBSCxDQUFnQmxDLEdBQWhCLEVBQXFCLE9BQXJCLEVBQThCWCxRQUE5QixHQUF5QzRCLElBQXpDLEVBQVA7QUFDRCxPQUZELE1BRU87QUFDTCxlQUFPLEtBQVA7QUFDRDtBQUNGO0FBQ0YsRzs7U0FFRG9CLEssR0FBQSxlQUFPckMsR0FBUCxFQUFZO0FBQ1YsUUFBSSxPQUFPQSxHQUFQLEtBQWUsUUFBbkIsRUFBNkIsT0FBTyxLQUFQO0FBQzdCLFdBQU8sT0FBT0EsR0FBRyxDQUFDNEMsUUFBWCxLQUF3QixRQUF4QixJQUFvQyxPQUFPNUMsR0FBRyxDQUFDNkMsU0FBWCxLQUF5QixRQUFwRTtBQUNELEc7Ozs7O2VBR1lyRCxXIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG1vemlsbGEgZnJvbSAnc291cmNlLW1hcCdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgZnMgZnJvbSAnZnMnXG5cbmZ1bmN0aW9uIGZyb21CYXNlNjQgKHN0cikge1xuICBpZiAoQnVmZmVyKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKHN0ciwgJ2Jhc2U2NCcpLnRvU3RyaW5nKClcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gd2luZG93LmF0b2Ioc3RyKVxuICB9XG59XG5cbi8qKlxuICogU291cmNlIG1hcCBpbmZvcm1hdGlvbiBmcm9tIGlucHV0IENTUy5cbiAqIEZvciBleGFtcGxlLCBzb3VyY2UgbWFwIGFmdGVyIFNhc3MgY29tcGlsZXIuXG4gKlxuICogVGhpcyBjbGFzcyB3aWxsIGF1dG9tYXRpY2FsbHkgZmluZCBzb3VyY2UgbWFwIGluIGlucHV0IENTUyBvciBpbiBmaWxlIHN5c3RlbVxuICogbmVhciBpbnB1dCBmaWxlIChhY2NvcmRpbmcgYGZyb21gIG9wdGlvbikuXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHJvb3QgPSBwb3N0Y3NzLnBhcnNlKGNzcywgeyBmcm9tOiAnYS5zYXNzLmNzcycgfSlcbiAqIHJvb3QuaW5wdXQubWFwIC8vPT4gUHJldmlvdXNNYXBcbiAqL1xuY2xhc3MgUHJldmlvdXNNYXAge1xuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd9ICAgICAgICAgY3NzICAgIElucHV0IENTUyBzb3VyY2UuXG4gICAqIEBwYXJhbSB7cHJvY2Vzc09wdGlvbnN9IFtvcHRzXSB7QGxpbmsgUHJvY2Vzc29yI3Byb2Nlc3N9IG9wdGlvbnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvciAoY3NzLCBvcHRzKSB7XG4gICAgdGhpcy5sb2FkQW5ub3RhdGlvbihjc3MpXG4gICAgLyoqXG4gICAgICogV2FzIHNvdXJjZSBtYXAgaW5saW5lZCBieSBkYXRhLXVyaSB0byBpbnB1dCBDU1MuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB0aGlzLmlubGluZSA9IHRoaXMuc3RhcnRXaXRoKHRoaXMuYW5ub3RhdGlvbiwgJ2RhdGE6JylcblxuICAgIGxldCBwcmV2ID0gb3B0cy5tYXAgPyBvcHRzLm1hcC5wcmV2IDogdW5kZWZpbmVkXG4gICAgbGV0IHRleHQgPSB0aGlzLmxvYWRNYXAob3B0cy5mcm9tLCBwcmV2KVxuICAgIGlmICh0ZXh0KSB0aGlzLnRleHQgPSB0ZXh0XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgaW5zdGFuY2Ugb2YgYFNvdXJjZU1hcEdlbmVyYXRvcmAgY2xhc3NcbiAgICogZnJvbSB0aGUgYHNvdXJjZS1tYXBgIGxpYnJhcnkgdG8gd29yayB3aXRoIHNvdXJjZSBtYXAgaW5mb3JtYXRpb24uXG4gICAqXG4gICAqIEl0IGlzIGxhenkgbWV0aG9kLCBzbyBpdCB3aWxsIGNyZWF0ZSBvYmplY3Qgb25seSBvbiBmaXJzdCBjYWxsXG4gICAqIGFuZCB0aGVuIGl0IHdpbGwgdXNlIGNhY2hlLlxuICAgKlxuICAgKiBAcmV0dXJuIHtTb3VyY2VNYXBHZW5lcmF0b3J9IE9iamVjdCB3aXRoIHNvdXJjZSBtYXAgaW5mb3JtYXRpb24uXG4gICAqL1xuICBjb25zdW1lciAoKSB7XG4gICAgaWYgKCF0aGlzLmNvbnN1bWVyQ2FjaGUpIHtcbiAgICAgIHRoaXMuY29uc3VtZXJDYWNoZSA9IG5ldyBtb3ppbGxhLlNvdXJjZU1hcENvbnN1bWVyKHRoaXMudGV4dClcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29uc3VtZXJDYWNoZVxuICB9XG5cbiAgLyoqXG4gICAqIERvZXMgc291cmNlIG1hcCBjb250YWlucyBgc291cmNlc0NvbnRlbnRgIHdpdGggaW5wdXQgc291cmNlIHRleHQuXG4gICAqXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59IElzIGBzb3VyY2VzQ29udGVudGAgcHJlc2VudC5cbiAgICovXG4gIHdpdGhDb250ZW50ICgpIHtcbiAgICByZXR1cm4gISEodGhpcy5jb25zdW1lcigpLnNvdXJjZXNDb250ZW50ICYmXG4gICAgICAgICAgICAgIHRoaXMuY29uc3VtZXIoKS5zb3VyY2VzQ29udGVudC5sZW5ndGggPiAwKVxuICB9XG5cbiAgc3RhcnRXaXRoIChzdHJpbmcsIHN0YXJ0KSB7XG4gICAgaWYgKCFzdHJpbmcpIHJldHVybiBmYWxzZVxuICAgIHJldHVybiBzdHJpbmcuc3Vic3RyKDAsIHN0YXJ0Lmxlbmd0aCkgPT09IHN0YXJ0XG4gIH1cblxuICBnZXRBbm5vdGF0aW9uVVJMIChzb3VyY2VNYXBTdHJpbmcpIHtcbiAgICByZXR1cm4gc291cmNlTWFwU3RyaW5nXG4gICAgICAubWF0Y2goL1xcL1xcKlxccyojIHNvdXJjZU1hcHBpbmdVUkw9KCg/Oig/IXNvdXJjZU1hcHBpbmdVUkw9KS4pKilcXCpcXC8vKVsxXVxuICAgICAgLnRyaW0oKVxuICB9XG5cbiAgbG9hZEFubm90YXRpb24gKGNzcykge1xuICAgIGxldCBhbm5vdGF0aW9ucyA9IGNzcy5tYXRjaChcbiAgICAgIC9cXC9cXCpcXHMqIyBzb3VyY2VNYXBwaW5nVVJMPSg/Oig/IXNvdXJjZU1hcHBpbmdVUkw9KS4pKlxcKlxcLy9nbVxuICAgIClcblxuICAgIGlmIChhbm5vdGF0aW9ucyAmJiBhbm5vdGF0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBMb2NhdGUgdGhlIGxhc3Qgc291cmNlTWFwcGluZ1VSTCB0byBhdm9pZCBwaWNraW5nIHVwXG4gICAgICAvLyBzb3VyY2VNYXBwaW5nVVJMcyBmcm9tIGNvbW1lbnRzLCBzdHJpbmdzLCBldGMuXG4gICAgICBsZXQgbGFzdEFubm90YXRpb24gPSBhbm5vdGF0aW9uc1thbm5vdGF0aW9ucy5sZW5ndGggLSAxXVxuICAgICAgaWYgKGxhc3RBbm5vdGF0aW9uKSB7XG4gICAgICAgIHRoaXMuYW5ub3RhdGlvbiA9IHRoaXMuZ2V0QW5ub3RhdGlvblVSTChsYXN0QW5ub3RhdGlvbilcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBkZWNvZGVJbmxpbmUgKHRleHQpIHtcbiAgICBsZXQgYmFzZUNoYXJzZXRVcmkgPSAvXmRhdGE6YXBwbGljYXRpb25cXC9qc29uO2NoYXJzZXQ9dXRmLT84O2Jhc2U2NCwvXG4gICAgbGV0IGJhc2VVcmkgPSAvXmRhdGE6YXBwbGljYXRpb25cXC9qc29uO2Jhc2U2NCwvXG4gICAgbGV0IHVyaSA9ICdkYXRhOmFwcGxpY2F0aW9uL2pzb24sJ1xuXG4gICAgaWYgKHRoaXMuc3RhcnRXaXRoKHRleHQsIHVyaSkpIHtcbiAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQodGV4dC5zdWJzdHIodXJpLmxlbmd0aCkpXG4gICAgfVxuXG4gICAgaWYgKGJhc2VDaGFyc2V0VXJpLnRlc3QodGV4dCkgfHwgYmFzZVVyaS50ZXN0KHRleHQpKSB7XG4gICAgICByZXR1cm4gZnJvbUJhc2U2NCh0ZXh0LnN1YnN0cihSZWdFeHAubGFzdE1hdGNoLmxlbmd0aCkpXG4gICAgfVxuXG4gICAgbGV0IGVuY29kaW5nID0gdGV4dC5tYXRjaCgvZGF0YTphcHBsaWNhdGlvblxcL2pzb247KFteLF0rKSwvKVsxXVxuICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgc291cmNlIG1hcCBlbmNvZGluZyAnICsgZW5jb2RpbmcpXG4gIH1cblxuICBsb2FkTWFwIChmaWxlLCBwcmV2KSB7XG4gICAgaWYgKHByZXYgPT09IGZhbHNlKSByZXR1cm4gZmFsc2VcblxuICAgIGlmIChwcmV2KSB7XG4gICAgICBpZiAodHlwZW9mIHByZXYgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBwcmV2XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcmV2ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGxldCBwcmV2UGF0aCA9IHByZXYoZmlsZSlcbiAgICAgICAgaWYgKHByZXZQYXRoICYmIGZzLmV4aXN0c1N5bmMgJiYgZnMuZXhpc3RzU3luYyhwcmV2UGF0aCkpIHtcbiAgICAgICAgICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKHByZXZQYXRoLCAndXRmLTgnKS50b1N0cmluZygpLnRyaW0oKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdVbmFibGUgdG8gbG9hZCBwcmV2aW91cyBzb3VyY2UgbWFwOiAnICsgcHJldlBhdGgudG9TdHJpbmcoKSlcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChwcmV2IGluc3RhbmNlb2YgbW96aWxsYS5Tb3VyY2VNYXBDb25zdW1lcikge1xuICAgICAgICByZXR1cm4gbW96aWxsYS5Tb3VyY2VNYXBHZW5lcmF0b3IuZnJvbVNvdXJjZU1hcChwcmV2KS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHByZXYgaW5zdGFuY2VvZiBtb3ppbGxhLlNvdXJjZU1hcEdlbmVyYXRvcikge1xuICAgICAgICByZXR1cm4gcHJldi50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuaXNNYXAocHJldikpIHtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHByZXYpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1Vuc3VwcG9ydGVkIHByZXZpb3VzIHNvdXJjZSBtYXAgZm9ybWF0OiAnICsgcHJldi50b1N0cmluZygpKVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5pbmxpbmUpIHtcbiAgICAgIHJldHVybiB0aGlzLmRlY29kZUlubGluZSh0aGlzLmFubm90YXRpb24pXG4gICAgfSBlbHNlIGlmICh0aGlzLmFubm90YXRpb24pIHtcbiAgICAgIGxldCBtYXAgPSB0aGlzLmFubm90YXRpb25cbiAgICAgIGlmIChmaWxlKSBtYXAgPSBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKGZpbGUpLCBtYXApXG5cbiAgICAgIHRoaXMucm9vdCA9IHBhdGguZGlybmFtZShtYXApXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyAmJiBmcy5leGlzdHNTeW5jKG1hcCkpIHtcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhtYXAsICd1dGYtOCcpLnRvU3RyaW5nKCkudHJpbSgpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpc01hcCAobWFwKSB7XG4gICAgaWYgKHR5cGVvZiBtYXAgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2VcbiAgICByZXR1cm4gdHlwZW9mIG1hcC5tYXBwaW5ncyA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIG1hcC5fbWFwcGluZ3MgPT09ICdzdHJpbmcnXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUHJldmlvdXNNYXBcbiJdLCJmaWxlIjoicHJldmlvdXMtbWFwLmpzIn0=
