'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _cssSyntaxError = require('./css-syntax-error');

var _cssSyntaxError2 = _interopRequireDefault(_cssSyntaxError);

var _previousMap = require('./previous-map');

var _previousMap2 = _interopRequireDefault(_previousMap);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var sequence = 0;

/**
 * Represents the source CSS.
 *
 * @example
 * const root  = postcss.parse(css, { from: file });
 * const input = root.source.input;
 */

var Input = function () {

    /**
     * @param {string} css    - input CSS source
     * @param {object} [opts] - {@link Processor#process} options
     */
    function Input(css) {
        var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, Input);

        /**
         * @member {string} - input CSS source
         *
         * @example
         * const input = postcss.parse('a{}', { from: file }).input;
         * input.css //=> "a{}";
         */
        this.css = css.toString();

        if (this.css[0] === '\uFEFF' || this.css[0] === '\uFFFE') {
            this.css = this.css.slice(1);
        }

        if (opts.from) {
            if (/^\w+:\/\//.test(opts.from)) {
                /**
                 * @member {string} - The absolute path to the CSS source file
                 *                    defined with the `from` option.
                 *
                 * @example
                 * const root = postcss.parse(css, { from: 'a.css' });
                 * root.source.input.file //=> '/home/ai/a.css'
                 */
                this.file = opts.from;
            } else {
                this.file = _path2.default.resolve(opts.from);
            }
        }

        var map = new _previousMap2.default(this.css, opts);
        if (map.text) {
            /**
             * @member {PreviousMap} - The input source map passed from
             *                         a compilation step before PostCSS
             *                         (for example, from Sass compiler).
             *
             * @example
             * root.source.input.map.consumer().sources //=> ['a.sass']
             */
            this.map = map;
            var file = map.consumer().file;
            if (!this.file && file) this.file = this.mapResolve(file);
        }

        if (!this.file) {
            sequence += 1;
            /**
             * @member {string} - The unique ID of the CSS source. It will be
             *                    created if `from` option is not provided
             *                    (because PostCSS does not know the file path).
             *
             * @example
             * const root = postcss.parse(css);
             * root.source.input.file //=> undefined
             * root.source.input.id   //=> "<input css 1>"
             */
            this.id = '<input css ' + sequence + '>';
        }
        if (this.map) this.map.file = this.from;
    }

    Input.prototype.error = function error(message, line, column) {
        var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

        var result = void 0;
        var origin = this.origin(line, column);
        if (origin) {
            result = new _cssSyntaxError2.default(message, origin.line, origin.column, origin.source, origin.file, opts.plugin);
        } else {
            result = new _cssSyntaxError2.default(message, line, column, this.css, this.file, opts.plugin);
        }

        result.input = { line: line, column: column, source: this.css };
        if (this.file) result.input.file = this.file;

        return result;
    };

    /**
     * Reads the input source map and returns a symbol position
     * in the input source (e.g., in a Sass file that was compiled
     * to CSS before being passed to PostCSS).
     *
     * @param {number} line   - line in input CSS
     * @param {number} column - column in input CSS
     *
     * @return {filePosition} position in input source
     *
     * @example
     * root.source.input.origin(1, 1) //=> { file: 'a.css', line: 3, column: 1 }
     */


    Input.prototype.origin = function origin(line, column) {
        if (!this.map) return false;
        var consumer = this.map.consumer();

        var from = consumer.originalPositionFor({ line: line, column: column });
        if (!from.source) return false;

        var result = {
            file: this.mapResolve(from.source),
            line: from.line,
            column: from.column
        };

        var source = consumer.sourceContentFor(from.source);
        if (source) result.source = source;

        return result;
    };

    Input.prototype.mapResolve = function mapResolve(file) {
        if (/^\w+:\/\//.test(file)) {
            return file;
        } else {
            return _path2.default.resolve(this.map.consumer().sourceRoot || '.', file);
        }
    };

    /**
     * The CSS source identifier. Contains {@link Input#file} if the user
     * set the `from` option, or {@link Input#id} if they did not.
     * @type {string}
     *
     * @example
     * const root = postcss.parse(css, { from: 'a.css' });
     * root.source.input.from //=> "/home/ai/a.css"
     *
     * const root = postcss.parse(css);
     * root.source.input.from //=> "<input css 1>"
     */


    _createClass(Input, [{
        key: 'from',
        get: function get() {
            return this.file || this.id;
        }
    }]);

    return Input;
}();

exports.default = Input;

/**
 * @typedef  {object} filePosition
 * @property {string} file   - path to file
 * @property {number} line   - source line in file
 * @property {number} column - source column in file
 */

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlucHV0LmVzNiJdLCJuYW1lcyI6WyJzZXF1ZW5jZSIsIklucHV0IiwiY3NzIiwib3B0cyIsInRvU3RyaW5nIiwic2xpY2UiLCJmcm9tIiwidGVzdCIsImZpbGUiLCJyZXNvbHZlIiwibWFwIiwidGV4dCIsImNvbnN1bWVyIiwibWFwUmVzb2x2ZSIsImlkIiwiZXJyb3IiLCJtZXNzYWdlIiwibGluZSIsImNvbHVtbiIsInJlc3VsdCIsIm9yaWdpbiIsInNvdXJjZSIsInBsdWdpbiIsImlucHV0Iiwib3JpZ2luYWxQb3NpdGlvbkZvciIsInNvdXJjZUNvbnRlbnRGb3IiLCJzb3VyY2VSb290Il0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBRUE7Ozs7Ozs7O0FBRUEsSUFBSUEsV0FBVyxDQUFmOztBQUVBOzs7Ozs7OztJQU9NQyxLOztBQUVGOzs7O0FBSUEsbUJBQVlDLEdBQVosRUFBNkI7QUFBQSxZQUFaQyxJQUFZLHVFQUFMLEVBQUs7O0FBQUE7O0FBQ3pCOzs7Ozs7O0FBT0EsYUFBS0QsR0FBTCxHQUFXQSxJQUFJRSxRQUFKLEVBQVg7O0FBRUEsWUFBSyxLQUFLRixHQUFMLENBQVMsQ0FBVCxNQUFnQixRQUFoQixJQUE0QixLQUFLQSxHQUFMLENBQVMsQ0FBVCxNQUFnQixRQUFqRCxFQUE0RDtBQUN4RCxpQkFBS0EsR0FBTCxHQUFXLEtBQUtBLEdBQUwsQ0FBU0csS0FBVCxDQUFlLENBQWYsQ0FBWDtBQUNIOztBQUVELFlBQUtGLEtBQUtHLElBQVYsRUFBaUI7QUFDYixnQkFBSyxZQUFZQyxJQUFaLENBQWlCSixLQUFLRyxJQUF0QixDQUFMLEVBQW1DO0FBQy9COzs7Ozs7OztBQVFBLHFCQUFLRSxJQUFMLEdBQVlMLEtBQUtHLElBQWpCO0FBQ0gsYUFWRCxNQVVPO0FBQ0gscUJBQUtFLElBQUwsR0FBWSxlQUFLQyxPQUFMLENBQWFOLEtBQUtHLElBQWxCLENBQVo7QUFDSDtBQUNKOztBQUVELFlBQUlJLE1BQU0sMEJBQWdCLEtBQUtS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aWxlIjoiaW5wdXQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ3NzU3ludGF4RXJyb3IgZnJvbSAnLi9jc3Mtc3ludGF4LWVycm9yJztcbmltcG9ydCBQcmV2aW91c01hcCAgICBmcm9tICcuL3ByZXZpb3VzLW1hcCc7XG5cbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5sZXQgc2VxdWVuY2UgPSAwO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHNvdXJjZSBDU1MuXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHJvb3QgID0gcG9zdGNzcy5wYXJzZShjc3MsIHsgZnJvbTogZmlsZSB9KTtcbiAqIGNvbnN0IGlucHV0ID0gcm9vdC5zb3VyY2UuaW5wdXQ7XG4gKi9cbmNsYXNzIElucHV0IHtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3MgICAgLSBpbnB1dCBDU1Mgc291cmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRzXSAtIHtAbGluayBQcm9jZXNzb3IjcHJvY2Vzc30gb3B0aW9uc1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNzcywgb3B0cyA9IHsgfSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQG1lbWJlciB7c3RyaW5nfSAtIGlucHV0IENTUyBzb3VyY2VcbiAgICAgICAgICpcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogY29uc3QgaW5wdXQgPSBwb3N0Y3NzLnBhcnNlKCdhe30nLCB7IGZyb206IGZpbGUgfSkuaW5wdXQ7XG4gICAgICAgICAqIGlucHV0LmNzcyAvLz0+IFwiYXt9XCI7XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNzcyA9IGNzcy50b1N0cmluZygpO1xuXG4gICAgICAgIGlmICggdGhpcy5jc3NbMF0gPT09ICdcXHVGRUZGJyB8fCB0aGlzLmNzc1swXSA9PT0gJ1xcdUZGRkUnICkge1xuICAgICAgICAgICAgdGhpcy5jc3MgPSB0aGlzLmNzcy5zbGljZSgxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggb3B0cy5mcm9tICkge1xuICAgICAgICAgICAgaWYgKCAvXlxcdys6XFwvXFwvLy50ZXN0KG9wdHMuZnJvbSkgKSB7XG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQG1lbWJlciB7c3RyaW5nfSAtIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBDU1Mgc291cmNlIGZpbGVcbiAgICAgICAgICAgICAgICAgKiAgICAgICAgICAgICAgICAgICAgZGVmaW5lZCB3aXRoIHRoZSBgZnJvbWAgb3B0aW9uLlxuICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICAgICAgICAgKiBjb25zdCByb290ID0gcG9zdGNzcy5wYXJzZShjc3MsIHsgZnJvbTogJ2EuY3NzJyB9KTtcbiAgICAgICAgICAgICAgICAgKiByb290LnNvdXJjZS5pbnB1dC5maWxlIC8vPT4gJy9ob21lL2FpL2EuY3NzJ1xuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHRoaXMuZmlsZSA9IG9wdHMuZnJvbTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maWxlID0gcGF0aC5yZXNvbHZlKG9wdHMuZnJvbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbWFwID0gbmV3IFByZXZpb3VzTWFwKHRoaXMuY3NzLCBvcHRzKTtcbiAgICAgICAgaWYgKCBtYXAudGV4dCApIHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQG1lbWJlciB7UHJldmlvdXNNYXB9IC0gVGhlIGlucHV0IHNvdXJjZSBtYXAgcGFzc2VkIGZyb21cbiAgICAgICAgICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgIGEgY29tcGlsYXRpb24gc3RlcCBiZWZvcmUgUG9zdENTU1xuICAgICAgICAgICAgICogICAgICAgICAgICAgICAgICAgICAgICAgKGZvciBleGFtcGxlLCBmcm9tIFNhc3MgY29tcGlsZXIpLlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAgICAgKiByb290LnNvdXJjZS5pbnB1dC5tYXAuY29uc3VtZXIoKS5zb3VyY2VzIC8vPT4gWydhLnNhc3MnXVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLm1hcCA9IG1hcDtcbiAgICAgICAgICAgIGxldCBmaWxlID0gbWFwLmNvbnN1bWVyKCkuZmlsZTtcbiAgICAgICAgICAgIGlmICggIXRoaXMuZmlsZSAmJiBmaWxlICkgdGhpcy5maWxlID0gdGhpcy5tYXBSZXNvbHZlKGZpbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCAhdGhpcy5maWxlICkge1xuICAgICAgICAgICAgc2VxdWVuY2UgKz0gMTtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQG1lbWJlciB7c3RyaW5nfSAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIENTUyBzb3VyY2UuIEl0IHdpbGwgYmVcbiAgICAgICAgICAgICAqICAgICAgICAgICAgICAgICAgICBjcmVhdGVkIGlmIGBmcm9tYCBvcHRpb24gaXMgbm90IHByb3ZpZGVkXG4gICAgICAgICAgICAgKiAgICAgICAgICAgICAgICAgICAgKGJlY2F1c2UgUG9zdENTUyBkb2VzIG5vdCBrbm93IHRoZSBmaWxlIHBhdGgpLlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAgICAgKiBjb25zdCByb290ID0gcG9zdGNzcy5wYXJzZShjc3MpO1xuICAgICAgICAgICAgICogcm9vdC5zb3VyY2UuaW5wdXQuZmlsZSAvLz0+IHVuZGVmaW5lZFxuICAgICAgICAgICAgICogcm9vdC5zb3VyY2UuaW5wdXQuaWQgICAvLz0+IFwiPGlucHV0IGNzcyAxPlwiXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuaWQgICA9ICc8aW5wdXQgY3NzICcgKyBzZXF1ZW5jZSArICc+JztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIHRoaXMubWFwICkgdGhpcy5tYXAuZmlsZSA9IHRoaXMuZnJvbTtcbiAgICB9XG5cbiAgICBlcnJvcihtZXNzYWdlLCBsaW5lLCBjb2x1bW4sIG9wdHMgPSB7IH0pIHtcbiAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgbGV0IG9yaWdpbiA9IHRoaXMub3JpZ2luKGxpbmUsIGNvbHVtbik7XG4gICAgICAgIGlmICggb3JpZ2luICkge1xuICAgICAgICAgICAgcmVzdWx0ID0gbmV3IENzc1N5bnRheEVycm9yKG1lc3NhZ2UsIG9yaWdpbi5saW5lLCBvcmlnaW4uY29sdW1uLFxuICAgICAgICAgICAgICAgIG9yaWdpbi5zb3VyY2UsIG9yaWdpbi5maWxlLCBvcHRzLnBsdWdpbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgPSBuZXcgQ3NzU3ludGF4RXJyb3IobWVzc2FnZSwgbGluZSwgY29sdW1uLFxuICAgICAgICAgICAgICAgIHRoaXMuY3NzLCB0aGlzLmZpbGUsIG9wdHMucGx1Z2luKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3VsdC5pbnB1dCA9IHsgbGluZSwgY29sdW1uLCBzb3VyY2U6IHRoaXMuY3NzIH07XG4gICAgICAgIGlmICggdGhpcy5maWxlICkgcmVzdWx0LmlucHV0LmZpbGUgPSB0aGlzLmZpbGU7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWFkcyB0aGUgaW5wdXQgc291cmNlIG1hcCBhbmQgcmV0dXJucyBhIHN5bWJvbCBwb3NpdGlvblxuICAgICAqIGluIHRoZSBpbnB1dCBzb3VyY2UgKGUuZy4sIGluIGEgU2FzcyBmaWxlIHRoYXQgd2FzIGNvbXBpbGVkXG4gICAgICogdG8gQ1NTIGJlZm9yZSBiZWluZyBwYXNzZWQgdG8gUG9zdENTUykuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbGluZSAgIC0gbGluZSBpbiBpbnB1dCBDU1NcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gY29sdW1uIC0gY29sdW1uIGluIGlucHV0IENTU1xuICAgICAqXG4gICAgICogQHJldHVybiB7ZmlsZVBvc2l0aW9ufSBwb3NpdGlvbiBpbiBpbnB1dCBzb3VyY2VcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcm9vdC5zb3VyY2UuaW5wdXQub3JpZ2luKDEsIDEpIC8vPT4geyBmaWxlOiAnYS5jc3MnLCBsaW5lOiAzLCBjb2x1bW46IDEgfVxuICAgICAqL1xuICAgIG9yaWdpbihsaW5lLCBjb2x1bW4pIHtcbiAgICAgICAgaWYgKCAhdGhpcy5tYXAgKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGxldCBjb25zdW1lciA9IHRoaXMubWFwLmNvbnN1bWVyKCk7XG5cbiAgICAgICAgbGV0IGZyb20gPSBjb25zdW1lci5vcmlnaW5hbFBvc2l0aW9uRm9yKHsgbGluZSwgY29sdW1uIH0pO1xuICAgICAgICBpZiAoICFmcm9tLnNvdXJjZSApIHJldHVybiBmYWxzZTtcblxuICAgICAgICBsZXQgcmVzdWx0ID0ge1xuICAgICAgICAgICAgZmlsZTogICB0aGlzLm1hcFJlc29sdmUoZnJvbS5zb3VyY2UpLFxuICAgICAgICAgICAgbGluZTogICBmcm9tLmxpbmUsXG4gICAgICAgICAgICBjb2x1bW46IGZyb20uY29sdW1uXG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IHNvdXJjZSA9IGNvbnN1bWVyLnNvdXJjZUNvbnRlbnRGb3IoZnJvbS5zb3VyY2UpO1xuICAgICAgICBpZiAoIHNvdXJjZSApIHJlc3VsdC5zb3VyY2UgPSBzb3VyY2U7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBtYXBSZXNvbHZlKGZpbGUpIHtcbiAgICAgICAgaWYgKCAvXlxcdys6XFwvXFwvLy50ZXN0KGZpbGUpICkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aC5yZXNvbHZlKHRoaXMubWFwLmNvbnN1bWVyKCkuc291cmNlUm9vdCB8fCAnLicsIGZpbGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIENTUyBzb3VyY2UgaWRlbnRpZmllci4gQ29udGFpbnMge0BsaW5rIElucHV0I2ZpbGV9IGlmIHRoZSB1c2VyXG4gICAgICogc2V0IHRoZSBgZnJvbWAgb3B0aW9uLCBvciB7QGxpbmsgSW5wdXQjaWR9IGlmIHRoZXkgZGlkIG5vdC5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCByb290ID0gcG9zdGNzcy5wYXJzZShjc3MsIHsgZnJvbTogJ2EuY3NzJyB9KTtcbiAgICAgKiByb290LnNvdXJjZS5pbnB1dC5mcm9tIC8vPT4gXCIvaG9tZS9haS9hLmNzc1wiXG4gICAgICpcbiAgICAgKiBjb25zdCByb290ID0gcG9zdGNzcy5wYXJzZShjc3MpO1xuICAgICAqIHJvb3Quc291cmNlLmlucHV0LmZyb20gLy89PiBcIjxpbnB1dCBjc3MgMT5cIlxuICAgICAqL1xuICAgIGdldCBmcm9tKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maWxlIHx8IHRoaXMuaWQ7XG4gICAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IElucHV0O1xuXG4vKipcbiAqIEB0eXBlZGVmICB7b2JqZWN0fSBmaWxlUG9zaXRpb25cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBmaWxlICAgLSBwYXRoIHRvIGZpbGVcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBsaW5lICAgLSBzb3VyY2UgbGluZSBpbiBmaWxlXG4gKiBAcHJvcGVydHkge251bWJlcn0gY29sdW1uIC0gc291cmNlIGNvbHVtbiBpbiBmaWxlXG4gKi9cbiJdfQ==
