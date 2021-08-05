'use strict';

exports.__esModule = true;

var _sourceMap = require('source-map');

var _sourceMap2 = _interopRequireDefault(_sourceMap);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MapGenerator = function () {
    function MapGenerator(stringify, root, opts) {
        _classCallCheck(this, MapGenerator);

        this.stringify = stringify;
        this.mapOpts = opts.map || {};
        this.root = root;
        this.opts = opts;
    }

    MapGenerator.prototype.isMap = function isMap() {
        if (typeof this.opts.map !== 'undefined') {
            return !!this.opts.map;
        } else {
            return this.previous().length > 0;
        }
    };

    MapGenerator.prototype.previous = function previous() {
        var _this = this;

        if (!this.previousMaps) {
            this.previousMaps = [];
            this.root.walk(function (node) {
                if (node.source && node.source.input.map) {
                    var map = node.source.input.map;
                    if (_this.previousMaps.indexOf(map) === -1) {
                        _this.previousMaps.push(map);
                    }
                }
            });
        }

        return this.previousMaps;
    };

    MapGenerator.prototype.isInline = function isInline() {
        if (typeof this.mapOpts.inline !== 'undefined') {
            return this.mapOpts.inline;
        }

        var annotation = this.mapOpts.annotation;
        if (typeof annotation !== 'undefined' && annotation !== true) {
            return false;
        }

        if (this.previous().length) {
            return this.previous().some(function (i) {
                return i.inline;
            });
        } else {
            return true;
        }
    };

    MapGenerator.prototype.isSourcesContent = function isSourcesContent() {
        if (typeof this.mapOpts.sourcesContent !== 'undefined') {
            return this.mapOpts.sourcesContent;
        }
        if (this.previous().length) {
            return this.previous().some(function (i) {
                return i.withContent();
            });
        } else {
            return true;
        }
    };

    MapGenerator.prototype.clearAnnotation = function clearAnnotation() {
        if (this.mapOpts.annotation === false) return;

        var node = void 0;
        for (var i = this.root.nodes.length - 1; i >= 0; i--) {
            node = this.root.nodes[i];
            if (node.type !== 'comment') continue;
            if (node.text.indexOf('# sourceMappingURL=') === 0) {
                this.root.removeChild(i);
            }
        }
    };

    MapGenerator.prototype.setSourcesContent = function setSourcesContent() {
        var _this2 = this;

        var already = {};
        this.root.walk(function (node) {
            if (node.source) {
                var from = node.source.input.from;
                if (from && !already[from]) {
                    already[from] = true;
                    var relative = _this2.relative(from);
                    _this2.map.setSourceContent(relative, node.source.input.css);
                }
            }
        });
    };

    MapGenerator.prototype.applyPrevMaps = function applyPrevMaps() {
        for (var _iterator = this.previous(), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
                if (_i >= _iterator.length) break;
                _ref = _iterator[_i++];
            } else {
                _i = _iterator.next();
                if (_i.done) break;
                _ref = _i.value;
            }

            var prev = _ref;

            var from = this.relative(prev.file);
            var root = prev.root || _path2.default.dirname(prev.file);
            var map = void 0;

            if (this.mapOpts.sourcesContent === false) {
                map = new _sourceMap2.default.SourceMapConsumer(prev.text);
                if (map.sourcesContent) {
                    map.sourcesContent = map.sourcesContent.map(function () {
                        return null;
                    });
                }
            } else {
                map = prev.consumer();
            }

            this.map.applySourceMap(map, from, this.relative(root));
        }
    };

    MapGenerator.prototype.isAnnotation = function isAnnotation() {
        if (this.isInline()) {
            return true;
        } else if (typeof this.mapOpts.annotation !== 'undefined') {
            return this.mapOpts.annotation;
        } else if (this.previous().length) {
            return this.previous().some(function (i) {
                return i.annotation;
            });
        } else {
            return true;
        }
    };

    MapGenerator.prototype.toBase64 = function toBase64(str) {
        if (Buffer) {
            return Buffer.from ? Buffer.from(str).toString('base64') : new Buffer(str).toString('base64');
        } else {
            return window.btoa(unescape(encodeURIComponent(str)));
        }
    };

    MapGenerator.prototype.addAnnotation = function addAnnotation() {
        var content = void 0;

        if (this.isInline()) {

            content = 'data:application/json;base64,' + this.toBase64(this.map.toString());
        } else if (typeof this.mapOpts.annotation === 'string') {
            content = this.mapOpts.annotation;
        } else {
            content = this.outputFile() + '.map';
        }

        var eol = '\n';
        if (this.css.indexOf('\r\n') !== -1) eol = '\r\n';

        this.css += eol + '/*# sourceMappingURL=' + content + ' */';
    };

    MapGenerator.prototype.outputFile = function outputFile() {
        if (this.opts.to) {
            return this.relative(this.opts.to);
        } else if (this.opts.from) {
            return this.relative(this.opts.from);
        } else {
            return 'to.css';
        }
    };

    MapGenerator.prototype.generateMap = function generateMap() {
        this.generateString();
        if (this.isSourcesContent()) this.setSourcesContent();
        if (this.previous().length > 0) this.applyPrevMaps();
        if (this.isAnnotation()) this.addAnnotation();

        if (this.isInline()) {
            return [this.css];
        } else {
            return [this.css, this.map];
        }
    };

    MapGenerator.prototype.relative = function relative(file) {
        if (file.indexOf('<') === 0) return file;
        if (/^\w+:\/\//.test(file)) return file;

        var from = this.opts.to ? _path2.default.dirname(this.opts.to) : '.';

        if (typeof this.mapOpts.annotation === 'string') {
            from = _path2.default.dirname(_path2.default.resolve(from, this.mapOpts.annotation));
        }

        file = _path2.default.relative(from, file);
        if (_path2.default.sep === '\\') {
            return file.replace(/\\/g, '/');
        } else {
            return file;
        }
    };

    MapGenerator.prototype.sourcePath = function sourcePath(node) {
        if (this.mapOpts.from) {
            return this.mapOpts.from;
        } else {
            return this.relative(node.source.input.from);
        }
    };

    MapGenerator.prototype.generateString = function generateString() {
        var _this3 = this;

        this.css = '';
        this.map = new _sourceMap2.default.SourceMapGenerator({ file: this.outputFile() });

        var line = 1;
        var column = 1;

        var lines = void 0,
            last = void 0;
        this.stringify(this.root, function (str, node, type) {
            _this3.css += str;

            if (node && type !== 'end') {
                if (node.source && node.source.start) {
                    _this3.map.addMapping({
                        source: _this3.sourcePath(node),
                        generated: { line: line, column: column - 1 },
                        original: {
                            line: node.source.start.line,
                            column: node.source.start.column - 1
                        }
                    });
                } else {
                    _this3.map.addMapping({
                        source: '<no source>',
                        original: { line: 1, column: 0 },
                        generated: { line: line, column: column - 1 }
                    });
                }
            }

            lines = str.match(/\n/g);
            if (lines) {
                line += lines.length;
                last = str.lastIndexOf('\n');
                column = str.length - last;
            } else {
                column += str.length;
            }

            if (node && type !== 'start') {
                if (node.source && node.source.end) {
                    _this3.map.addMapping({
                        source: _this3.sourcePath(node),
                        generated: { line: line, column: column - 1 },
                        original: {
                            line: node.source.end.line,
                            column: node.source.end.column
                        }
                    });
                } else {
                    _this3.map.addMapping({
                        source: '<no source>',
                        original: { line: 1, column: 0 },
                        generated: { line: line, column: column - 1 }
                    });
                }
            }
        });
    };

    MapGenerator.prototype.generate = function generate() {
        this.clearAnnotation();

        if (this.isMap()) {
            return this.generateMap();
        } else {
            var result = '';
            this.stringify(this.root, function (i) {
                result += i;
            });
            return [result];
        }
    };

    return MapGenerator;
}();

exports.default = MapGenerator;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hcC1nZW5lcmF0b3IuZXM2Il0sIm5hbWVzIjpbIk1hcEdlbmVyYXRvciIsInN0cmluZ2lmeSIsInJvb3QiLCJvcHRzIiwibWFwT3B0cyIsIm1hcCIsImlzTWFwIiwicHJldmlvdXMiLCJsZW5ndGgiLCJwcmV2aW91c01hcHMiLCJ3YWxrIiwibm9kZSIsInNvdXJjZSIsImlucHV0IiwiaW5kZXhPZiIsInB1c2giLCJpc0lubGluZSIsImlubGluZSIsImFubm90YXRpb24iLCJzb21lIiwiaSIsImlzU291cmNlc0NvbnRlbnQiLCJzb3VyY2VzQ29udGVudCIsIndpdGhDb250ZW50IiwiY2xlYXJBbm5vdGF0aW9uIiwibm9kZXMiLCJ0eXBlIiwidGV4dCIsInJlbW92ZUNoaWxkIiwic2V0U291cmNlc0NvbnRlbnQiLCJhbHJlYWR5IiwiZnJvbSIsInJlbGF0aXZlIiwic2V0U291cmNlQ29udGVudCIsImNzcyIsImFwcGx5UHJldk1hcHMiLCJwcmV2IiwiZmlsZSIsImRpcm5hbWUiLCJTb3VyY2VNYXBDb25zdW1lciIsImNvbnN1bWVyIiwiYXBwbHlTb3VyY2VNYXAiLCJpc0Fubm90YXRpb24iLCJ0b0Jhc2U2NCIsInN0ciIsIkJ1ZmZlciIsInRvU3RyaW5nIiwid2luZG93IiwiYnRvYSIsInVuZXNjYXBlIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiYWRkQW5ub3RhdGlvbiIsImNvbnRlbnQiLCJvdXRwdXRGaWxlIiwiZW9sIiwidG8iLCJnZW5lcmF0ZU1hcCIsImdlbmVyYXRlU3RyaW5nIiwidGVzdCIsInJlc29sdmUiLCJzZXAiLCJyZXBsYWNlIiwic291cmNlUGF0aCIsIlNvdXJjZU1hcEdlbmVyYXRvciIsImxpbmUiLCJjb2x1bW4iLCJsaW5lcyIsImxhc3QiLCJzdGFydCIsImFkZE1hcHBpbmciLCJnZW5lcmF0ZWQiLCJvcmlnaW5hbCIsIm1hdGNoIiwibGFzdEluZGV4T2YiLCJlbmQiLCJnZW5lcmF0ZSIsInJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7OztB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LEtBQUtsQixLQUFMLEVBQUwsRUFBb0I7QUFDaEIsbUJBQU8sS0FBS2tELFdBQUwsRUFBUDtBQUNILFNBRkQsTUFFTztBQUNILGdCQUFJb0IsU0FBUyxFQUFiO0FBQ0EsaUJBQUszRSxTQUFMLENBQWUsS0FBS0MsSUFBcEIsRUFBMEIsYUFBSztBQUMzQjBFLDBCQUFVeEQsQ0FBVjtBQUNILGFBRkQ7QUFHQSxtQkFBTyxDQUFDd0QsTUFBRCxDQUFQO0FBQ0g7QUFDSixLOzs7OztrQkEvUWdCNUUsWSIsImZpbGUiOiJtYXAtZ2VuZXJhdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG1vemlsbGEgZnJvbSAnc291cmNlLW1hcCc7XG5pbXBvcnQgcGF0aCAgICBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWFwR2VuZXJhdG9yIHtcblxuICAgIGNvbnN0cnVjdG9yKHN0cmluZ2lmeSwgcm9vdCwgb3B0cykge1xuICAgICAgICB0aGlzLnN0cmluZ2lmeSA9IHN0cmluZ2lmeTtcbiAgICAgICAgdGhpcy5tYXBPcHRzICAgPSBvcHRzLm1hcCB8fCB7IH07XG4gICAgICAgIHRoaXMucm9vdCAgICAgID0gcm9vdDtcbiAgICAgICAgdGhpcy5vcHRzICAgICAgPSBvcHRzO1xuICAgIH1cblxuICAgIGlzTWFwKCkge1xuICAgICAgICBpZiAoIHR5cGVvZiB0aGlzLm9wdHMubWFwICE9PSAndW5kZWZpbmVkJyApIHtcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMub3B0cy5tYXA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcmV2aW91cygpLmxlbmd0aCA+IDA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcmV2aW91cygpIHtcbiAgICAgICAgaWYgKCAhdGhpcy5wcmV2aW91c01hcHMgKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzTWFwcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5yb290LndhbGsoIG5vZGUgPT4ge1xuICAgICAgICAgICAgICAgIGlmICggbm9kZS5zb3VyY2UgJiYgbm9kZS5zb3VyY2UuaW5wdXQubWFwICkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbWFwID0gbm9kZS5zb3VyY2UuaW5wdXQubWFwO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIHRoaXMucHJldmlvdXNNYXBzLmluZGV4T2YobWFwKSA9PT0gLTEgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByZXZpb3VzTWFwcy5wdXNoKG1hcCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLnByZXZpb3VzTWFwcztcbiAgICB9XG5cbiAgICBpc0lubGluZSgpIHtcbiAgICAgICAgaWYgKCB0eXBlb2YgdGhpcy5tYXBPcHRzLmlubGluZSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tYXBPcHRzLmlubGluZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhbm5vdGF0aW9uID0gdGhpcy5tYXBPcHRzLmFubm90YXRpb247XG4gICAgICAgIGlmICggdHlwZW9mIGFubm90YXRpb24gIT09ICd1bmRlZmluZWQnICYmIGFubm90YXRpb24gIT09IHRydWUgKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIHRoaXMucHJldmlvdXMoKS5sZW5ndGggKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcmV2aW91cygpLnNvbWUoIGkgPT4gaS5pbmxpbmUgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaXNTb3VyY2VzQ29udGVudCgpIHtcbiAgICAgICAgaWYgKCB0eXBlb2YgdGhpcy5tYXBPcHRzLnNvdXJjZXNDb250ZW50ICE9PSAndW5kZWZpbmVkJyApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1hcE9wdHMuc291cmNlc0NvbnRlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCB0aGlzLnByZXZpb3VzKCkubGVuZ3RoICkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJldmlvdXMoKS5zb21lKCBpID0+IGkud2l0aENvbnRlbnQoKSApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjbGVhckFubm90YXRpb24oKSB7XG4gICAgICAgIGlmICggdGhpcy5tYXBPcHRzLmFubm90YXRpb24gPT09IGZhbHNlICkgcmV0dXJuO1xuXG4gICAgICAgIGxldCBub2RlO1xuICAgICAgICBmb3IgKCBsZXQgaSA9IHRoaXMucm9vdC5ub2Rlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSApIHtcbiAgICAgICAgICAgIG5vZGUgPSB0aGlzLnJvb3Qubm9kZXNbaV07XG4gICAgICAgICAgICBpZiAoIG5vZGUudHlwZSAhPT0gJ2NvbW1lbnQnICkgY29udGludWU7XG4gICAgICAgICAgICBpZiAoIG5vZGUudGV4dC5pbmRleE9mKCcjIHNvdXJjZU1hcHBpbmdVUkw9JykgPT09IDAgKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb290LnJlbW92ZUNoaWxkKGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0U291cmNlc0NvbnRlbnQoKSB7XG4gICAgICAgIGxldCBhbHJlYWR5ID0geyB9O1xuICAgICAgICB0aGlzLnJvb3Qud2Fsayggbm9kZSA9PiB7XG4gICAgICAgICAgICBpZiAoIG5vZGUuc291cmNlICkge1xuICAgICAgICAgICAgICAgIGxldCBmcm9tID0gbm9kZS5zb3VyY2UuaW5wdXQuZnJvbTtcbiAgICAgICAgICAgICAgICBpZiAoIGZyb20gJiYgIWFscmVhZHlbZnJvbV0gKSB7XG4gICAgICAgICAgICAgICAgICAgIGFscmVhZHlbZnJvbV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBsZXQgcmVsYXRpdmUgPSB0aGlzLnJlbGF0aXZlKGZyb20pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1hcC5zZXRTb3VyY2VDb250ZW50KHJlbGF0aXZlLCBub2RlLnNvdXJjZS5pbnB1dC5jc3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXBwbHlQcmV2TWFwcygpIHtcbiAgICAgICAgZm9yICggbGV0IHByZXYgb2YgdGhpcy5wcmV2aW91cygpICkge1xuICAgICAgICAgICAgbGV0IGZyb20gPSB0aGlzLnJlbGF0aXZlKHByZXYuZmlsZSk7XG4gICAgICAgICAgICBsZXQgcm9vdCA9IHByZXYucm9vdCB8fCBwYXRoLmRpcm5hbWUocHJldi5maWxlKTtcbiAgICAgICAgICAgIGxldCBtYXA7XG5cbiAgICAgICAgICAgIGlmICggdGhpcy5tYXBPcHRzLnNvdXJjZXNDb250ZW50ID09PSBmYWxzZSApIHtcbiAgICAgICAgICAgICAgICBtYXAgPSBuZXcgbW96aWxsYS5Tb3VyY2VNYXBDb25zdW1lcihwcmV2LnRleHQpO1xuICAgICAgICAgICAgICAgIGlmICggbWFwLnNvdXJjZXNDb250ZW50ICkge1xuICAgICAgICAgICAgICAgICAgICBtYXAuc291cmNlc0NvbnRlbnQgPSBtYXAuc291cmNlc0NvbnRlbnQubWFwKCAoKSA9PiBudWxsICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXAgPSBwcmV2LmNvbnN1bWVyKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMubWFwLmFwcGx5U291cmNlTWFwKG1hcCwgZnJvbSwgdGhpcy5yZWxhdGl2ZShyb290KSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpc0Fubm90YXRpb24oKSB7XG4gICAgICAgIGlmICggdGhpcy5pc0lubGluZSgpICkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoIHR5cGVvZiB0aGlzLm1hcE9wdHMuYW5ub3RhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tYXBPcHRzLmFubm90YXRpb247XG4gICAgICAgIH0gZWxzZSBpZiAoIHRoaXMucHJldmlvdXMoKS5sZW5ndGggKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcmV2aW91cygpLnNvbWUoIGkgPT4gaS5hbm5vdGF0aW9uICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRvQmFzZTY0KHN0cikge1xuICAgICAgICBpZiAoIEJ1ZmZlciApIHtcbiAgICAgICAgICAgIHJldHVybiBCdWZmZXIuZnJvbSA/XG4gICAgICAgICAgICAgICAgQnVmZmVyLmZyb20oc3RyKS50b1N0cmluZygnYmFzZTY0JykgOlxuICAgICAgICAgICAgICAgIG5ldyBCdWZmZXIoc3RyKS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gd2luZG93LmJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHN0cikpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFkZEFubm90YXRpb24oKSB7XG4gICAgICAgIGxldCBjb250ZW50O1xuXG4gICAgICAgIGlmICggdGhpcy5pc0lubGluZSgpICkge1xuXG4gICAgICAgICAgICBjb250ZW50ID0gJ2RhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsJyArXG4gICAgICAgICAgICAgICAgdGhpcy50b0Jhc2U2NCh0aGlzLm1hcC50b1N0cmluZygpKTtcblxuICAgICAgICB9IGVsc2UgaWYgKCB0eXBlb2YgdGhpcy5tYXBPcHRzLmFubm90YXRpb24gPT09ICdzdHJpbmcnICkge1xuICAgICAgICAgICAgY29udGVudCA9IHRoaXMubWFwT3B0cy5hbm5vdGF0aW9uO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb250ZW50ID0gdGhpcy5vdXRwdXRGaWxlKCkgKyAnLm1hcCc7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZW9sICAgPSAnXFxuJztcbiAgICAgICAgaWYgKCB0aGlzLmNzcy5pbmRleE9mKCdcXHJcXG4nKSAhPT0gLTEgKSBlb2wgPSAnXFxyXFxuJztcblxuICAgICAgICB0aGlzLmNzcyArPSBlb2wgKyAnLyojIHNvdXJjZU1hcHBpbmdVUkw9JyArIGNvbnRlbnQgKyAnICovJztcbiAgICB9XG5cbiAgICBvdXRwdXRGaWxlKCkge1xuICAgICAgICBpZiAoIHRoaXMub3B0cy50byApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbGF0aXZlKHRoaXMub3B0cy50byk7XG4gICAgICAgIH0gZWxzZSBpZiAoIHRoaXMub3B0cy5mcm9tICkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVsYXRpdmUodGhpcy5vcHRzLmZyb20pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICd0by5jc3MnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVNYXAoKSB7XG4gICAgICAgIHRoaXMuZ2VuZXJhdGVTdHJpbmcoKTtcbiAgICAgICAgaWYgKCB0aGlzLmlzU291cmNlc0NvbnRlbnQoKSApICAgIHRoaXMuc2V0U291cmNlc0NvbnRlbnQoKTtcbiAgICAgICAgaWYgKCB0aGlzLnByZXZpb3VzKCkubGVuZ3RoID4gMCApIHRoaXMuYXBwbHlQcmV2TWFwcygpO1xuICAgICAgICBpZiAoIHRoaXMuaXNBbm5vdGF0aW9uKCkgKSAgICAgICAgdGhpcy5hZGRBbm5vdGF0aW9uKCk7XG5cbiAgICAgICAgaWYgKCB0aGlzLmlzSW5saW5lKCkgKSB7XG4gICAgICAgICAgICByZXR1cm4gW3RoaXMuY3NzXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbdGhpcy5jc3MsIHRoaXMubWFwXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbGF0aXZlKGZpbGUpIHtcbiAgICAgICAgaWYgKCBmaWxlLmluZGV4T2YoJzwnKSA9PT0gMCApIHJldHVybiBmaWxlO1xuICAgICAgICBpZiAoIC9eXFx3KzpcXC9cXC8vLnRlc3QoZmlsZSkgKSByZXR1cm4gZmlsZTtcblxuICAgICAgICBsZXQgZnJvbSA9IHRoaXMub3B0cy50byA/IHBhdGguZGlybmFtZSh0aGlzLm9wdHMudG8pIDogJy4nO1xuXG4gICAgICAgIGlmICggdHlwZW9mIHRoaXMubWFwT3B0cy5hbm5vdGF0aW9uID09PSAnc3RyaW5nJyApIHtcbiAgICAgICAgICAgIGZyb20gPSBwYXRoLmRpcm5hbWUoIHBhdGgucmVzb2x2ZShmcm9tLCB0aGlzLm1hcE9wdHMuYW5ub3RhdGlvbikgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZpbGUgPSBwYXRoLnJlbGF0aXZlKGZyb20sIGZpbGUpO1xuICAgICAgICBpZiAoIHBhdGguc2VwID09PSAnXFxcXCcgKSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNvdXJjZVBhdGgobm9kZSkge1xuICAgICAgICBpZiAoIHRoaXMubWFwT3B0cy5mcm9tICkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubWFwT3B0cy5mcm9tO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVsYXRpdmUobm9kZS5zb3VyY2UuaW5wdXQuZnJvbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZW5lcmF0ZVN0cmluZygpIHtcbiAgICAgICAgdGhpcy5jc3MgPSAnJztcbiAgICAgICAgdGhpcy5tYXAgPSBuZXcgbW96aWxsYS5Tb3VyY2VNYXBHZW5lcmF0b3IoeyBmaWxlOiB0aGlzLm91dHB1dEZpbGUoKSB9KTtcblxuICAgICAgICBsZXQgbGluZSAgID0gMTtcbiAgICAgICAgbGV0IGNvbHVtbiA9IDE7XG5cbiAgICAgICAgbGV0IGxpbmVzLCBsYXN0O1xuICAgICAgICB0aGlzLnN0cmluZ2lmeSh0aGlzLnJvb3QsIChzdHIsIG5vZGUsIHR5cGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY3NzICs9IHN0cjtcblxuICAgICAgICAgICAgaWYgKCBub2RlICYmIHR5cGUgIT09ICdlbmQnICkge1xuICAgICAgICAgICAgICAgIGlmICggbm9kZS5zb3VyY2UgJiYgbm9kZS5zb3VyY2Uuc3RhcnQgKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFwLmFkZE1hcHBpbmcoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiAgICB0aGlzLnNvdXJjZVBhdGgobm9kZSksXG4gICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZWQ6IHsgbGluZSwgY29sdW1uOiBjb2x1bW4gLSAxIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbDogIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiAgIG5vZGUuc291cmNlLnN0YXJ0LmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBub2RlLnNvdXJjZS5zdGFydC5jb2x1bW4gLSAxXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFwLmFkZE1hcHBpbmcoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiAgICAnPG5vIHNvdXJjZT4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWw6ICB7IGxpbmU6IDEsIGNvbHVtbjogMCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVkOiB7IGxpbmUsIGNvbHVtbjogY29sdW1uIC0gMSB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGluZXMgPSBzdHIubWF0Y2goL1xcbi9nKTtcbiAgICAgICAgICAgIGlmICggbGluZXMgKSB7XG4gICAgICAgICAgICAgICAgbGluZSAgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGxhc3QgICA9IHN0ci5sYXN0SW5kZXhPZignXFxuJyk7XG4gICAgICAgICAgICAgICAgY29sdW1uID0gc3RyLmxlbmd0aCAtIGxhc3Q7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbHVtbiArPSBzdHIubGVuZ3RoO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIG5vZGUgJiYgdHlwZSAhPT0gJ3N0YXJ0JyApIHtcbiAgICAgICAgICAgICAgICBpZiAoIG5vZGUuc291cmNlICYmIG5vZGUuc291cmNlLmVuZCApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXAuYWRkTWFwcGluZyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6ICAgIHRoaXMuc291cmNlUGF0aChub2RlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlZDogeyBsaW5lLCBjb2x1bW46IGNvbHVtbiAtIDEgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsOiAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6ICAgbm9kZS5zb3VyY2UuZW5kLmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBub2RlLnNvdXJjZS5lbmQuY29sdW1uXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFwLmFkZE1hcHBpbmcoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiAgICAnPG5vIHNvdXJjZT4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWw6ICB7IGxpbmU6IDEsIGNvbHVtbjogMCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVkOiB7IGxpbmUsIGNvbHVtbjogY29sdW1uIC0gMSB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2VuZXJhdGUoKSB7XG4gICAgICAgIHRoaXMuY2xlYXJBbm5vdGF0aW9uKCk7XG5cbiAgICAgICAgaWYgKCB0aGlzLmlzTWFwKCkgKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZW5lcmF0ZU1hcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHJlc3VsdCA9ICcnO1xuICAgICAgICAgICAgdGhpcy5zdHJpbmdpZnkodGhpcy5yb290LCBpID0+IHtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIFtyZXN1bHRdO1xuICAgICAgICB9XG4gICAgfVxuXG59XG4iXX0=
