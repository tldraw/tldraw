'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _cssSyntaxError = require('./css-syntax-error');

var _cssSyntaxError2 = _interopRequireDefault(_cssSyntaxError);

var _stringifier = require('./stringifier');

var _stringifier2 = _interopRequireDefault(_stringifier);

var _stringify = require('./stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _warnOnce = require('./warn-once');

var _warnOnce2 = _interopRequireDefault(_warnOnce);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var cloneNode = function cloneNode(obj, parent) {
    var cloned = new obj.constructor();

    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        var value = obj[i];
        var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

        if (i === 'parent' && type === 'object') {
            if (parent) cloned[i] = parent;
        } else if (i === 'source') {
            cloned[i] = value;
        } else if (value instanceof Array) {
            cloned[i] = value.map(function (j) {
                return cloneNode(j, cloned);
            });
        } else {
            if (type === 'object' && value !== null) value = cloneNode(value);
            cloned[i] = value;
        }
    }

    return cloned;
};

/**
 * All node classes inherit the following common methods.
 *
 * @abstract
 */

var Node = function () {

    /**
     * @param {object} [defaults] - value for node properties
     */
    function Node() {
        var defaults = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, Node);

        this.raws = {};
        if ((typeof defaults === 'undefined' ? 'undefined' : _typeof(defaults)) !== 'object' && typeof defaults !== 'undefined') {
            throw new Error('PostCSS nodes constructor accepts object, not ' + JSON.stringify(defaults));
        }
        for (var name in defaults) {
            this[name] = defaults[name];
        }
    }

    /**
     * Returns a CssSyntaxError instance containing the original position
     * of the node in the source, showing line and column numbers and also
     * a small excerpt to facilitate debugging.
     *
     * If present, an input source map will be used to get the original position
     * of the source, even from a previous compilation step
     * (e.g., from Sass compilation).
     *
     * This method produces very useful error messages.
     *
     * @param {string} message     - error description
     * @param {object} [opts]      - options
     * @param {string} opts.plugin - plugin name that created this error.
     *                               PostCSS will set it automatically.
     * @param {string} opts.word   - a word inside a node’s string that should
     *                               be highlighted as the source of the error
     * @param {number} opts.index  - an index inside a node’s string that should
     *                               be highlighted as the source of the error
     *
     * @return {CssSyntaxError} error object to throw it
     *
     * @example
     * if ( !variables[name] ) {
     *   throw decl.error('Unknown variable ' + name, { word: name });
     *   // CssSyntaxError: postcss-vars:a.sass:4:3: Unknown variable $black
     *   //   color: $black
     *   // a
     *   //          ^
     *   //   background: white
     * }
     */


    Node.prototype.error = function error(message) {
        var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        if (this.source) {
            var pos = this.positionBy(opts);
            return this.source.input.error(message, pos.line, pos.column, opts);
        } else {
            return new _cssSyntaxError2.default(message);
        }
    };

    /**
     * This method is provided as a convenience wrapper for {@link Result#warn}.
     *
     * @param {Result} result      - the {@link Result} instance
     *                               that will receive the warning
     * @param {string} text        - warning message
     * @param {object} [opts]      - options
     * @param {string} opts.plugin - plugin name that created this warning.
     *                               PostCSS will set it automatically.
     * @param {string} opts.word   - a word inside a node’s string that should
     *                               be highlighted as the source of the warning
     * @param {number} opts.index  - an index inside a node’s string that should
     *                               be highlighted as the source of the warning
     *
     * @return {Warning} created warning object
     *
     * @example
     * const plugin = postcss.plugin('postcss-deprecated', () => {
     *   return (root, result) => {
     *     root.walkDecls('bad', decl => {
     *       decl.warn(result, 'Deprecated property bad');
     *     });
     *   };
     * });
     */


    Node.prototype.warn = function warn(result, text, opts) {
        var data = { node: this };
        for (var i in opts) {
            data[i] = opts[i];
        }return result.warn(text, data);
    };

    /**
     * Removes the node from its parent and cleans the parent properties
     * from the node and its children.
     *
     * @example
     * if ( decl.prop.match(/^-webkit-/) ) {
     *   decl.remove();
     * }
     *
     * @return {Node} node to make calls chain
     */


    Node.prototype.remove = function remove() {
        if (this.parent) {
            this.parent.removeChild(this);
        }
        this.parent = undefined;
        return this;
    };

    /**
     * Returns a CSS string representing the node.
     *
     * @param {stringifier|syntax} [stringifier] - a syntax to use
     *                                             in string generation
     *
     * @return {string} CSS string of this node
     *
     * @example
     * postcss.rule({ selector: 'a' }).toString() //=> "a {}"
     */


    Node.prototype.toString = function toString() {
        var stringifier = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _stringify2.default;

        if (stringifier.stringify) stringifier = stringifier.stringify;
        var result = '';
        stringifier(this, function (i) {
            result += i;
        });
        return result;
    };

    /**
     * Returns a clone of the node.
     *
     * The resulting cloned node and its (cloned) children will have
     * a clean parent and code style properties.
     *
     * @param {object} [overrides] - new properties to override in the clone.
     *
     * @example
     * const cloned = decl.clone({ prop: '-moz-' + decl.prop });
     * cloned.raws.before  //=> undefined
     * cloned.parent       //=> undefined
     * cloned.toString()   //=> -moz-transform: scale(0)
     *
     * @return {Node} clone of the node
     */


    Node.prototype.clone = function clone() {
        var overrides = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var cloned = cloneNode(this);
        for (var name in overrides) {
            cloned[name] = overrides[name];
        }
        return cloned;
    };

    /**
     * Shortcut to clone the node and insert the resulting cloned node
     * before the current node.
     *
     * @param {object} [overrides] - new properties to override in the clone.
     *
     * @example
     * decl.cloneBefore({ prop: '-moz-' + decl.prop });
     *
     * @return {Node} - new node
     */


    Node.prototype.cloneBefore = function cloneBefore() {
        var overrides = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var cloned = this.clone(overrides);
        this.parent.insertBefore(this, cloned);
        return cloned;
    };

    /**
     * Shortcut to clone the node and insert the resulting cloned node
     * after the current node.
     *
     * @param {object} [overrides] - new properties to override in the clone.
     *
     * @return {Node} - new node
     */


    Node.prototype.cloneAfter = function cloneAfter() {
        var overrides = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var cloned = this.clone(overrides);
        this.parent.insertAfter(this, cloned);
        return cloned;
    };

    /**
     * Inserts node(s) before the current node and removes the current node.
     *
     * @param {...Node} nodes - node(s) to replace current one
     *
     * @example
     * if ( atrule.name == 'mixin' ) {
     *   atrule.replaceWith(mixinRules[atrule.params]);
     * }
     *
     * @return {Node} current node to methods chain
     */


    Node.prototype.replaceWith = function replaceWith() {
        if (this.parent) {
            for (var _len = arguments.length, nodes = Array(_len), _key = 0; _key < _len; _key++) {
                nodes[_key] = arguments[_key];
            }

            for (var _iterator = nodes, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
                var _ref;

                if (_isArray) {
                    if (_i >= _iterator.length) break;
                    _ref = _iterator[_i++];
                } else {
                    _i = _iterator.next();
                    if (_i.done) break;
                    _ref = _i.value;
                }

                var node = _ref;

                this.parent.insertBefore(this, node);
            }

            this.remove();
        }

        return this;
    };

    Node.prototype.moveTo = function moveTo(newParent) {
        (0, _warnOnce2.default)('Node#moveTo was deprecated. Use Container#append.');
        this.cleanRaws(this.root() === newParent.root());
        this.remove();
        newParent.append(this);
        return this;
    };

    Node.prototype.moveBefore = function moveBefore(otherNode) {
        (0, _warnOnce2.default)('Node#moveBefore was deprecated. Use Node#before.');
        this.cleanRaws(this.root() === otherNode.root());
        this.remove();
        otherNode.parent.insertBefore(otherNode, this);
        return this;
    };

    Node.prototype.moveAfter = function moveAfter(otherNode) {
        (0, _warnOnce2.default)('Node#moveAfter was deprecated. Use Node#after.');
        this.cleanRaws(this.root() === otherNode.root());
        this.remove();
        otherNode.parent.insertAfter(otherNode, this);
        return this;
    };

    /**
     * Returns the next child of the node’s parent.
     * Returns `undefined` if the current node is the last child.
     *
     * @return {Node|undefined} next node
     *
     * @example
     * if ( comment.text === 'delete next' ) {
     *   const next = comment.next();
     *   if ( next ) {
     *     next.remove();
     *   }
     * }
     */


    Node.prototype.next = function next() {
        var index = this.parent.index(this);
        return this.parent.nodes[index + 1];
    };

    /**
     * Returns the previous child of the node’s parent.
     * Returns `undefined` if the current node is the first child.
     *
     * @return {Node|undefined} previous node
     *
     * @example
     * const annotation = decl.prev();
     * if ( annotation.type == 'comment' ) {
     *  readAnnotation(annotation.text);
     * }
     */


    Node.prototype.prev = function prev() {
        var index = this.parent.index(this);
        return this.parent.nodes[index - 1];
    };

    /**
     * Insert new node before current node to current node’s parent.
     *
     * Just alias for `node.parent.insertBefore(node, add)`.
     *
     * @param {Node|object|string|Node[]} add - new node
     *
     * @return {Node} this node for methods chain.
     *
     * @example
     * decl.before('content: ""');
     */


    Node.prototype.before = function before(add) {
        this.parent.insertBefore(this, add);
        return this;
    };

    /**
     * Insert new node after current node to current node’s parent.
     *
     * Just alias for `node.parent.insertAfter(node, add)`.
     *
     * @param {Node|object|string|Node[]} add - new node
     *
     * @return {Node} this node for methods chain.
     *
     * @example
     * decl.after('color: black');
     */


    Node.prototype.after = function after(add) {
        this.parent.insertAfter(this, add);
        return this;
    };

    Node.prototype.toJSON = function toJSON() {
        var fixed = {};

        for (var name in this) {
            if (!this.hasOwnProperty(name)) continue;
            if (name === 'parent') continue;
            var value = this[name];

            if (value instanceof Array) {
                fixed[name] = value.map(function (i) {
                    if ((typeof i === 'undefined' ? 'undefined' : _typeof(i)) === 'object' && i.toJSON) {
                        return i.toJSON();
                    } else {
                        return i;
                    }
                });
            } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && value.toJSON) {
                fixed[name] = value.toJSON();
            } else {
                fixed[name] = value;
            }
        }

        return fixed;
    };

    /**
     * Returns a {@link Node#raws} value. If the node is missing
     * the code style property (because the node was manually built or cloned),
     * PostCSS will try to autodetect the code style property by looking
     * at other nodes in the tree.
     *
     * @param {string} prop          - name of code style property
     * @param {string} [defaultType] - name of default value, it can be missed
     *                                 if the value is the same as prop
     *
     * @example
     * const root = postcss.parse('a { background: white }');
     * root.nodes[0].append({ prop: 'color', value: 'black' });
     * root.nodes[0].nodes[1].raws.before   //=> undefined
     * root.nodes[0].nodes[1].raw('before') //=> ' '
     *
     * @return {string} code style value
     */


    Node.prototype.raw = function raw(prop, defaultType) {
        var str = new _stringifier2.default();
        return str.raw(this, prop, defaultType);
    };

    /**
     * Finds the Root instance of the node’s tree.
     *
     * @example
     * root.nodes[0].nodes[0].root() === root
     *
     * @return {Root} root parent
     */


    Node.prototype.root = function root() {
        var result = this;
        while (result.parent) {
            result = result.parent;
        }return result;
    };

    Node.prototype.cleanRaws = function cleanRaws(keepBetween) {
        delete this.raws.before;
        delete this.raws.after;
        if (!keepBetween) delete this.raws.between;
    };

    Node.prototype.positionInside = function positionInside(index) {
        var string = this.toString();
        var column = this.source.start.column;
        var line = this.source.start.line;

        for (var i = 0; i < index; i++) {
            if (string[i] === '\n') {
                column = 1;
                line += 1;
            } else {
                column += 1;
            }
        }

        return { line: line, column: column };
    };

    Node.prototype.positionBy = function positionBy(opts) {
        var pos = this.source.start;
        if (opts.index) {
            pos = this.positionInside(opts.index);
        } else if (opts.word) {
            var index = this.toString().indexOf(opts.word);
            if (index !== -1) pos = this.positionInside(index);
        }
        return pos;
    };

    /**
     * @memberof Node#
     * @member {string} type - String representing the node’s type.
     *                         Possible values are `root`, `atrule`, `rule`,
     *                         `decl`, or `comment`.
     *
     * @example
     * postcss.decl({ prop: 'color', value: 'black' }).type //=> 'decl'
     */

    /**
     * @memberof Node#
     * @member {Container} parent - the node’s parent node.
     *
     * @example
     * root.nodes[0].parent == root;
     */

    /**
     * @memberof Node#
     * @member {source} source - the input source of the node
     *
     * The property is used in source map generation.
     *
     * If you create a node manually (e.g., with `postcss.decl()`),
     * that node will not have a `source` property and will be absent
     * from the source map. For this reason, the plugin developer should
     * consider cloning nodes to create new ones (in which case the new node’s
     * source will reference the original, cloned node) or setting
     * the `source` property manually.
     *
     * ```js
     * // Bad
     * const prefixed = postcss.decl({
     *   prop: '-moz-' + decl.prop,
     *   value: decl.value
     * });
     *
     * // Good
     * const prefixed = decl.clone({ prop: '-moz-' + decl.prop });
     * ```
     *
     * ```js
     * if ( atrule.name == 'add-link' ) {
     *   const rule = postcss.rule({ selector: 'a', source: atrule.source });
     *   atrule.parent.insertBefore(atrule, rule);
     * }
     * ```
     *
     * @example
     * decl.source.input.from //=> '/home/ai/a.sass'
     * decl.source.start      //=> { line: 10, column: 2 }
     * decl.source.end        //=> { line: 10, column: 12 }
     */

    /**
     * @memberof Node#
     * @member {object} raws - Information to generate byte-to-byte equal
     *                         node string as it was in the origin input.
     *
     * Every parser saves its own properties,
     * but the default CSS parser uses:
     *
     * * `before`: the space symbols before the node. It also stores `*`
     *   and `_` symbols before the declaration (IE hack).
     * * `after`: the space symbols after the last child of the node
     *   to the end of the node.
     * * `between`: the symbols between the property and value
     *   for declarations, selector and `{` for rules, or last parameter
     *   and `{` for at-rules.
     * * `semicolon`: contains true if the last child has
     *   an (optional) semicolon.
     * * `afterName`: the space between the at-rule name and its parameters.
     * * `left`: the space symbols between `/*` and the comment’s text.
     * * `right`: the space symbols between the comment’s text
     *   and <code>*&#47;</code>.
     * * `important`: the content of the important statement,
     *   if it is not just `!important`.
     *
     * PostCSS cleans selectors, declaration values and at-rule parameters
     * from comments and extra spaces, but it stores origin content in raws
     * properties. As such, if you don’t change a declaration’s value,
     * PostCSS will use the raw value with comments.
     *
     * @example
     * const root = postcss.parse('a {\n  color:black\n}')
     * root.first.first.raws //=> { before: '\n  ', between: ':' }
     */

    return Node;
}();

exports.default = Node;

/**
 * @typedef {object} position
 * @property {number} line   - source line in file
 * @property {number} column - source column in file
 */

/**
 * @typedef {object} source
 * @property {Input} input    - {@link Input} with input file
 * @property {position} start - The starting position of the node’s source
 * @property {position} end   - The ending position of the node’s source
 */

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGUuZXM2Il0sIm5hbWVzIjpbImNsb25lTm9kZSIsIm9iaiIsInBhcmVudCIsImNsb25lZCIsImNvbnN0cnVjdG9yIiwiaSIsImhhc093blByb3BlcnR5IiwidmFsdWUiLCJ0eXBlIiwiQXJyYXkiLCJtYXAiLCJqIiwiTm9kZSIsImRlZmF1bHRzIiwicmF3cyIsIkVycm9yIiwiSlNPTiIsInN0cmluZ2lmeSIsIm5hbWUiLCJlcnJvciIsIm1lc3NhZ2UiLCJvcHRzIiwic291cmNlIiwicG9zIiwicG9zaXRpb25CeSIsImlucHV0IiwibGluZSIsImNvbHVtbiIsIndhcm4iLCJyZXN1bHQiLCJ0ZXh0IiwiZGF0YSIsIm5vZGUiLCJyZW1vdmUiLCJyZW1vdmVDaGlsZCIsInVuZGVmaW5lZCIsInRvU3RyaW5nIiwic3RyaW5naWZpZXIiLCJjbG9uZSIsIm92ZXJyaWRlcyIsImNsb25lQmVmb3JlIiwiaW5zZXJ0QmVmb3JlIiwiY2xvbmVBZnRlciIsImluc2VydEFmdGVyIiwicmVwbGFjZVdpdGgiLCJub2RlcyIsIm1vdmVUbyIsIm5ld1BhcmVudCIsImNsZWFuUmF3cyIsInJvb3QiLCJhcHBlbmQiLCJtb3ZlQmVmb3JlIiwib3RoZXJOb2RlIiwibW92ZUFmdGVyIiwibmV4dCIsImluZGV4IiwicHJldiIsImJlZm9yZSIsImFkZCIsImFmdGVyIiwidG9KU09OIiwiZml4ZWQiLCJyYXciLCJwcm9wIiwiZGVmYXVsdFR5cGUiLCJzdHIiLCJrZWVwQmV0d2VlbiIsImJldHdlZW4iLCJwb3NpdGlvbkluc2lkZSIsInN0cmluZyIsInN0YXJ0Iiwid29yZCIsImluZGV4T2YiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7OztBQUVBLElBQUlBLFlBQVksU0FBWkEsU0FBWSxDQUFVQyxHQUFWLEVBQWVDLE1BQWYsRUFBdUI7QUFDbkMsUUFBSUMsU0FBUyxJQUFJRixJQUFJRyxXQUFSLEVBQWI7O0FBRUEsU0FBTSxJQUFJ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Q2IsWUFBSUUsTUFBTSxLQUFLRCxNQUFMLENBQVlnRCxLQUF0QjtBQUNBLFlBQUtqRCxLQUFLa0MsS0FBVixFQUFrQjtBQUNkaEMsa0JBQU0sS0FBSzZDLGNBQUwsQ0FBb0IvQyxLQUFLa0MsS0FBekIsQ0FBTjtBQUNILFNBRkQsTUFFTyxJQUFLbEMsS0FBS2tELElBQVYsRUFBaUI7QUFDcEIsZ0JBQUloQixRQUFRLEtBQUtuQixRQUFMLEdBQWdCb0MsT0FBaEIsQ0FBd0JuRCxLQUFLa0QsSUFBN0IsQ0FBWjtBQUNBLGdCQUFLaEIsVUFBVSxDQUFDLENBQWhCLEVBQW9CaEMsTUFBTSxLQUFLNkMsY0FBTCxDQUFvQmIsS0FBcEIsQ0FBTjtBQUN2QjtBQUNELGVBQU9oQyxHQUFQO0FBQ0gsSzs7QUFFRDs7Ozs7Ozs7OztBQVVBOzs7Ozs7OztBQVFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBcUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2tCQW9DV1gsSTs7QUFFZjs7Ozs7O0FBTUEiLCJmaWxlIjoibm9kZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBDc3NTeW50YXhFcnJvciBmcm9tICcuL2Nzcy1zeW50YXgtZXJyb3InO1xuaW1wb3J0IFN0cmluZ2lmaWVyICAgIGZyb20gJy4vc3RyaW5naWZpZXInO1xuaW1wb3J0IHN0cmluZ2lmeSAgICAgIGZyb20gJy4vc3RyaW5naWZ5JztcbmltcG9ydCB3YXJuT25jZSAgICAgICBmcm9tICcuL3dhcm4tb25jZSc7XG5cbmxldCBjbG9uZU5vZGUgPSBmdW5jdGlvbiAob2JqLCBwYXJlbnQpIHtcbiAgICBsZXQgY2xvbmVkID0gbmV3IG9iai5jb25zdHJ1Y3RvcigpO1xuXG4gICAgZm9yICggbGV0IGkgaW4gb2JqICkge1xuICAgICAgICBpZiAoICFvYmouaGFzT3duUHJvcGVydHkoaSkgKSBjb250aW51ZTtcbiAgICAgICAgbGV0IHZhbHVlID0gb2JqW2ldO1xuICAgICAgICBsZXQgdHlwZSAgPSB0eXBlb2YgdmFsdWU7XG5cbiAgICAgICAgaWYgKCBpID09PSAncGFyZW50JyAmJiB0eXBlID09PSAnb2JqZWN0JyApIHtcbiAgICAgICAgICAgIGlmIChwYXJlbnQpIGNsb25lZFtpXSA9IHBhcmVudDtcbiAgICAgICAgfSBlbHNlIGlmICggaSA9PT0gJ3NvdXJjZScgKSB7XG4gICAgICAgICAgICBjbG9uZWRbaV0gPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmICggdmFsdWUgaW5zdGFuY2VvZiBBcnJheSApIHtcbiAgICAgICAgICAgIGNsb25lZFtpXSA9IHZhbHVlLm1hcCggaiA9PiBjbG9uZU5vZGUoaiwgY2xvbmVkKSApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCB0eXBlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCApIHZhbHVlID0gY2xvbmVOb2RlKHZhbHVlKTtcbiAgICAgICAgICAgIGNsb25lZFtpXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsb25lZDtcbn07XG5cbi8qKlxuICogQWxsIG5vZGUgY2xhc3NlcyBpbmhlcml0IHRoZSBmb2xsb3dpbmcgY29tbW9uIG1ldGhvZHMuXG4gKlxuICogQGFic3RyYWN0XG4gKi9cbmNsYXNzIE5vZGUge1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtkZWZhdWx0c10gLSB2YWx1ZSBmb3Igbm9kZSBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoZGVmYXVsdHMgPSB7IH0pIHtcbiAgICAgICAgdGhpcy5yYXdzID0geyB9O1xuICAgICAgICBpZiAoIHR5cGVvZiBkZWZhdWx0cyAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIGRlZmF1bHRzICE9PSAndW5kZWZpbmVkJyApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAnUG9zdENTUyBub2RlcyBjb25zdHJ1Y3RvciBhY2NlcHRzIG9iamVjdCwgbm90ICcgK1xuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGRlZmF1bHRzKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICggbGV0IG5hbWUgaW4gZGVmYXVsdHMgKSB7XG4gICAgICAgICAgICB0aGlzW25hbWVdID0gZGVmYXVsdHNbbmFtZV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgQ3NzU3ludGF4RXJyb3IgaW5zdGFuY2UgY29udGFpbmluZyB0aGUgb3JpZ2luYWwgcG9zaXRpb25cbiAgICAgKiBvZiB0aGUgbm9kZSBpbiB0aGUgc291cmNlLCBzaG93aW5nIGxpbmUgYW5kIGNvbHVtbiBudW1iZXJzIGFuZCBhbHNvXG4gICAgICogYSBzbWFsbCBleGNlcnB0IHRvIGZhY2lsaXRhdGUgZGVidWdnaW5nLlxuICAgICAqXG4gICAgICogSWYgcHJlc2VudCwgYW4gaW5wdXQgc291cmNlIG1hcCB3aWxsIGJlIHVzZWQgdG8gZ2V0IHRoZSBvcmlnaW5hbCBwb3NpdGlvblxuICAgICAqIG9mIHRoZSBzb3VyY2UsIGV2ZW4gZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uIHN0ZXBcbiAgICAgKiAoZS5nLiwgZnJvbSBTYXNzIGNvbXBpbGF0aW9uKS5cbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIHByb2R1Y2VzIHZlcnkgdXNlZnVsIGVycm9yIG1lc3NhZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgICAgIC0gZXJyb3IgZGVzY3JpcHRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdHNdICAgICAgLSBvcHRpb25zXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMucGx1Z2luIC0gcGx1Z2luIG5hbWUgdGhhdCBjcmVhdGVkIHRoaXMgZXJyb3IuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zdENTUyB3aWxsIHNldCBpdCBhdXRvbWF0aWNhbGx5LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLndvcmQgICAtIGEgd29yZCBpbnNpZGUgYSBub2Rl4oCZcyBzdHJpbmcgdGhhdCBzaG91bGRcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZSBoaWdobGlnaHRlZCBhcyB0aGUgc291cmNlIG9mIHRoZSBlcnJvclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBvcHRzLmluZGV4ICAtIGFuIGluZGV4IGluc2lkZSBhIG5vZGXigJlzIHN0cmluZyB0aGF0IHNob3VsZFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlIGhpZ2hsaWdodGVkIGFzIHRoZSBzb3VyY2Ugb2YgdGhlIGVycm9yXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtDc3NTeW50YXhFcnJvcn0gZXJyb3Igb2JqZWN0IHRvIHRocm93IGl0XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGlmICggIXZhcmlhYmxlc1tuYW1lXSApIHtcbiAgICAgKiAgIHRocm93IGRlY2wuZXJyb3IoJ1Vua25vd24gdmFyaWFibGUgJyArIG5hbWUsIHsgd29yZDogbmFtZSB9KTtcbiAgICAgKiAgIC8vIENzc1N5bnRheEVycm9yOiBwb3N0Y3NzLXZhcnM6YS5zYXNzOjQ6MzogVW5rbm93biB2YXJpYWJsZSAkYmxhY2tcbiAgICAgKiAgIC8vICAgY29sb3I6ICRibGFja1xuICAgICAqICAgLy8gYVxuICAgICAqICAgLy8gICAgICAgICAgXlxuICAgICAqICAgLy8gICBiYWNrZ3JvdW5kOiB3aGl0ZVxuICAgICAqIH1cbiAgICAgKi9cbiAgICBlcnJvcihtZXNzYWdlLCBvcHRzID0geyB9KSB7XG4gICAgICAgIGlmICggdGhpcy5zb3VyY2UgKSB7XG4gICAgICAgICAgICBsZXQgcG9zID0gdGhpcy5wb3NpdGlvbkJ5KG9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc291cmNlLmlucHV0LmVycm9yKG1lc3NhZ2UsIHBvcy5saW5lLCBwb3MuY29sdW1uLCBvcHRzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ3NzU3ludGF4RXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBwcm92aWRlZCBhcyBhIGNvbnZlbmllbmNlIHdyYXBwZXIgZm9yIHtAbGluayBSZXN1bHQjd2Fybn0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1Jlc3VsdH0gcmVzdWx0ICAgICAgLSB0aGUge0BsaW5rIFJlc3VsdH0gaW5zdGFuY2VcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgd2FybmluZ1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0ICAgICAgICAtIHdhcm5pbmcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0c10gICAgICAtIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5wbHVnaW4gLSBwbHVnaW4gbmFtZSB0aGF0IGNyZWF0ZWQgdGhpcyB3YXJuaW5nLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc3RDU1Mgd2lsbCBzZXQgaXQgYXV0b21hdGljYWxseS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy53b3JkICAgLSBhIHdvcmQgaW5zaWRlIGEgbm9kZeKAmXMgc3RyaW5nIHRoYXQgc2hvdWxkXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmUgaGlnaGxpZ2h0ZWQgYXMgdGhlIHNvdXJjZSBvZiB0aGUgd2FybmluZ1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBvcHRzLmluZGV4ICAtIGFuIGluZGV4IGluc2lkZSBhIG5vZGXigJlzIHN0cmluZyB0aGF0IHNob3VsZFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlIGhpZ2hsaWdodGVkIGFzIHRoZSBzb3VyY2Ugb2YgdGhlIHdhcm5pbmdcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge1dhcm5pbmd9IGNyZWF0ZWQgd2FybmluZyBvYmplY3RcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogY29uc3QgcGx1Z2luID0gcG9zdGNzcy5wbHVnaW4oJ3Bvc3Rjc3MtZGVwcmVjYXRlZCcsICgpID0+IHtcbiAgICAgKiAgIHJldHVybiAocm9vdCwgcmVzdWx0KSA9PiB7XG4gICAgICogICAgIHJvb3Qud2Fsa0RlY2xzKCdiYWQnLCBkZWNsID0+IHtcbiAgICAgKiAgICAgICBkZWNsLndhcm4ocmVzdWx0LCAnRGVwcmVjYXRlZCBwcm9wZXJ0eSBiYWQnKTtcbiAgICAgKiAgICAgfSk7XG4gICAgICogICB9O1xuICAgICAqIH0pO1xuICAgICAqL1xuICAgIHdhcm4ocmVzdWx0LCB0ZXh0LCBvcHRzKSB7XG4gICAgICAgIGxldCBkYXRhID0geyBub2RlOiB0aGlzIH07XG4gICAgICAgIGZvciAoIGxldCBpIGluIG9wdHMgKSBkYXRhW2ldID0gb3B0c1tpXTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC53YXJuKHRleHQsIGRhdGEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIG5vZGUgZnJvbSBpdHMgcGFyZW50IGFuZCBjbGVhbnMgdGhlIHBhcmVudCBwcm9wZXJ0aWVzXG4gICAgICogZnJvbSB0aGUgbm9kZSBhbmQgaXRzIGNoaWxkcmVuLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBpZiAoIGRlY2wucHJvcC5tYXRjaCgvXi13ZWJraXQtLykgKSB7XG4gICAgICogICBkZWNsLnJlbW92ZSgpO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge05vZGV9IG5vZGUgdG8gbWFrZSBjYWxscyBjaGFpblxuICAgICAqL1xuICAgIHJlbW92ZSgpIHtcbiAgICAgICAgaWYgKCB0aGlzLnBhcmVudCApIHtcbiAgICAgICAgICAgIHRoaXMucGFyZW50LnJlbW92ZUNoaWxkKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucGFyZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgQ1NTIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIG5vZGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ2lmaWVyfHN5bnRheH0gW3N0cmluZ2lmaWVyXSAtIGEgc3ludGF4IHRvIHVzZVxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW4gc3RyaW5nIGdlbmVyYXRpb25cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gQ1NTIHN0cmluZyBvZiB0aGlzIG5vZGVcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcG9zdGNzcy5ydWxlKHsgc2VsZWN0b3I6ICdhJyB9KS50b1N0cmluZygpIC8vPT4gXCJhIHt9XCJcbiAgICAgKi9cbiAgICB0b1N0cmluZyhzdHJpbmdpZmllciA9IHN0cmluZ2lmeSkge1xuICAgICAgICBpZiAoIHN0cmluZ2lmaWVyLnN0cmluZ2lmeSApIHN0cmluZ2lmaWVyID0gc3RyaW5naWZpZXIuc3RyaW5naWZ5O1xuICAgICAgICBsZXQgcmVzdWx0ICA9ICcnO1xuICAgICAgICBzdHJpbmdpZmllcih0aGlzLCBpID0+IHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgY2xvbmUgb2YgdGhlIG5vZGUuXG4gICAgICpcbiAgICAgKiBUaGUgcmVzdWx0aW5nIGNsb25lZCBub2RlIGFuZCBpdHMgKGNsb25lZCkgY2hpbGRyZW4gd2lsbCBoYXZlXG4gICAgICogYSBjbGVhbiBwYXJlbnQgYW5kIGNvZGUgc3R5bGUgcHJvcGVydGllcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3ZlcnJpZGVzXSAtIG5ldyBwcm9wZXJ0aWVzIHRvIG92ZXJyaWRlIGluIHRoZSBjbG9uZS5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogY29uc3QgY2xvbmVkID0gZGVjbC5jbG9uZSh7IHByb3A6ICctbW96LScgKyBkZWNsLnByb3AgfSk7XG4gICAgICogY2xvbmVkLnJhd3MuYmVmb3JlICAvLz0+IHVuZGVmaW5lZFxuICAgICAqIGNsb25lZC5wYXJlbnQgICAgICAgLy89PiB1bmRlZmluZWRcbiAgICAgKiBjbG9uZWQudG9TdHJpbmcoKSAgIC8vPT4gLW1vei10cmFuc2Zvcm06IHNjYWxlKDApXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtOb2RlfSBjbG9uZSBvZiB0aGUgbm9kZVxuICAgICAqL1xuICAgIGNsb25lKG92ZXJyaWRlcyA9IHsgfSkge1xuICAgICAgICBsZXQgY2xvbmVkID0gY2xvbmVOb2RlKHRoaXMpO1xuICAgICAgICBmb3IgKCBsZXQgbmFtZSBpbiBvdmVycmlkZXMgKSB7XG4gICAgICAgICAgICBjbG9uZWRbbmFtZV0gPSBvdmVycmlkZXNbbmFtZV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsb25lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaG9ydGN1dCB0byBjbG9uZSB0aGUgbm9kZSBhbmQgaW5zZXJ0IHRoZSByZXN1bHRpbmcgY2xvbmVkIG5vZGVcbiAgICAgKiBiZWZvcmUgdGhlIGN1cnJlbnQgbm9kZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3ZlcnJpZGVzXSAtIG5ldyBwcm9wZXJ0aWVzIHRvIG92ZXJyaWRlIGluIHRoZSBjbG9uZS5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogZGVjbC5jbG9uZUJlZm9yZSh7IHByb3A6ICctbW96LScgKyBkZWNsLnByb3AgfSk7XG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtOb2RlfSAtIG5ldyBub2RlXG4gICAgICovXG4gICAgY2xvbmVCZWZvcmUob3ZlcnJpZGVzID0geyB9KSB7XG4gICAgICAgIGxldCBjbG9uZWQgPSB0aGlzLmNsb25lKG92ZXJyaWRlcyk7XG4gICAgICAgIHRoaXMucGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLCBjbG9uZWQpO1xuICAgICAgICByZXR1cm4gY2xvbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNob3J0Y3V0IHRvIGNsb25lIHRoZSBub2RlIGFuZCBpbnNlcnQgdGhlIHJlc3VsdGluZyBjbG9uZWQgbm9kZVxuICAgICAqIGFmdGVyIHRoZSBjdXJyZW50IG5vZGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW292ZXJyaWRlc10gLSBuZXcgcHJvcGVydGllcyB0byBvdmVycmlkZSBpbiB0aGUgY2xvbmUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtOb2RlfSAtIG5ldyBub2RlXG4gICAgICovXG4gICAgY2xvbmVBZnRlcihvdmVycmlkZXMgPSB7IH0pIHtcbiAgICAgICAgbGV0IGNsb25lZCA9IHRoaXMuY2xvbmUob3ZlcnJpZGVzKTtcbiAgICAgICAgdGhpcy5wYXJlbnQuaW5zZXJ0QWZ0ZXIodGhpcywgY2xvbmVkKTtcbiAgICAgICAgcmV0dXJuIGNsb25lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbnNlcnRzIG5vZGUocykgYmVmb3JlIHRoZSBjdXJyZW50IG5vZGUgYW5kIHJlbW92ZXMgdGhlIGN1cnJlbnQgbm9kZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Li4uTm9kZX0gbm9kZXMgLSBub2RlKHMpIHRvIHJlcGxhY2UgY3VycmVudCBvbmVcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogaWYgKCBhdHJ1bGUubmFtZSA9PSAnbWl4aW4nICkge1xuICAgICAqICAgYXRydWxlLnJlcGxhY2VXaXRoKG1peGluUnVsZXNbYXRydWxlLnBhcmFtc10pO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge05vZGV9IGN1cnJlbnQgbm9kZSB0byBtZXRob2RzIGNoYWluXG4gICAgICovXG4gICAgcmVwbGFjZVdpdGgoLi4ubm9kZXMpIHtcbiAgICAgICAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMsIG5vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgbW92ZVRvKG5ld1BhcmVudCkge1xuICAgICAgICB3YXJuT25jZSgnTm9kZSNtb3ZlVG8gd2FzIGRlcHJlY2F0ZWQuIFVzZSBDb250YWluZXIjYXBwZW5kLicpO1xuICAgICAgICB0aGlzLmNsZWFuUmF3cyh0aGlzLnJvb3QoKSA9PT0gbmV3UGFyZW50LnJvb3QoKSk7XG4gICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgIG5ld1BhcmVudC5hcHBlbmQodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIG1vdmVCZWZvcmUob3RoZXJOb2RlKSB7XG4gICAgICAgIHdhcm5PbmNlKCdOb2RlI21vdmVCZWZvcmUgd2FzIGRlcHJlY2F0ZWQuIFVzZSBOb2RlI2JlZm9yZS4nKTtcbiAgICAgICAgdGhpcy5jbGVhblJhd3ModGhpcy5yb290KCkgPT09IG90aGVyTm9kZS5yb290KCkpO1xuICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICBvdGhlck5vZGUucGFyZW50Lmluc2VydEJlZm9yZShvdGhlck5vZGUsIHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBtb3ZlQWZ0ZXIob3RoZXJOb2RlKSB7XG4gICAgICAgIHdhcm5PbmNlKCdOb2RlI21vdmVBZnRlciB3YXMgZGVwcmVjYXRlZC4gVXNlIE5vZGUjYWZ0ZXIuJyk7XG4gICAgICAgIHRoaXMuY2xlYW5SYXdzKHRoaXMucm9vdCgpID09PSBvdGhlck5vZGUucm9vdCgpKTtcbiAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgb3RoZXJOb2RlLnBhcmVudC5pbnNlcnRBZnRlcihvdGhlck5vZGUsIHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBuZXh0IGNoaWxkIG9mIHRoZSBub2Rl4oCZcyBwYXJlbnQuXG4gICAgICogUmV0dXJucyBgdW5kZWZpbmVkYCBpZiB0aGUgY3VycmVudCBub2RlIGlzIHRoZSBsYXN0IGNoaWxkLlxuICAgICAqXG4gICAgICogQHJldHVybiB7Tm9kZXx1bmRlZmluZWR9IG5leHQgbm9kZVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBpZiAoIGNvbW1lbnQudGV4dCA9PT0gJ2RlbGV0ZSBuZXh0JyApIHtcbiAgICAgKiAgIGNvbnN0IG5leHQgPSBjb21tZW50Lm5leHQoKTtcbiAgICAgKiAgIGlmICggbmV4dCApIHtcbiAgICAgKiAgICAgbmV4dC5yZW1vdmUoKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9XG4gICAgICovXG4gICAgbmV4dCgpIHtcbiAgICAgICAgbGV0IGluZGV4ID0gdGhpcy5wYXJlbnQuaW5kZXgodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5ub2Rlc1tpbmRleCArIDFdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHByZXZpb3VzIGNoaWxkIG9mIHRoZSBub2Rl4oCZcyBwYXJlbnQuXG4gICAgICogUmV0dXJucyBgdW5kZWZpbmVkYCBpZiB0aGUgY3VycmVudCBub2RlIGlzIHRoZSBmaXJzdCBjaGlsZC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge05vZGV8dW5kZWZpbmVkfSBwcmV2aW91cyBub2RlXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IGFubm90YXRpb24gPSBkZWNsLnByZXYoKTtcbiAgICAgKiBpZiAoIGFubm90YXRpb24udHlwZSA9PSAnY29tbWVudCcgKSB7XG4gICAgICogIHJlYWRBbm5vdGF0aW9uKGFubm90YXRpb24udGV4dCk7XG4gICAgICogfVxuICAgICAqL1xuICAgIHByZXYoKSB7XG4gICAgICAgIGxldCBpbmRleCA9IHRoaXMucGFyZW50LmluZGV4KHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubm9kZXNbaW5kZXggLSAxXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbnNlcnQgbmV3IG5vZGUgYmVmb3JlIGN1cnJlbnQgbm9kZSB0byBjdXJyZW50IG5vZGXigJlzIHBhcmVudC5cbiAgICAgKlxuICAgICAqIEp1c3QgYWxpYXMgZm9yIGBub2RlLnBhcmVudC5pbnNlcnRCZWZvcmUobm9kZSwgYWRkKWAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge05vZGV8b2JqZWN0fHN0cmluZ3xOb2RlW119IGFkZCAtIG5ldyBub2RlXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtOb2RlfSB0aGlzIG5vZGUgZm9yIG1ldGhvZHMgY2hhaW4uXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGRlY2wuYmVmb3JlKCdjb250ZW50OiBcIlwiJyk7XG4gICAgICovXG4gICAgYmVmb3JlKGFkZCkge1xuICAgICAgICB0aGlzLnBhcmVudC5pbnNlcnRCZWZvcmUodGhpcywgYWRkKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0IG5ldyBub2RlIGFmdGVyIGN1cnJlbnQgbm9kZSB0byBjdXJyZW50IG5vZGXigJlzIHBhcmVudC5cbiAgICAgKlxuICAgICAqIEp1c3QgYWxpYXMgZm9yIGBub2RlLnBhcmVudC5pbnNlcnRBZnRlcihub2RlLCBhZGQpYC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Tm9kZXxvYmplY3R8c3RyaW5nfE5vZGVbXX0gYWRkIC0gbmV3IG5vZGVcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge05vZGV9IHRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpbi5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogZGVjbC5hZnRlcignY29sb3I6IGJsYWNrJyk7XG4gICAgICovXG4gICAgYWZ0ZXIoYWRkKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lmluc2VydEFmdGVyKHRoaXMsIGFkZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHRvSlNPTigpIHtcbiAgICAgICAgbGV0IGZpeGVkID0geyB9O1xuXG4gICAgICAgIGZvciAoIGxldCBuYW1lIGluIHRoaXMgKSB7XG4gICAgICAgICAgICBpZiAoICF0aGlzLmhhc093blByb3BlcnR5KG5hbWUpICkgY29udGludWU7XG4gICAgICAgICAgICBpZiAoIG5hbWUgPT09ICdwYXJlbnQnICkgY29udGludWU7XG4gICAgICAgICAgICBsZXQgdmFsdWUgPSB0aGlzW25hbWVdO1xuXG4gICAgICAgICAgICBpZiAoIHZhbHVlIGluc3RhbmNlb2YgQXJyYXkgKSB7XG4gICAgICAgICAgICAgICAgZml4ZWRbbmFtZV0gPSB2YWx1ZS5tYXAoIGkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIHR5cGVvZiBpID09PSAnb2JqZWN0JyAmJiBpLnRvSlNPTiApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpLnRvSlNPTigpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUudG9KU09OICkge1xuICAgICAgICAgICAgICAgIGZpeGVkW25hbWVdID0gdmFsdWUudG9KU09OKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpeGVkW25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZml4ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIHtAbGluayBOb2RlI3Jhd3N9IHZhbHVlLiBJZiB0aGUgbm9kZSBpcyBtaXNzaW5nXG4gICAgICogdGhlIGNvZGUgc3R5bGUgcHJvcGVydHkgKGJlY2F1c2UgdGhlIG5vZGUgd2FzIG1hbnVhbGx5IGJ1aWx0IG9yIGNsb25lZCksXG4gICAgICogUG9zdENTUyB3aWxsIHRyeSB0byBhdXRvZGV0ZWN0IHRoZSBjb2RlIHN0eWxlIHByb3BlcnR5IGJ5IGxvb2tpbmdcbiAgICAgKiBhdCBvdGhlciBub2RlcyBpbiB0aGUgdHJlZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wICAgICAgICAgIC0gbmFtZSBvZiBjb2RlIHN0eWxlIHByb3BlcnR5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtkZWZhdWx0VHlwZV0gLSBuYW1lIG9mIGRlZmF1bHQgdmFsdWUsIGl0IGNhbiBiZSBtaXNzZWRcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIHRoZSB2YWx1ZSBpcyB0aGUgc2FtZSBhcyBwcm9wXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IHJvb3QgPSBwb3N0Y3NzLnBhcnNlKCdhIHsgYmFja2dyb3VuZDogd2hpdGUgfScpO1xuICAgICAqIHJvb3Qubm9kZXNbMF0uYXBwZW5kKHsgcHJvcDogJ2NvbG9yJywgdmFsdWU6ICdibGFjaycgfSk7XG4gICAgICogcm9vdC5ub2Rlc1swXS5ub2Rlc1sxXS5yYXdzLmJlZm9yZSAgIC8vPT4gdW5kZWZpbmVkXG4gICAgICogcm9vdC5ub2Rlc1swXS5ub2Rlc1sxXS5yYXcoJ2JlZm9yZScpIC8vPT4gJyAnXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IGNvZGUgc3R5bGUgdmFsdWVcbiAgICAgKi9cbiAgICByYXcocHJvcCwgZGVmYXVsdFR5cGUpIHtcbiAgICAgICAgbGV0IHN0ciA9IG5ldyBTdHJpbmdpZmllcigpO1xuICAgICAgICByZXR1cm4gc3RyLnJhdyh0aGlzLCBwcm9wLCBkZWZhdWx0VHlwZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmluZHMgdGhlIFJvb3QgaW5zdGFuY2Ugb2YgdGhlIG5vZGXigJlzIHRyZWUuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHJvb3Qubm9kZXNbMF0ubm9kZXNbMF0ucm9vdCgpID09PSByb290XG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtSb290fSByb290IHBhcmVudFxuICAgICAqL1xuICAgIHJvb3QoKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSB0aGlzO1xuICAgICAgICB3aGlsZSAoIHJlc3VsdC5wYXJlbnQgKSByZXN1bHQgPSByZXN1bHQucGFyZW50O1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGNsZWFuUmF3cyhrZWVwQmV0d2Vlbikge1xuICAgICAgICBkZWxldGUgdGhpcy5yYXdzLmJlZm9yZTtcbiAgICAgICAgZGVsZXRlIHRoaXMucmF3cy5hZnRlcjtcbiAgICAgICAgaWYgKCAha2VlcEJldHdlZW4gKSBkZWxldGUgdGhpcy5yYXdzLmJldHdlZW47XG4gICAgfVxuXG4gICAgcG9zaXRpb25JbnNpZGUoaW5kZXgpIHtcbiAgICAgICAgbGV0IHN0cmluZyA9IHRoaXMudG9TdHJpbmcoKTtcbiAgICAgICAgbGV0IGNvbHVtbiA9IHRoaXMuc291cmNlLnN0YXJ0LmNvbHVtbjtcbiAgICAgICAgbGV0IGxpbmUgICA9IHRoaXMuc291cmNlLnN0YXJ0LmxpbmU7XG5cbiAgICAgICAgZm9yICggbGV0IGkgPSAwOyBpIDwgaW5kZXg7IGkrKyApIHtcbiAgICAgICAgICAgIGlmICggc3RyaW5nW2ldID09PSAnXFxuJyApIHtcbiAgICAgICAgICAgICAgICBjb2x1bW4gPSAxO1xuICAgICAgICAgICAgICAgIGxpbmUgICs9IDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbHVtbiArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHsgbGluZSwgY29sdW1uIH07XG4gICAgfVxuXG4gICAgcG9zaXRpb25CeShvcHRzKSB7XG4gICAgICAgIGxldCBwb3MgPSB0aGlzLnNvdXJjZS5zdGFydDtcbiAgICAgICAgaWYgKCBvcHRzLmluZGV4ICkge1xuICAgICAgICAgICAgcG9zID0gdGhpcy5wb3NpdGlvbkluc2lkZShvcHRzLmluZGV4KTtcbiAgICAgICAgfSBlbHNlIGlmICggb3B0cy53b3JkICkge1xuICAgICAgICAgICAgbGV0IGluZGV4ID0gdGhpcy50b1N0cmluZygpLmluZGV4T2Yob3B0cy53b3JkKTtcbiAgICAgICAgICAgIGlmICggaW5kZXggIT09IC0xICkgcG9zID0gdGhpcy5wb3NpdGlvbkluc2lkZShpbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBvcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyb2YgTm9kZSNcbiAgICAgKiBAbWVtYmVyIHtzdHJpbmd9IHR5cGUgLSBTdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBub2Rl4oCZcyB0eXBlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgYHJvb3RgLCBgYXRydWxlYCwgYHJ1bGVgLFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgIGBkZWNsYCwgb3IgYGNvbW1lbnRgLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBwb3N0Y3NzLmRlY2woeyBwcm9wOiAnY29sb3InLCB2YWx1ZTogJ2JsYWNrJyB9KS50eXBlIC8vPT4gJ2RlY2wnXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyb2YgTm9kZSNcbiAgICAgKiBAbWVtYmVyIHtDb250YWluZXJ9IHBhcmVudCAtIHRoZSBub2Rl4oCZcyBwYXJlbnQgbm9kZS5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcm9vdC5ub2Rlc1swXS5wYXJlbnQgPT0gcm9vdDtcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJvZiBOb2RlI1xuICAgICAqIEBtZW1iZXIge3NvdXJjZX0gc291cmNlIC0gdGhlIGlucHV0IHNvdXJjZSBvZiB0aGUgbm9kZVxuICAgICAqXG4gICAgICogVGhlIHByb3BlcnR5IGlzIHVzZWQgaW4gc291cmNlIG1hcCBnZW5lcmF0aW9uLlxuICAgICAqXG4gICAgICogSWYgeW91IGNyZWF0ZSBhIG5vZGUgbWFudWFsbHkgKGUuZy4sIHdpdGggYHBvc3Rjc3MuZGVjbCgpYCksXG4gICAgICogdGhhdCBub2RlIHdpbGwgbm90IGhhdmUgYSBgc291cmNlYCBwcm9wZXJ0eSBhbmQgd2lsbCBiZSBhYnNlbnRcbiAgICAgKiBmcm9tIHRoZSBzb3VyY2UgbWFwLiBGb3IgdGhpcyByZWFzb24sIHRoZSBwbHVnaW4gZGV2ZWxvcGVyIHNob3VsZFxuICAgICAqIGNvbnNpZGVyIGNsb25pbmcgbm9kZXMgdG8gY3JlYXRlIG5ldyBvbmVzIChpbiB3aGljaCBjYXNlIHRoZSBuZXcgbm9kZeKAmXNcbiAgICAgKiBzb3VyY2Ugd2lsbCByZWZlcmVuY2UgdGhlIG9yaWdpbmFsLCBjbG9uZWQgbm9kZSkgb3Igc2V0dGluZ1xuICAgICAqIHRoZSBgc291cmNlYCBwcm9wZXJ0eSBtYW51YWxseS5cbiAgICAgKlxuICAgICAqIGBgYGpzXG4gICAgICogLy8gQmFkXG4gICAgICogY29uc3QgcHJlZml4ZWQgPSBwb3N0Y3NzLmRlY2woe1xuICAgICAqICAgcHJvcDogJy1tb3otJyArIGRlY2wucHJvcCxcbiAgICAgKiAgIHZhbHVlOiBkZWNsLnZhbHVlXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBHb29kXG4gICAgICogY29uc3QgcHJlZml4ZWQgPSBkZWNsLmNsb25lKHsgcHJvcDogJy1tb3otJyArIGRlY2wucHJvcCB9KTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIGBgYGpzXG4gICAgICogaWYgKCBhdHJ1bGUubmFtZSA9PSAnYWRkLWxpbmsnICkge1xuICAgICAqICAgY29uc3QgcnVsZSA9IHBvc3Rjc3MucnVsZSh7IHNlbGVjdG9yOiAnYScsIHNvdXJjZTogYXRydWxlLnNvdXJjZSB9KTtcbiAgICAgKiAgIGF0cnVsZS5wYXJlbnQuaW5zZXJ0QmVmb3JlKGF0cnVsZSwgcnVsZSk7XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBkZWNsLnNvdXJjZS5pbnB1dC5mcm9tIC8vPT4gJy9ob21lL2FpL2Euc2FzcydcbiAgICAgKiBkZWNsLnNvdXJjZS5zdGFydCAgICAgIC8vPT4geyBsaW5lOiAxMCwgY29sdW1uOiAyIH1cbiAgICAgKiBkZWNsLnNvdXJjZS5lbmQgICAgICAgIC8vPT4geyBsaW5lOiAxMCwgY29sdW1uOiAxMiB9XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyb2YgTm9kZSNcbiAgICAgKiBAbWVtYmVyIHtvYmplY3R9IHJhd3MgLSBJbmZvcm1hdGlvbiB0byBnZW5lcmF0ZSBieXRlLXRvLWJ5dGUgZXF1YWxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICBub2RlIHN0cmluZyBhcyBpdCB3YXMgaW4gdGhlIG9yaWdpbiBpbnB1dC5cbiAgICAgKlxuICAgICAqIEV2ZXJ5IHBhcnNlciBzYXZlcyBpdHMgb3duIHByb3BlcnRpZXMsXG4gICAgICogYnV0IHRoZSBkZWZhdWx0IENTUyBwYXJzZXIgdXNlczpcbiAgICAgKlxuICAgICAqICogYGJlZm9yZWA6IHRoZSBzcGFjZSBzeW1ib2xzIGJlZm9yZSB0aGUgbm9kZS4gSXQgYWxzbyBzdG9yZXMgYCpgXG4gICAgICogICBhbmQgYF9gIHN5bWJvbHMgYmVmb3JlIHRoZSBkZWNsYXJhdGlvbiAoSUUgaGFjaykuXG4gICAgICogKiBgYWZ0ZXJgOiB0aGUgc3BhY2Ugc3ltYm9scyBhZnRlciB0aGUgbGFzdCBjaGlsZCBvZiB0aGUgbm9kZVxuICAgICAqICAgdG8gdGhlIGVuZCBvZiB0aGUgbm9kZS5cbiAgICAgKiAqIGBiZXR3ZWVuYDogdGhlIHN5bWJvbHMgYmV0d2VlbiB0aGUgcHJvcGVydHkgYW5kIHZhbHVlXG4gICAgICogICBmb3IgZGVjbGFyYXRpb25zLCBzZWxlY3RvciBhbmQgYHtgIGZvciBydWxlcywgb3IgbGFzdCBwYXJhbWV0ZXJcbiAgICAgKiAgIGFuZCBge2AgZm9yIGF0LXJ1bGVzLlxuICAgICAqICogYHNlbWljb2xvbmA6IGNvbnRhaW5zIHRydWUgaWYgdGhlIGxhc3QgY2hpbGQgaGFzXG4gICAgICogICBhbiAob3B0aW9uYWwpIHNlbWljb2xvbi5cbiAgICAgKiAqIGBhZnRlck5hbWVgOiB0aGUgc3BhY2UgYmV0d2VlbiB0aGUgYXQtcnVsZSBuYW1lIGFuZCBpdHMgcGFyYW1ldGVycy5cbiAgICAgKiAqIGBsZWZ0YDogdGhlIHNwYWNlIHN5bWJvbHMgYmV0d2VlbiBgLypgIGFuZCB0aGUgY29tbWVudOKAmXMgdGV4dC5cbiAgICAgKiAqIGByaWdodGA6IHRoZSBzcGFjZSBzeW1ib2xzIGJldHdlZW4gdGhlIGNvbW1lbnTigJlzIHRleHRcbiAgICAgKiAgIGFuZCA8Y29kZT4qJiM0Nzs8L2NvZGU+LlxuICAgICAqICogYGltcG9ydGFudGA6IHRoZSBjb250ZW50IG9mIHRoZSBpbXBvcnRhbnQgc3RhdGVtZW50LFxuICAgICAqICAgaWYgaXQgaXMgbm90IGp1c3QgYCFpbXBvcnRhbnRgLlxuICAgICAqXG4gICAgICogUG9zdENTUyBjbGVhbnMgc2VsZWN0b3JzLCBkZWNsYXJhdGlvbiB2YWx1ZXMgYW5kIGF0LXJ1bGUgcGFyYW1ldGVyc1xuICAgICAqIGZyb20gY29tbWVudHMgYW5kIGV4dHJhIHNwYWNlcywgYnV0IGl0IHN0b3JlcyBvcmlnaW4gY29udGVudCBpbiByYXdzXG4gICAgICogcHJvcGVydGllcy4gQXMgc3VjaCwgaWYgeW91IGRvbuKAmXQgY2hhbmdlIGEgZGVjbGFyYXRpb27igJlzIHZhbHVlLFxuICAgICAqIFBvc3RDU1Mgd2lsbCB1c2UgdGhlIHJhdyB2YWx1ZSB3aXRoIGNvbW1lbnRzLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCByb290ID0gcG9zdGNzcy5wYXJzZSgnYSB7XFxuICBjb2xvcjpibGFja1xcbn0nKVxuICAgICAqIHJvb3QuZmlyc3QuZmlyc3QucmF3cyAvLz0+IHsgYmVmb3JlOiAnXFxuICAnLCBiZXR3ZWVuOiAnOicgfVxuICAgICAqL1xuXG59XG5cbmV4cG9ydCBkZWZhdWx0IE5vZGU7XG5cbi8qKlxuICogQHR5cGVkZWYge29iamVjdH0gcG9zaXRpb25cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBsaW5lICAgLSBzb3VyY2UgbGluZSBpbiBmaWxlXG4gKiBAcHJvcGVydHkge251bWJlcn0gY29sdW1uIC0gc291cmNlIGNvbHVtbiBpbiBmaWxlXG4gKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBzb3VyY2VcbiAqIEBwcm9wZXJ0eSB7SW5wdXR9IGlucHV0ICAgIC0ge0BsaW5rIElucHV0fSB3aXRoIGlucHV0IGZpbGVcbiAqIEBwcm9wZXJ0eSB7cG9zaXRpb259IHN0YXJ0IC0gVGhlIHN0YXJ0aW5nIHBvc2l0aW9uIG9mIHRoZSBub2Rl4oCZcyBzb3VyY2VcbiAqIEBwcm9wZXJ0eSB7cG9zaXRpb259IGVuZCAgIC0gVGhlIGVuZGluZyBwb3NpdGlvbiBvZiB0aGUgbm9kZeKAmXMgc291cmNlXG4gKi9cbiJdfQ==
