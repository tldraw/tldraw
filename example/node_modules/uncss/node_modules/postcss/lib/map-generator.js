"use strict";

exports.__esModule = true;
exports.default = void 0;

var _sourceMap = _interopRequireDefault(require("source-map"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } it = o[Symbol.iterator](); return it.next.bind(it); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var MapGenerator = /*#__PURE__*/function () {
  function MapGenerator(stringify, root, opts) {
    this.stringify = stringify;
    this.mapOpts = opts.map || {};
    this.root = root;
    this.opts = opts;
  }

  var _proto = MapGenerator.prototype;

  _proto.isMap = function isMap() {
    if (typeof this.opts.map !== 'undefined') {
      return !!this.opts.map;
    }

    return this.previous().length > 0;
  };

  _proto.previous = function previous() {
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

  _proto.isInline = function isInline() {
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
    }

    return true;
  };

  _proto.isSourcesContent = function isSourcesContent() {
    if (typeof this.mapOpts.sourcesContent !== 'undefined') {
      return this.mapOpts.sourcesContent;
    }

    if (this.previous().length) {
      return this.previous().some(function (i) {
        return i.withContent();
      });
    }

    return true;
  };

  _proto.clearAnnotation = function clearAnnotation() {
    if (this.mapOpts.annotation === false) return;
    var node;

    for (var i = this.root.nodes.length - 1; i >= 0; i--) {
      node = this.root.nodes[i];
      if (node.type !== 'comment') continue;

      if (node.text.indexOf('# sourceMappingURL=') === 0) {
        this.root.removeChild(i);
      }
    }
  };

  _proto.setSourcesContent = function setSourcesContent() {
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

  _proto.applyPrevMaps = function applyPrevMaps() {
    for (var _iterator = _createForOfIteratorHelperLoose(this.previous()), _step; !(_step = _iterator()).done;) {
      var prev = _step.value;
      var from = this.relative(prev.file);

      var root = prev.root || _path.default.dirname(prev.file);

      var map = void 0;

      if (this.mapOpts.sourcesContent === false) {
        map = new _sourceMap.default.SourceMapConsumer(prev.text);

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

  _proto.isAnnotation = function isAnnotation() {
    if (this.isInline()) {
      return true;
    }

    if (typeof this.mapOpts.annotation !== 'undefined') {
      return this.mapOpts.annotation;
    }

    if (this.previous().length) {
      return this.previous().some(function (i) {
        return i.annotation;
      });
    }

    return true;
  };

  _proto.toBase64 = function toBase64(str) {
    if (Buffer) {
      return Buffer.from(str).toString('base64');
    }

    return window.btoa(unescape(encodeURIComponent(str)));
  };

  _proto.addAnnotation = function addAnnotation() {
    var content;

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

  _proto.outputFile = function outputFile() {
    if (this.opts.to) {
      return this.relative(this.opts.to);
    }

    if (this.opts.from) {
      return this.relative(this.opts.from);
    }

    return 'to.css';
  };

  _proto.generateMap = function generateMap() {
    this.generateString();
    if (this.isSourcesContent()) this.setSourcesContent();
    if (this.previous().length > 0) this.applyPrevMaps();
    if (this.isAnnotation()) this.addAnnotation();

    if (this.isInline()) {
      return [this.css];
    }

    return [this.css, this.map];
  };

  _proto.relative = function relative(file) {
    if (file.indexOf('<') === 0) return file;
    if (/^\w+:\/\//.test(file)) return file;
    var from = this.opts.to ? _path.default.dirname(this.opts.to) : '.';

    if (typeof this.mapOpts.annotation === 'string') {
      from = _path.default.dirname(_path.default.resolve(from, this.mapOpts.annotation));
    }

    file = _path.default.relative(from, file);

    if (_path.default.sep === '\\') {
      return file.replace(/\\/g, '/');
    }

    return file;
  };

  _proto.sourcePath = function sourcePath(node) {
    if (this.mapOpts.from) {
      return this.mapOpts.from;
    }

    return this.relative(node.source.input.from);
  };

  _proto.generateString = function generateString() {
    var _this3 = this;

    this.css = '';
    this.map = new _sourceMap.default.SourceMapGenerator({
      file: this.outputFile()
    });
    var line = 1;
    var column = 1;
    var lines, last;
    this.stringify(this.root, function (str, node, type) {
      _this3.css += str;

      if (node && type !== 'end') {
        if (node.source && node.source.start) {
          _this3.map.addMapping({
            source: _this3.sourcePath(node),
            generated: {
              line: line,
              column: column - 1
            },
            original: {
              line: node.source.start.line,
              column: node.source.start.column - 1
            }
          });
        } else {
          _this3.map.addMapping({
            source: '<no source>',
            original: {
              line: 1,
              column: 0
            },
            generated: {
              line: line,
              column: column - 1
            }
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
        var p = node.parent || {
          raws: {}
        };

        if (node.type !== 'decl' || node !== p.last || p.raws.semicolon) {
          if (node.source && node.source.end) {
            _this3.map.addMapping({
              source: _this3.sourcePath(node),
              generated: {
                line: line,
                column: column - 2
              },
              original: {
                line: node.source.end.line,
                column: node.source.end.column - 1
              }
            });
          } else {
            _this3.map.addMapping({
              source: '<no source>',
              original: {
                line: 1,
                column: 0
              },
              generated: {
                line: line,
                column: column - 1
              }
            });
          }
        }
      }
    });
  };

  _proto.generate = function generate() {
    this.clearAnnotation();

    if (this.isMap()) {
      return this.generateMap();
    }

    var result = '';
    this.stringify(this.root, function (i) {
      result += i;
    });
    return [result];
  };

  return MapGenerator;
}();

var _default = MapGenerator;
exports.default = _default;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hcC1nZW5lcmF0b3IuZXM2Il0sIm5hbWVzIjpbIk1hcEdlbmVyYXRvciIsInN0cmluZ2lmeSIsInJvb3QiLCJvcHRzIiwibWFwT3B0cyIsIm1hcCIsImlzTWFwIiwicHJldmlvdXMiLCJsZW5ndGgiLCJwcmV2aW91c01hcHMiLCJ3YWxrIiwibm9kZSIsInNvdXJjZSIsImlucHV0IiwiaW5kZXhPZiIsInB1c2giLCJpc0lubGluZSIsImlubGluZSIsImFubm90YXRpb24iLCJzb21lIiwiaSIsImlzU291cmNlc0NvbnRlbnQiLCJzb3VyY2VzQ29udGVudCIsIndpdGhDb250ZW50IiwiY2xlYXJBbm5vdGF0aW9uIiwibm9kZXMiLCJ0eXBlIiwidGV4dCIsInJlbW92ZUNoaWxkIiwic2V0U291cmNlc0NvbnRlbnQiLCJhbHJlYWR5IiwiZnJvbSIsInJlbGF0aXZlIiwic2V0U291cmNlQ29udGVudCIsImNzcyIsImFwcGx5UHJldk1hcHMiLCJwcmV2IiwiZmlsZSIsInBhdGgiLCJkaXJuYW1lIiwibW96aWxsYSIsIlNvdXJjZU1hcENvbnN1bWVyIiwiY29uc3VtZXIiLCJhcHBseVNvdXJjZU1hcCIsImlzQW5ub3RhdGlvbiIsInRvQmFzZTY0Iiwic3RyIiwiQnVmZmVyIiwidG9TdHJpbmciLCJ3aW5kb3ciLCJidG9hIiwidW5lc2NhcGUiLCJlbmNvZGVVUklDb21wb25lbnQiLCJhZGRBbm5vdGF0aW9uIiwiY29udGVudCIsIm91dHB1dEZpbGUiLCJlb2wiLCJ0byIsImdlbmVyYXRlTWFwIiwiZ2VuZXJhdGVTdHJpbmciLCJ0ZXN0IiwicmVzb2x2ZSIsInNlcCIsInJlcGxhY2UiLCJzb3VyY2VQYXRoIiwiU291cmNlTWFwR2VuZXJhdG9yIiwibGluZSIsImNvbHVtbiIsImxpbmVzIiwibGFzdCIsInN0YXJ0IiwiYWRkTWFwcGluZyIsImdlbmVyYXRlZCIsIm9yaWdpbmFsIiwibWF0Y2giLCJsYXN0SW5kZXhPZiIsInAiLCJwYXJlbnQiLCJyYXdzIiwic2VtaWNvbG9uIiwiZW5kIiwiZ2VuZXJhdGUiLCJyZXN1bHQiXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUE7O0FBQ0E7Ozs7Ozs7Ozs7SUFFTUEsWTtBQUNKLHdCQUFhQyxTQUFiLEVBQXdCQyxJQUF4QixFQUE4QkMsSUFBOUIsRUFBb0M7QUFDbEMsU0FBS0YsU0FBTCxHQUFpQkEsU0FBakI7QUFDQSxTQUFLRyxPQUFMLEdBQWVELElBQUksQ0FBQ0UsR0FBTCxJQUFZLEVBQTNCO0FBQ0EsU0FBS0gsSUFBTCxHQUFZQSxJQUFaO0FBQ0EsU0FBS0MsSUFBTCxHQUFZQSxJQUFaO0FBQ0Q7Ozs7U0FFREcsSyxHQUFBLGlCQUFTO0FBQ1AsUUFBSSxPQUFPLEtBQUtILElBQUwsQ0FBVUUsR0FBakIsS0FBeUIsV0FBN0IsRUFBMEM7QUFDeEMsYUFBTyxDQUFDLENBQUMsS0FBS0YsSUFBTCxDQUFVRSxHQUFuQjtBQUNEOztBQUNELFdBQU8sS0FBS0UsUUFBTCxHQUFnQkMsTUFBaEIsR0FBeUIsQ0FBaEM7QUFDRCxHOztTQUVERCxRLEdBQUEsb0JBQVk7QUFBQTs7QUFDVixRQUFJLENBQUMsS0FBS0UsWUFBVixFQUF3QjtBQUN0QixXQUFLQSxZQUFMLEdBQW9CLEVBQXBCO0FBQ0EsV0FBS1AsSUFBTCxDQUFVUSxJQUFWLENBQWUsVUFBQUMsSUFBSSxFQUFJO0FBQ3JCLFlBQUlBLElBQUksQ0FBQ0MsTUFBTCxJQUFlRCxJQUFJLENBQUNDLE1BQUwsQ0FBWUMsS0FBWixDQUFrQlIsR0FBckMsRUFBMEM7QUFDeEMsY0FBSUEsR0FBRyxHQUFHTSxJQUFJLENBQUNDLE1BQUwsQ0FBWUMsS0FBWixDQUFrQlIsR0FBNUI7O0FBQ0EsY0FBSSxLQUFJLENBQUNJLFlBQUwsQ0FBa0JLLE9BQWxCLENBQTBCVCxHQUExQixNQUFtQyxDQUFDLENBQXhDLEVBQTJDO0FBQ3pDLFlBQUEsS0FBSSxDQUFDSSxZQUFMLENBQWtCTSxJQUFsQixDQUF1QlYsR0FBdkI7QUFDRDtBQUNGO0FBQ0YsT0FQRDtBQVFEOztBQUVELFdBQU8sS0FBS0ksWUFBWjtBQUNELEc7O1NBRURPLFEsR0FBQSxvQkFBWTtBQUNWLFFBQUksT0FBTyxLQUFLWixPQUFMLENBQWFhLE1BQXBCLEtBQStCLFdBQW5DLEVBQWdEO0FBQzlDLGFBQU8sS0FBS2IsT0FBTCxDQUFhYSxNQUFwQjtBQUNEOztBQUVELFFBQUlDLFVBQVUsR0FBRyxLQUFLZCxPQUFMLENBQWFjLFVBQTlCOztBQUNBLFFBQUksT0FBT0EsVUFBUCxLQUFzQixXQUF0QixJQUFxQ0EsVUFBVSxLQUFLLElBQXhELEVBQThEO0FBQzVELGFBQU8sS0FBUDtBQUNEOztBQUVELFFBQUksS0FBS1gsUUFBTCxHQUFnQkMsTUFBcEIsRUFBNEI7QUFDMUIsYUFBTyxLQUFLRCxRQUFMLEdBQWdCWSxJQUFoQixDQUFxQixVQUFBQyxDQUFDO0FBQUEsZUFBSUEsQ0FBQyxDQUFDSCxNQUFOO0FBQUEsT0FBdEIsQ0FBUDtBQUNEOztBQUNELFdBQU8sSUFBUDtBQUNELEc7O1NBRURJLGdCLEdBQUEsNEJBQW9CO0FBQ2xCLFFBQUksT0FBTyxLQUFLakIsT0FBTCxDQUFha0IsY0FBcEIsS0FBdUMsV0FBM0MsRUFBd0Q7QUFDdEQsYUFBTyxLQUFLbEIsT0FBTCxDQUFha0IsY0FBcEI7QUFDRDs7QUFDRCxRQUFJLEtBQUtmLFFBQUwsR0FBZ0JDLE1BQXBCLEVBQTRCO0FBQzFCLGFBQU8sS0FBS0QsUUFBTCxHQUFnQlksSUFBaEIsQ0FBcUIsVUFBQUMsQ0FBQztBQUFBLGVBQUlBLENBQUMsQ0FBQ0csV0FBRixFQUFKO0FBQUEsT0FBdEIsQ0FBUDtBQUNEOztBQUNELFdBQU8sSUFBUDtBQUNELEc7O1NBRURDLGUsR0FBQSwyQkFBbUI7QUFDakIsUUFBSSxLQUFLcEIsT0FBTCxDQUFhYyxVQUFiLEtBQTRCLEtBQWhDLEVBQXVDO0FBRXZDLFFBQUlQLElBQUo7O0FBQ0EsU0FBSyxJQUFJUyxDQUFDLEdBQUcsS0FBS2xCLElBQUwsQ0FBVXVCLEtBQVYsQ0FBZ0JqQixNQUFoQixHQUF5QixDQUF0QyxFQUF5Q1ksQ0FBQyxJQUFJLENBQTlDLEVBQWlEQSxDQUFDLEVBQWxELEVBQXNEO0FBQ3BEVCxNQUFBQSxJQUFJLEdBQUcsS0FBS1QsSUFBTCxDQUFVdUIsS0FBVixDQUFnQkwsQ0FBaEIsQ0FBUDtBQUNBLFVBQUlULElBQUksQ0FBQ2UsSUFBTCxLQUFjLFNBQWxCLEVBQTZCOztBQUM3QixVQUFJZixJQUFJLENBQUNnQixJQUFMLENBQVViLE9BQVYsQ0FBa0IscUJBQWxCLE1BQTZDLENBQWpELEVBQW9EO0FBQ2xELGFBQUtaLElBQUwsQ0FBVTBCLFdBQVYsQ0FBc0JSLENBQXRCO0FBQ0Q7QUFDRjtBQUNGLEc7O1NBRURTLGlCLEdBQUEsNkJBQXFCO0FBQUE7O0FBQ25CLFFBQUlDLE9BQU8sR0FBRyxFQUFkO0FBQ0EsU0FBSzVCLElBQUwsQ0FBVVEsSUFBVixDQUFlLFVBQUFDLElBQUksRUFBSTtBQUNyQixVQUFJQSxJQUFJLENBQUNDLE1BQVQsRUFBaUI7QUFDZixZQUFJbUIsSUFBSSxHQUFHcEIsSUFBSSxDQUFDQyxNQUFMLENBQVlDLEtBQVosQ0FBa0JrQixJQUE3Qjs7QUFDQSxZQUFJQSxJQUFJLElBQUksQ0FBQ0QsT0FBTyxDQUFDQyxJQUFELENBQXBCLEVBQTRCO0FBQzFCRCxVQUFBQSxPQUFPLENBQUNDLElBQUQsQ0FBUCxHQUFnQixJQUFoQjs7QUFDQSxjQUFJQyxRQUFRLEdBQUcsTUFBSSxDQUFDQSxRQUFMLENBQWNELElBQWQsQ0FBZjs7QUFDQSxVQUFBLE1BQUksQ0FBQzFCLEdBQUwsQ0FBUzRCLGdCQUFULENBQTBCRCxRQUExQixFQUFvQ3JCLElBQUksQ0FBQ0MsTUFBTCxDQUFZQyxLQUFaLENBQWtCcUIsR0FBdEQ7QUFDRDtBQUNGO0FBQ0YsS0FURDtBQVVELEc7O1NBRURDLGEsR0FBQSx5QkFBaUI7QUFDZix5REFBaUIsS0FBSzVCLFFBQUwsRUFBakIsd0NBQWtDO0FBQUEsVUFBekI2QixJQUF5QjtBQUNoQyxVQUFJTCxJQUFJLEdBQUcsS0FBS0MsUUFBTCxDQUFjSSxJQUFJLENBQUNDLElBQW5CLENBQVg7O0FBQ0EsVUFBSW5DLElBQUksR0FBR2tDLElBQUksQ0FBQ2xDLElBQUwsSUFBYW9DLGNBQUtDLE9BQUwsQ0FBYUgsSUFBSSxDQUFDQyxJQUFsQixDQUF4Qjs7QUFDQSxVQUFJaEMsR0FBRyxTQUFQOztBQUVBLFVBQUksS0FBS0QsT0FBTCxDQUFha0IsY0FBYixLQUFnQyxLQUFwQyxFQUEyQztBQUN6Q2pCLFFBQUFBLEdBQUcsR0FBRyxJQUFJbUMsbUJBQVFDLGlCQUFaLENBQThCTCxJQUFJLENBQUNULElBQW5DLENBQU47O0FBQ0EsWUFBSXRCLEdBQUcsQ0FBQ2lCLGNBQVIsRUFBd0I7QUFDdEJqQixVQUFBQSxHQUFHLENBQUNpQixjQUFKLEdBQXFCakIsR0FBRyxDQUFDaUIsY0FBSixDQUFtQmpCLEdBQW5CLENBQXVCO0FBQUEsbUJBQU0sSUFBTjtBQUFBLFdBQXZCLENBQXJCO0FBQ0Q7QUFDRixPQUxELE1BS087QUFDTEEsUUFBQUEsR0FBRyxHQUFHK0IsSUFBSSxDQUFDTSxRQUFMLEVBQU47QUFDRDs7QUFFRCxXQUFLckMsR0FBTCxDQUFTc0MsY0FBVCxDQUF3QnRDLEdBQXhCLEVBQTZCMEIsSUFBN0IsRUFBbUMsS0FBS0MsUUFBTCxDQUFjOUIsSUFBZCxDQUFuQztBQUNEO0FBQ0YsRzs7U0FFRDBDLFksR0FBQSx3QkFBZ0I7QUFDZCxRQUFJLEtBQUs1QixRQUFMLEVBQUosRUFBcUI7QUFDbkIsYUFBTyxJQUFQO0FBQ0Q7O0FBQ0QsUUFBSSxPQUFPLEtBQUtaLE9BQUwsQ0FBYWMsVUFBcEIsS0FBbUMsV0FBdkMsRUFBb0Q7QUFDbEQsYUFBTyxLQUFLZCxPQUFMLENBQWFjLFVBQXBCO0FBQ0Q7O0FBQ0QsUUFBSSxLQUFLWCxRQUFMLEdBQWdCQyxNQUFwQixFQUE0QjtBQUMxQixhQUFPLEtBQUtELFFBQUwsR0FBZ0JZLElBQWhCLENBQXFCLFVBQUFDLENBQUM7QUFBQSxlQUFJQSxDQUFDLENBQUNGLFVBQU47QUFBQSxPQUF0QixDQUFQO0FBQ0Q7O0FBQ0QsV0FBTyxJQUFQO0FBQ0QsRzs7U0FFRDJCLFEsR0FBQSxrQkFBVUMsR0FBVixFQUFlO0FBQ2IsUUFBSUMsTUFBSixFQUFZO0FBQ1YsYUFBT0EsTUFBTSxDQUFDaEIsSUFBUCxDQUFZZSxHQUFaLEVBQWlCRSxRQUFqQixDQUEwQixRQUExQixDQUFQO0FBQ0Q7O0FBQ0QsV0FBT0MsTUFBTSxDQUFDQyxJQUFQLENBQVlDLFFBQVEsQ0FBQ0Msa0JBQWtCLENBQUNOLEdBQUQsQ0FBbkIsQ0FBcEIsQ0FBUDtBQUNELEc7O1NBRURPLGEsR0FBQSx5QkFBaUI7QUFDZixRQUFJQyxPQUFKOztBQUVBLFFBQUksS0FBS3RDLFFBQUwsRUFBSixFQUFxQjtBQUNuQnNDLE1BQUFBLE9BQU8sR0FBRyxrQ0FDQSxLQUFLVCxRQUFMLENBQWMsS0FBS3hDLEdBQUwsQ0FBUzJDLFFBQVQsRUFBZCxDQURWO0FBRUQsS0FIRCxNQUdPLElBQUksT0FBTyxLQUFLNUMsT0FBTCxDQUFhYyxVQUFwQixLQUFtQyxRQUF2QyxFQUFpRDtBQUN0RG9DLE1BQUFBLE9BQU8sR0FBRyxLQUFLbEQsT0FBTCxDQUFhYyxVQUF2QjtBQUNELEtBRk0sTUFFQTtBQUNMb0MsTUFBQUEsT0FBTyxHQUFHLEtBQUtDLFVBQUwsS0FBb0IsTUFBOUI7QUFDRDs7QUFFRCxRQUFJQyxHQUFHLEdBQUcsSUFBVjtBQUNBLFFBQUksS0FBS3RCLEdBQUwsQ0FBU3BCLE9BQVQsQ0FBaUIsTUFBakIsTUFBNkIsQ0FBQyxDQUFsQyxFQUFxQzBDLEdBQUcsR0FBRyxNQUFOO0FBRXJDLFNBQUt0QixHQUFMLElBQVlzQixHQUFHLEdBQUcsdUJBQU4sR0FBZ0NGLE9BQWhDLEdBQTBDLEtBQXREO0FBQ0QsRzs7U0FFREMsVSxHQUFBLHNCQUFjO0FBQ1osUUFBSSxLQUFLcEQsSUFBTCxDQUFVc0QsRUFBZCxFQUFrQjtBQUNoQixhQUFPLEtBQUt6QixRQUFMLENBQWMsS0FBSzdCLElBQUwsQ0FBVXNELEVBQXhCLENBQVA7QUFDRDs7QUFDRCxRQUFJLEtBQUt0RCxJQUFMLENBQVU0QixJQUFkLEVBQW9CO0FBQ2xCLGFBQU8sS0FBS0MsUUFBTCxDQUFjLEtBQUs3QixJQUFMLENBQVU0QixJQUF4QixDQUFQO0FBQ0Q7O0FBQ0QsV0FBTyxRQUFQO0FBQ0QsRzs7U0FFRDJCLFcsR0FBQSx1QkFBZTtBQUNiLFNBQUtDLGNBQUw7QUFDQSxRQUFJLEtBQUt0QyxnQkFBTCxFQUFKLEVBQTZCLEtBQUtRLGlCQUFMO0FBQzdCLFFBQUksS0FBS3RCLFFBQUwsR0FBZ0JDLE1BQWhCLEdBQXlCLENBQTdCLEVBQWdDLEtBQUsyQixhQUFMO0FBQ2hDLFFBQUksS0FBS1MsWUFBTCxFQUFKLEVBQXlCLEtBQUtTLGFBQUw7O0FBRXpCLFFBQUksS0FBS3JDLFFBQUwsRUFBSixFQUFxQjtBQUNuQixhQUFPLENBQUMsS0FBS2tCLEdBQU4sQ0FBUDtBQUNEOztBQUNELFdBQU8sQ0FBQyxLQUFLQSxHQUFOLEVBQVcsS0FBSzdCLEdBQWhCLENBQVA7QUFDRCxHOztTQUVEMkIsUSxHQUFBLGtCQUFVSyxJQUFWLEVBQWdCO0FBQ2QsUUFBSUEsSUFBSSxDQUFDdkIsT0FBTCxDQUFhLEdBQWIsTUFBc0IsQ0FBMUIsRUFBNkIsT0FBT3VCLElBQVA7QUFDN0IsUUFBSSxZQUFZdUIsSUFBWixDQUFpQnZCLElBQWpCLENBQUosRUFBNEIsT0FBT0EsSUFBUDtBQUU1QixRQUFJTixJQUFJLEdBQUcsS0FBSzVCLElBQUwsQ0FBVXNELEVBQVYsR0FBZW5CLGNBQUtDLE9BQUwsQ0FBYSxLQUFLcEMsSUFBTCxDQUFVc0QsRUFBdkIsQ0FBZixHQUE0QyxHQUF2RDs7QUFFQSxRQUFJLE9BQU8sS0FBS3JELE9BQUwsQ0FBYWMsVUFBcEIsS0FBbUMsUUFBdkMsRUFBaUQ7QUFDL0NhLE1BQUFBLElBQUksR0FBR08sY0FBS0MsT0FBTCxDQUFhRCxjQUFLdUIsT0FBTCxDQUFhOUIsSUFBYixFQUFtQixLQUFLM0IsT0FBTCxDQUFhYyxVQUFoQyxDQUFiLENBQVA7QUFDRDs7QUFFRG1CLElBQUFBLElBQUksR0FBR0MsY0FBS04sUUFBTCxDQUFjRCxJQUFkLEVBQW9CTSxJQUFwQixDQUFQOztBQUNBLFFBQUlDLGNBQUt3QixHQUFMLEtBQWEsSUFBakIsRUFBdUI7QUFDckIsYUFBT3pCLElBQUksQ0FBQzBCLE9BQUwsQ0FBYSxLQUFiLEVBQW9CLEdBQXBCLENBQVA7QUFDRDs7QUFDRCxXQUFPMUIsSUFBUDtBQUNELEc7O1NBRUQyQixVLEdBQUEsb0JBQVlyRCxJQUFaLEVBQWtCO0FBQ2hCLFFBQUksS0FBS1AsT0FBTCxDQUFhMkIsSUFBakIsRUFBdUI7QUFDckIsYUFBTyxLQUFLM0IsT0FBTCxDQUFhMkIsSUFBcEI7QUFDRDs7QUFDRCxXQUFPLEtBQUtDLFFBQUwsQ0FBY3JCLElBQUksQ0FBQ0MsTUFBTCxDQUFZQyxLQUFaLENBQWtCa0IsSUFBaEMsQ0FBUDtBQUNELEc7O1NBRUQ0QixjLEdBQUEsMEJBQWtCO0FBQUE7O0FBQ2hCLFNBQUt6QixHQUFMLEdBQVcsRUFBWDtBQUNBLFNBQUs3QixHQUFMLEdBQVcsSUFBSW1DLG1CQUFReUIsa0JBQVosQ0FBK0I7QUFBRTVCLE1BQUFBLElBQUksRUFBRSxLQUFLa0IsVUFBTDtBQUFSLEtBQS9CLENBQVg7QUFFQSxRQUFJVyxJQUFJLEdBQUcsQ0FBWDtBQUNBLFFBQUlDLE1BQU0sR0FBRyxDQUFiO0FBRUEsUUFBSUMsS0FBSixFQUFXQyxJQUFYO0FBQ0EsU0FBS3BFLFNBQUwsQ0FBZSxLQUFLQyxJQUFwQixFQUEwQixVQUFDNEMsR0FBRCxFQUFNbkMsSUFBTixFQUFZZSxJQUFaLEVBQXFCO0FBQzdDLE1BQUEsTUFBSSxDQUFDUSxHQUFMLElBQVlZLEdBQVo7O0FBRUEsVUFBSW5DLElBQUksSUFBSWUsSUFBSSxLQUFLLEtBQXJCLEVBQTRCO0FBQzFCLFlBQUlmLElBQUksQ0FBQ0MsTUFBTCxJQUFlRCxJQUFJLENBQUNDLE1BQUwsQ0FBWTBELEtBQS9CLEVBQXNDO0FBQ3BDLFVBQUEsTUFBSSxDQUFDakUsR0FBTCxDQUFTa0UsVUFBVCxDQUFvQjtBQUNsQjNELFlBQUFBLE1BQU0sRUFBRSxNQUFJLENBQUNvRCxVQUFMLENBQWdCckQsSUFBaEIsQ0FEVTtBQUVsQjZELFlBQUFBLFNBQVMsRUFBRTtBQUFFTixjQUFBQSxJQUFJLEVBQUpBLElBQUY7QUFBUUMsY0FBQUEsTUFBTSxFQUFFQSxNQUFNLEdBQUc7QUFBekIsYUFGTztBQUdsQk0sWUFBQUEsUUFBUSxFQUFFO0FBQ1JQLGNBQUFBLElBQUksRUFBRXZELElBQUksQ0FBQ0MsTUFBTCxDQUFZMEQsS0FBWixDQUFrQkosSUFEaEI7QUFFUkMsY0FBQUEsTUFBTSxFQUFFeEQsSUFBSSxDQUFDQyxNQUFMLENBQVkwRCxLQUFaLENBQWtCSCxNQUFsQixHQUEyQjtBQUYzQjtBQUhRLFdBQXBCO0FBUUQsU0FURCxNQVNPO0FBQ0wsVUFBQSxNQUFJLENBQUM5RCxHQUFMLENBQVNrRSxVQUFULENBQW9CO0FBQ2xCM0QsWUFBQUEsTUFBTSxFQUFFLGFBRFU7QUFFbEI2RCxZQUFBQSxRQUFRLEVBQUU7QUFBRVAsY0FBQUEsSUFBSSxFQUFFLENBQVI7QUFBV0MsY0FBQUEsTUFBTSxFQUFFO0FBQW5CLGFBRlE7QUFHbEJLLFlBQUFBLFNBQVMsRUFBRTtBQUFFTixjQUFBQSxJQUFJLEVBQUpBLElBQUY7QUFBUUMsY0FBQUEsTUFBTSxFQUFFQSxNQUFNLEdBQUc7QUFBekI7QUFITyxXQUFwQjtBQUtEO0FBQ0Y7O0FBRURDLE1BQUFBLEtBQUssR0FBR3RCLEdBQUcsQ0FBQzRCLEtBQUosQ0FBVSxLQUFWLENBQVI7O0FBQ0EsVUFBSU4sS0FBSixFQUFXO0FBQ1RGLFFBQUFBLElBQUksSUFBSUUsS0FBSyxDQUFDNUQsTUFBZDtBQUNBNkQsUUFBQUEsSUFBSSxHQUFHdkIsR0FBRyxDQUFDNkIsV0FBSixDQUFnQixJQUFoQixDQUFQO0FBQ0FSLFFBQUFBLE1BQU0sR0FBR3JCLEdBQUcsQ0FBQ3RDLE1BQUosR0FBYTZELElBQXRCO0FBQ0QsT0FKRCxNQUlPO0FBQ0xGLFFBQUFBLE1BQU0sSUFBSXJCLEdBQUcsQ0FBQ3RDLE1BQWQ7QUFDRDs7QUFFRCxVQUFJRyxJQUFJLElBQUllLElBQUksS0FBSyxPQUFyQixFQUE4QjtBQUM1QixZQUFJa0QsQ0FBQyxHQUFHakUsSUFBSSxDQUFDa0UsTUFBTCxJQUFlO0FBQUVDLFVBQUFBLElBQUksRUFBRTtBQUFSLFNBQXZCOztBQUNBLFlBQUluRSxJQUFJLENBQUNlLElBQUwsS0FBYyxNQUFkLElBQXdCZixJQUFJLEtBQUtpRSxDQUFDLENBQUNQLElBQW5DLElBQTJDTyxDQUFDLENBQUNFLElBQUYsQ0FBT0MsU0FBdEQsRUFBaUU7QUFDL0QsY0FBSXBFLElBQUksQ0FBQ0MsTUFBTCxJQUFlRCxJQUFJLENBQUNDLE1BQUwsQ0FBWW9FLEdBQS9CLEVBQW9DO0FBQ2xDLFlBQUEsTUFBSSxDQUFDM0UsR0FBTCxDQUFTa0UsVUFBVCxDQUFvQjtBQUNsQjNELGNBQUFBLE1BQU0sRUFBRSxNQUFJLENBQUNvRCxVQUFMLENBQWdCckQsSUFBaEIsQ0FEVTtBQUVsQjZELGNBQUFBLFNBQVMsRUFBRTtBQUFFTixnQkFBQUEsSUFBSSxFQUFKQSxJQUFGO0FBQVFDLGdCQUFBQSxNQUFNLEVBQUVBLE1BQU0sR0FBRztBQUF6QixlQUZPO0FBR2xCTSxjQUFBQSxRQUFRLEVBQUU7QUFDUlAsZ0JBQUFBLElBQUksRUFBRXZELElBQUksQ0FBQ0MsTUFBTCxDQUFZb0UsR0FBWixDQUFnQmQsSUFEZDtBQUVSQyxnQkFBQUEsTUFBTSxFQUFFeEQsSUFBSSxDQUFDQyxNQUFMLENBQVlvRSxHQUFaLENBQWdCYixNQUFoQixHQUF5QjtBQUZ6QjtBQUhRLGFBQXBCO0FBUUQsV0FURCxNQVNPO0FBQ0wsWUFBQSxNQUFJLENBQUM5RCxHQUFMLENBQVNrRSxVQUFULENBQW9CO0FBQ2xCM0QsY0FBQUEsTUFBTSxFQUFFLGFBRFU7QUFFbEI2RCxjQUFBQSxRQUFRLEVBQUU7QUFBRVAsZ0JBQUFBLElBQUksRUFBRSxDQUFSO0FBQVdDLGdCQUFBQSxNQUFNLEVBQUU7QUFBbkIsZUFGUTtBQUdsQkssY0FBQUEsU0FBUyxFQUFFO0FBQUVOLGdCQUFBQSxJQUFJLEVBQUpBLElBQUY7QUFBUUMsZ0JBQUFBLE1BQU0sRUFBRUEsTUFBTSxHQUFHO0FBQXpCO0FBSE8sYUFBcEI7QUFLRDtBQUNGO0FBQ0Y7QUFDRixLQXBERDtBQXFERCxHOztTQUVEYyxRLEdBQUEsb0JBQVk7QUFDVixTQUFLekQsZUFBTDs7QUFFQSxRQUFJLEtBQUtsQixLQUFMLEVBQUosRUFBa0I7QUFDaEIsYUFBTyxLQUFLb0QsV0FBTCxFQUFQO0FBQ0Q7O0FBRUQsUUFBSXdCLE1BQU0sR0FBRyxFQUFiO0FBQ0EsU0FBS2pGLFNBQUwsQ0FBZSxLQUFLQyxJQUFwQixFQUEwQixVQUFBa0IsQ0FBQyxFQUFJO0FBQzdCOEQsTUFBQUEsTUFBTSxJQUFJOUQsQ0FBVjtBQUNELEtBRkQ7QUFHQSxXQUFPLENBQUM4RCxNQUFELENBQVA7QUFDRCxHOzs7OztlQUdZbEYsWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBtb3ppbGxhIGZyb20gJ3NvdXJjZS1tYXAnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG5jbGFzcyBNYXBHZW5lcmF0b3Ige1xuICBjb25zdHJ1Y3RvciAoc3RyaW5naWZ5LCByb290LCBvcHRzKSB7XG4gICAgdGhpcy5zdHJpbmdpZnkgPSBzdHJpbmdpZnlcbiAgICB0aGlzLm1hcE9wdHMgPSBvcHRzLm1hcCB8fCB7IH1cbiAgICB0aGlzLnJvb3QgPSByb290XG4gICAgdGhpcy5vcHRzID0gb3B0c1xuICB9XG5cbiAgaXNNYXAgKCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5vcHRzLm1hcCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiAhIXRoaXMub3B0cy5tYXBcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucHJldmlvdXMoKS5sZW5ndGggPiAwXG4gIH1cblxuICBwcmV2aW91cyAoKSB7XG4gICAgaWYgKCF0aGlzLnByZXZpb3VzTWFwcykge1xuICAgICAgdGhpcy5wcmV2aW91c01hcHMgPSBbXVxuICAgICAgdGhpcy5yb290LndhbGsobm9kZSA9PiB7XG4gICAgICAgIGlmIChub2RlLnNvdXJjZSAmJiBub2RlLnNvdXJjZS5pbnB1dC5tYXApIHtcbiAgICAgICAgICBsZXQgbWFwID0gbm9kZS5zb3VyY2UuaW5wdXQubWFwXG4gICAgICAgICAgaWYgKHRoaXMucHJldmlvdXNNYXBzLmluZGV4T2YobWFwKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMucHJldmlvdXNNYXBzLnB1c2gobWFwKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wcmV2aW91c01hcHNcbiAgfVxuXG4gIGlzSW5saW5lICgpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMubWFwT3B0cy5pbmxpbmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXBPcHRzLmlubGluZVxuICAgIH1cblxuICAgIGxldCBhbm5vdGF0aW9uID0gdGhpcy5tYXBPcHRzLmFubm90YXRpb25cbiAgICBpZiAodHlwZW9mIGFubm90YXRpb24gIT09ICd1bmRlZmluZWQnICYmIGFubm90YXRpb24gIT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0aGlzLnByZXZpb3VzKCkubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdGhpcy5wcmV2aW91cygpLnNvbWUoaSA9PiBpLmlubGluZSlcbiAgICB9XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIGlzU291cmNlc0NvbnRlbnQgKCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5tYXBPcHRzLnNvdXJjZXNDb250ZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIHRoaXMubWFwT3B0cy5zb3VyY2VzQ29udGVudFxuICAgIH1cbiAgICBpZiAodGhpcy5wcmV2aW91cygpLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMucHJldmlvdXMoKS5zb21lKGkgPT4gaS53aXRoQ29udGVudCgpKVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgY2xlYXJBbm5vdGF0aW9uICgpIHtcbiAgICBpZiAodGhpcy5tYXBPcHRzLmFubm90YXRpb24gPT09IGZhbHNlKSByZXR1cm5cblxuICAgIGxldCBub2RlXG4gICAgZm9yIChsZXQgaSA9IHRoaXMucm9vdC5ub2Rlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgbm9kZSA9IHRoaXMucm9vdC5ub2Rlc1tpXVxuICAgICAgaWYgKG5vZGUudHlwZSAhPT0gJ2NvbW1lbnQnKSBjb250aW51ZVxuICAgICAgaWYgKG5vZGUudGV4dC5pbmRleE9mKCcjIHNvdXJjZU1hcHBpbmdVUkw9JykgPT09IDApIHtcbiAgICAgICAgdGhpcy5yb290LnJlbW92ZUNoaWxkKGkpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2V0U291cmNlc0NvbnRlbnQgKCkge1xuICAgIGxldCBhbHJlYWR5ID0geyB9XG4gICAgdGhpcy5yb290LndhbGsobm9kZSA9PiB7XG4gICAgICBpZiAobm9kZS5zb3VyY2UpIHtcbiAgICAgICAgbGV0IGZyb20gPSBub2RlLnNvdXJjZS5pbnB1dC5mcm9tXG4gICAgICAgIGlmIChmcm9tICYmICFhbHJlYWR5W2Zyb21dKSB7XG4gICAgICAgICAgYWxyZWFkeVtmcm9tXSA9IHRydWVcbiAgICAgICAgICBsZXQgcmVsYXRpdmUgPSB0aGlzLnJlbGF0aXZlKGZyb20pXG4gICAgICAgICAgdGhpcy5tYXAuc2V0U291cmNlQ29udGVudChyZWxhdGl2ZSwgbm9kZS5zb3VyY2UuaW5wdXQuY3NzKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGFwcGx5UHJldk1hcHMgKCkge1xuICAgIGZvciAobGV0IHByZXYgb2YgdGhpcy5wcmV2aW91cygpKSB7XG4gICAgICBsZXQgZnJvbSA9IHRoaXMucmVsYXRpdmUocHJldi5maWxlKVxuICAgICAgbGV0IHJvb3QgPSBwcmV2LnJvb3QgfHwgcGF0aC5kaXJuYW1lKHByZXYuZmlsZSlcbiAgICAgIGxldCBtYXBcblxuICAgICAgaWYgKHRoaXMubWFwT3B0cy5zb3VyY2VzQ29udGVudCA9PT0gZmFsc2UpIHtcbiAgICAgICAgbWFwID0gbmV3IG1vemlsbGEuU291cmNlTWFwQ29uc3VtZXIocHJldi50ZXh0KVxuICAgICAgICBpZiAobWFwLnNvdXJjZXNDb250ZW50KSB7XG4gICAgICAgICAgbWFwLnNvdXJjZXNDb250ZW50ID0gbWFwLnNvdXJjZXNDb250ZW50Lm1hcCgoKSA9PiBudWxsKVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXAgPSBwcmV2LmNvbnN1bWVyKClcbiAgICAgIH1cblxuICAgICAgdGhpcy5tYXAuYXBwbHlTb3VyY2VNYXAobWFwLCBmcm9tLCB0aGlzLnJlbGF0aXZlKHJvb3QpKVxuICAgIH1cbiAgfVxuXG4gIGlzQW5ub3RhdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNJbmxpbmUoKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB0aGlzLm1hcE9wdHMuYW5ub3RhdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcE9wdHMuYW5ub3RhdGlvblxuICAgIH1cbiAgICBpZiAodGhpcy5wcmV2aW91cygpLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMucHJldmlvdXMoKS5zb21lKGkgPT4gaS5hbm5vdGF0aW9uKVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgdG9CYXNlNjQgKHN0cikge1xuICAgIGlmIChCdWZmZXIpIHtcbiAgICAgIHJldHVybiBCdWZmZXIuZnJvbShzdHIpLnRvU3RyaW5nKCdiYXNlNjQnKVxuICAgIH1cbiAgICByZXR1cm4gd2luZG93LmJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHN0cikpKVxuICB9XG5cbiAgYWRkQW5ub3RhdGlvbiAoKSB7XG4gICAgbGV0IGNvbnRlbnRcblxuICAgIGlmICh0aGlzLmlzSW5saW5lKCkpIHtcbiAgICAgIGNvbnRlbnQgPSAnZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCwnICtcbiAgICAgICAgICAgICAgICB0aGlzLnRvQmFzZTY0KHRoaXMubWFwLnRvU3RyaW5nKCkpXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5tYXBPcHRzLmFubm90YXRpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb250ZW50ID0gdGhpcy5tYXBPcHRzLmFubm90YXRpb25cbiAgICB9IGVsc2Uge1xuICAgICAgY29udGVudCA9IHRoaXMub3V0cHV0RmlsZSgpICsgJy5tYXAnXG4gICAgfVxuXG4gICAgbGV0IGVvbCA9ICdcXG4nXG4gICAgaWYgKHRoaXMuY3NzLmluZGV4T2YoJ1xcclxcbicpICE9PSAtMSkgZW9sID0gJ1xcclxcbidcblxuICAgIHRoaXMuY3NzICs9IGVvbCArICcvKiMgc291cmNlTWFwcGluZ1VSTD0nICsgY29udGVudCArICcgKi8nXG4gIH1cblxuICBvdXRwdXRGaWxlICgpIHtcbiAgICBpZiAodGhpcy5vcHRzLnRvKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZWxhdGl2ZSh0aGlzLm9wdHMudG8pXG4gICAgfVxuICAgIGlmICh0aGlzLm9wdHMuZnJvbSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVsYXRpdmUodGhpcy5vcHRzLmZyb20pXG4gICAgfVxuICAgIHJldHVybiAndG8uY3NzJ1xuICB9XG5cbiAgZ2VuZXJhdGVNYXAgKCkge1xuICAgIHRoaXMuZ2VuZXJhdGVTdHJpbmcoKVxuICAgIGlmICh0aGlzLmlzU291cmNlc0NvbnRlbnQoKSkgdGhpcy5zZXRTb3VyY2VzQ29udGVudCgpXG4gICAgaWYgKHRoaXMucHJldmlvdXMoKS5sZW5ndGggPiAwKSB0aGlzLmFwcGx5UHJldk1hcHMoKVxuICAgIGlmICh0aGlzLmlzQW5ub3RhdGlvbigpKSB0aGlzLmFkZEFubm90YXRpb24oKVxuXG4gICAgaWYgKHRoaXMuaXNJbmxpbmUoKSkge1xuICAgICAgcmV0dXJuIFt0aGlzLmNzc11cbiAgICB9XG4gICAgcmV0dXJuIFt0aGlzLmNzcywgdGhpcy5tYXBdXG4gIH1cblxuICByZWxhdGl2ZSAoZmlsZSkge1xuICAgIGlmIChmaWxlLmluZGV4T2YoJzwnKSA9PT0gMCkgcmV0dXJuIGZpbGVcbiAgICBpZiAoL15cXHcrOlxcL1xcLy8udGVzdChmaWxlKSkgcmV0dXJuIGZpbGVcblxuICAgIGxldCBmcm9tID0gdGhpcy5vcHRzLnRvID8gcGF0aC5kaXJuYW1lKHRoaXMub3B0cy50bykgOiAnLidcblxuICAgIGlmICh0eXBlb2YgdGhpcy5tYXBPcHRzLmFubm90YXRpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICBmcm9tID0gcGF0aC5kaXJuYW1lKHBhdGgucmVzb2x2ZShmcm9tLCB0aGlzLm1hcE9wdHMuYW5ub3RhdGlvbikpXG4gICAgfVxuXG4gICAgZmlsZSA9IHBhdGgucmVsYXRpdmUoZnJvbSwgZmlsZSlcbiAgICBpZiAocGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgcmV0dXJuIGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgfVxuICAgIHJldHVybiBmaWxlXG4gIH1cblxuICBzb3VyY2VQYXRoIChub2RlKSB7XG4gICAgaWYgKHRoaXMubWFwT3B0cy5mcm9tKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXBPcHRzLmZyb21cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVsYXRpdmUobm9kZS5zb3VyY2UuaW5wdXQuZnJvbSlcbiAgfVxuXG4gIGdlbmVyYXRlU3RyaW5nICgpIHtcbiAgICB0aGlzLmNzcyA9ICcnXG4gICAgdGhpcy5tYXAgPSBuZXcgbW96aWxsYS5Tb3VyY2VNYXBHZW5lcmF0b3IoeyBmaWxlOiB0aGlzLm91dHB1dEZpbGUoKSB9KVxuXG4gICAgbGV0IGxpbmUgPSAxXG4gICAgbGV0IGNvbHVtbiA9IDFcblxuICAgIGxldCBsaW5lcywgbGFzdFxuICAgIHRoaXMuc3RyaW5naWZ5KHRoaXMucm9vdCwgKHN0ciwgbm9kZSwgdHlwZSkgPT4ge1xuICAgICAgdGhpcy5jc3MgKz0gc3RyXG5cbiAgICAgIGlmIChub2RlICYmIHR5cGUgIT09ICdlbmQnKSB7XG4gICAgICAgIGlmIChub2RlLnNvdXJjZSAmJiBub2RlLnNvdXJjZS5zdGFydCkge1xuICAgICAgICAgIHRoaXMubWFwLmFkZE1hcHBpbmcoe1xuICAgICAgICAgICAgc291cmNlOiB0aGlzLnNvdXJjZVBhdGgobm9kZSksXG4gICAgICAgICAgICBnZW5lcmF0ZWQ6IHsgbGluZSwgY29sdW1uOiBjb2x1bW4gLSAxIH0sXG4gICAgICAgICAgICBvcmlnaW5hbDoge1xuICAgICAgICAgICAgICBsaW5lOiBub2RlLnNvdXJjZS5zdGFydC5saW5lLFxuICAgICAgICAgICAgICBjb2x1bW46IG5vZGUuc291cmNlLnN0YXJ0LmNvbHVtbiAtIDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubWFwLmFkZE1hcHBpbmcoe1xuICAgICAgICAgICAgc291cmNlOiAnPG5vIHNvdXJjZT4nLFxuICAgICAgICAgICAgb3JpZ2luYWw6IHsgbGluZTogMSwgY29sdW1uOiAwIH0sXG4gICAgICAgICAgICBnZW5lcmF0ZWQ6IHsgbGluZSwgY29sdW1uOiBjb2x1bW4gLSAxIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxpbmVzID0gc3RyLm1hdGNoKC9cXG4vZylcbiAgICAgIGlmIChsaW5lcykge1xuICAgICAgICBsaW5lICs9IGxpbmVzLmxlbmd0aFxuICAgICAgICBsYXN0ID0gc3RyLmxhc3RJbmRleE9mKCdcXG4nKVxuICAgICAgICBjb2x1bW4gPSBzdHIubGVuZ3RoIC0gbGFzdFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29sdW1uICs9IHN0ci5sZW5ndGhcbiAgICAgIH1cblxuICAgICAgaWYgKG5vZGUgJiYgdHlwZSAhPT0gJ3N0YXJ0Jykge1xuICAgICAgICBsZXQgcCA9IG5vZGUucGFyZW50IHx8IHsgcmF3czogeyB9IH1cbiAgICAgICAgaWYgKG5vZGUudHlwZSAhPT0gJ2RlY2wnIHx8IG5vZGUgIT09IHAubGFzdCB8fCBwLnJhd3Muc2VtaWNvbG9uKSB7XG4gICAgICAgICAgaWYgKG5vZGUuc291cmNlICYmIG5vZGUuc291cmNlLmVuZCkge1xuICAgICAgICAgICAgdGhpcy5tYXAuYWRkTWFwcGluZyh7XG4gICAgICAgICAgICAgIHNvdXJjZTogdGhpcy5zb3VyY2VQYXRoKG5vZGUpLFxuICAgICAgICAgICAgICBnZW5lcmF0ZWQ6IHsgbGluZSwgY29sdW1uOiBjb2x1bW4gLSAyIH0sXG4gICAgICAgICAgICAgIG9yaWdpbmFsOiB7XG4gICAgICAgICAgICAgICAgbGluZTogbm9kZS5zb3VyY2UuZW5kLmxpbmUsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBub2RlLnNvdXJjZS5lbmQuY29sdW1uIC0gMVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1hcC5hZGRNYXBwaW5nKHtcbiAgICAgICAgICAgICAgc291cmNlOiAnPG5vIHNvdXJjZT4nLFxuICAgICAgICAgICAgICBvcmlnaW5hbDogeyBsaW5lOiAxLCBjb2x1bW46IDAgfSxcbiAgICAgICAgICAgICAgZ2VuZXJhdGVkOiB7IGxpbmUsIGNvbHVtbjogY29sdW1uIC0gMSB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBnZW5lcmF0ZSAoKSB7XG4gICAgdGhpcy5jbGVhckFubm90YXRpb24oKVxuXG4gICAgaWYgKHRoaXMuaXNNYXAoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGVNYXAoKVxuICAgIH1cblxuICAgIGxldCByZXN1bHQgPSAnJ1xuICAgIHRoaXMuc3RyaW5naWZ5KHRoaXMucm9vdCwgaSA9PiB7XG4gICAgICByZXN1bHQgKz0gaVxuICAgIH0pXG4gICAgcmV0dXJuIFtyZXN1bHRdXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTWFwR2VuZXJhdG9yXG4iXSwiZmlsZSI6Im1hcC1nZW5lcmF0b3IuanMifQ==
