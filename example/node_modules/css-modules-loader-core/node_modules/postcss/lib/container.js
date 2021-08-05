'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _declaration = require('./declaration');

var _declaration2 = _interopRequireDefault(_declaration);

var _comment = require('./comment');

var _comment2 = _interopRequireDefault(_comment);

var _node = require('./node');

var _node2 = _interopRequireDefault(_node);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function cleanSource(nodes) {
    return nodes.map(function (i) {
        if (i.nodes) i.nodes = cleanSource(i.nodes);
        delete i.source;
        return i;
    });
}

/**
 * The {@link Root}, {@link AtRule}, and {@link Rule} container nodes
 * inherit some common methods to help work with their children.
 *
 * Note that all containers can store any content. If you write a rule inside
 * a rule, PostCSS will parse it.
 *
 * @extends Node
 * @abstract
 */

var Container = function (_Node) {
    _inherits(Container, _Node);

    function Container() {
        _classCallCheck(this, Container);

        return _possibleConstructorReturn(this, _Node.apply(this, arguments));
    }

    Container.prototype.push = function push(child) {
        child.parent = this;
        this.nodes.push(child);
        return this;
    };

    /**
     * Iterates through the container’s immediate children,
     * calling `callback` for each child.
     *
     * Returning `false` in the callback will break iteration.
     *
     * This method only iterates through the container’s immediate children.
     * If you need to recursively iterate through all the container’s descendant
     * nodes, use {@link Container#walk}.
     *
     * Unlike the for `{}`-cycle or `Array#forEach` this iterator is safe
     * if you are mutating the array of child nodes during iteration.
     * PostCSS will adjust the current index to match the mutations.
     *
     * @param {childIterator} callback - iterator receives each node and index
     *
     * @return {false|undefined} returns `false` if iteration was broke
     *
     * @example
     * const root = postcss.parse('a { color: black; z-index: 1 }');
     * const rule = root.first;
     *
     * for ( let decl of rule.nodes ) {
     *     decl.cloneBefore({ prop: '-webkit-' + decl.prop });
     *     // Cycle will be infinite, because cloneBefore moves the current node
     *     // to the next index
     * }
     *
     * rule.each(decl => {
     *     decl.cloneBefore({ prop: '-webkit-' + decl.prop });
     *     // Will be executed only for color and z-index
     * });
     */


    Container.prototype.each = function each(callback) {
        if (!this.lastEach) this.lastEach = 0;
        if (!this.indexes) this.indexes = {};

        this.lastEach += 1;
        var id = this.lastEach;
        this.indexes[id] = 0;

        if (!this.nodes) return undefined;

        var index = void 0,
            result = void 0;
        while (this.indexes[id] < this.nodes.length) {
            index = this.indexes[id];
            result = callback(this.nodes[index], index);
            if (result === false) break;

            this.indexes[id] += 1;
        }

        delete this.indexes[id];

        return result;
    };

    /**
     * Traverses the container’s descendant nodes, calling callback
     * for each node.
     *
     * Like container.each(), this method is safe to use
     * if you are mutating arrays during iteration.
     *
     * If you only need to iterate through the container’s immediate children,
     * use {@link Container#each}.
     *
     * @param {childIterator} callback - iterator receives each node and index
     *
     * @return {false|undefined} returns `false` if iteration was broke
     *
     * @example
     * root.walk(node => {
     *   // Traverses all descendant nodes.
     * });
     */


    Container.prototype.walk = function walk(callback) {
        return this.each(function (child, i) {
            var result = callback(child, i);
            if (result !== false && child.walk) {
                result = child.walk(callback);
            }
            return result;
        });
    };

    /**
     * Traverses the container’s descendant nodes, calling callback
     * for each declaration node.
     *
     * If you pass a filter, iteration will only happen over declarations
     * with matching properties.
     *
     * Like {@link Container#each}, this method is safe
     * to use if you are mutating arrays during iteration.
     *
     * @param {string|RegExp} [prop]   - string or regular expression
     *                                   to filter declarations by property name
     * @param {childIterator} callback - iterator receives each node and index
     *
     * @return {false|undefined} returns `false` if iteration was broke
     *
     * @example
     * root.walkDecls(decl => {
     *   checkPropertySupport(decl.prop);
     * });
     *
     * root.walkDecls('border-radius', decl => {
     *   decl.remove();
     * });
     *
     * root.walkDecls(/^background/, decl => {
     *   decl.value = takeFirstColorFromGradient(decl.value);
     * });
     */


    Container.prototype.walkDecls = function walkDecls(prop, callback) {
        if (!callback) {
            callback = prop;
            return this.walk(function (child, i) {
                if (child.type === 'decl') {
                    return callback(child, i);
                }
            });
        } else if (prop instanceof RegExp) {
            return this.walk(function (child, i) {
                if (child.type === 'decl' && prop.test(child.prop)) {
                    return callback(child, i);
                }
            });
        } else {
            return this.walk(function (child, i) {
                if (child.type === 'decl' && child.prop === prop) {
                    return callback(child, i);
                }
            });
        }
    };

    /**
     * Traverses the container’s descendant nodes, calling callback
     * for each rule node.
     *
     * If you pass a filter, iteration will only happen over rules
     * with matching selectors.
     *
     * Like {@link Container#each}, this method is safe
     * to use if you are mutating arrays during iteration.
     *
     * @param {string|RegExp} [selector] - string or regular expression
     *                                     to filter rules by selector
     * @param {childIterator} callback   - iterator receives each node and index
     *
     * @return {false|undefined} returns `false` if iteration was broke
     *
     * @example
     * const selectors = [];
     * root.walkRules(rule => {
     *   selectors.push(rule.selector);
     * });
     * console.log(`Your CSS uses ${selectors.length} selectors`);
     */


    Container.prototype.walkRules = function walkRules(selector, callback) {
        if (!callback) {
            callback = selector;

            return this.walk(function (child, i) {
                if (child.type === 'rule') {
                    return callback(child, i);
                }
            });
        } else if (selector instanceof RegExp) {
            return this.walk(function (child, i) {
                if (child.type === 'rule' && selector.test(child.selector)) {
                    return callback(child, i);
                }
            });
        } else {
            return this.walk(function (child, i) {
                if (child.type === 'rule' && child.selector === selector) {
                    return callback(child, i);
                }
            });
        }
    };

    /**
     * Traverses the container’s descendant nodes, calling callback
     * for each at-rule node.
     *
     * If you pass a filter, iteration will only happen over at-rules
     * that have matching names.
     *
     * Like {@link Container#each}, this method is safe
     * to use if you are mutating arrays during iteration.
     *
     * @param {string|RegExp} [name]   - string or regular expression
     *                                   to filter at-rules by name
     * @param {childIterator} callback - iterator receives each node and index
     *
     * @return {false|undefined} returns `false` if iteration was broke
     *
     * @example
     * root.walkAtRules(rule => {
     *   if ( isOld(rule.name) ) rule.remove();
     * });
     *
     * let first = false;
     * root.walkAtRules('charset', rule => {
     *   if ( !first ) {
     *     first = true;
     *   } else {
     *     rule.remove();
     *   }
     * });
     */


    Container.prototype.walkAtRules = function walkAtRules(name, callback) {
        if (!callback) {
            callback = name;
            return this.walk(function (child, i) {
                if (child.type === 'atrule') {
                    return callback(child, i);
                }
            });
        } else if (name instanceof RegExp) {
            return this.walk(function (child, i) {
                if (child.type === 'atrule' && name.test(child.name)) {
                    return callback(child, i);
                }
            });
        } else {
            return this.walk(function (child, i) {
                if (child.type === 'atrule' && child.name === name) {
                    return callback(child, i);
                }
            });
        }
    };

    /**
     * Traverses the container’s descendant nodes, calling callback
     * for each comment node.
     *
     * Like {@link Container#each}, this method is safe
     * to use if you are mutating arrays during iteration.
     *
     * @param {childIterator} callback - iterator receives each node and index
     *
     * @return {false|undefined} returns `false` if iteration was broke
     *
     * @example
     * root.walkComments(comment => {
     *   comment.remove();
     * });
     */


    Container.prototype.walkComments = function walkComments(callback) {
        return this.walk(function (child, i) {
            if (child.type === 'comment') {
                return callback(child, i);
            }
        });
    };

    /**
     * Inserts new nodes to the end of the container.
     *
     * @param {...(Node|object|string|Node[])} children - new nodes
     *
     * @return {Node} this node for methods chain
     *
     * @example
     * const decl1 = postcss.decl({ prop: 'color', value: 'black' });
     * const decl2 = postcss.decl({ prop: 'background-color', value: 'white' });
     * rule.append(decl1, decl2);
     *
     * root.append({ name: 'charset', params: '"UTF-8"' });  // at-rule
     * root.append({ selector: 'a' });                       // rule
     * rule.append({ prop: 'color', value: 'black' });       // declaration
     * rule.append({ text: 'Comment' })                      // comment
     *
     * root.append('a {}');
     * root.first.append('color: black; z-index: 1');
     */


    Container.prototype.append = function append() {
        for (var _len = arguments.length, children = Array(_len), _key = 0; _key < _len; _key++) {
            children[_key] = arguments[_key];
        }

        for (var _iterator = children, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
                if (_i >= _iterator.length) break;
                _ref = _iterator[_i++];
            } else {
                _i = _iterator.next();
                if (_i.done) break;
                _ref = _i.value;
            }

            var child = _ref;

            var nodes = this.normalize(child, this.last);
            for (var _iterator2 = nodes, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
                var _ref2;

                if (_isArray2) {
                    if (_i2 >= _iterator2.length) break;
                    _ref2 = _iterator2[_i2++];
                } else {
                    _i2 = _iterator2.next();
                    if (_i2.done) break;
                    _ref2 = _i2.value;
                }

                var node = _ref2;
                this.nodes.push(node);
            }
        }
        return this;
    };

    /**
     * Inserts new nodes to the start of the container.
     *
     * @param {...(Node|object|string|Node[])} children - new nodes
     *
     * @return {Node} this node for methods chain
     *
     * @example
     * const decl1 = postcss.decl({ prop: 'color', value: 'black' });
     * const decl2 = postcss.decl({ prop: 'background-color', value: 'white' });
     * rule.prepend(decl1, decl2);
     *
     * root.append({ name: 'charset', params: '"UTF-8"' });  // at-rule
     * root.append({ selector: 'a' });                       // rule
     * rule.append({ prop: 'color', value: 'black' });       // declaration
     * rule.append({ text: 'Comment' })                      // comment
     *
     * root.append('a {}');
     * root.first.append('color: black; z-index: 1');
     */


    Container.prototype.prepend = function prepend() {
        for (var _len2 = arguments.length, children = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            children[_key2] = arguments[_key2];
        }

        children = children.reverse();
        for (var _iterator3 = children, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
            var _ref3;

            if (_isArray3) {
                if (_i3 >= _iterator3.length) break;
                _ref3 = _iterator3[_i3++];
            } else {
                _i3 = _iterator3.next();
                if (_i3.done) break;
                _ref3 = _i3.value;
            }

            var child = _ref3;

            var nodes = this.normalize(child, this.first, 'prepend').reverse();
            for (var _iterator4 = nodes, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
                var _ref4;

                if (_isArray4) {
                    if (_i4 >= _iterator4.length) break;
                    _ref4 = _iterator4[_i4++];
                } else {
                    _i4 = _iterator4.next();
                    if (_i4.done) break;
                    _ref4 = _i4.value;
                }

                var node = _ref4;
                this.nodes.unshift(node);
            }for (var id in this.indexes) {
                this.indexes[id] = this.indexes[id] + nodes.length;
            }
        }
        return this;
    };

    Container.prototype.cleanRaws = function cleanRaws(keepBetween) {
        _Node.prototype.cleanRaws.call(this, keepBetween);
        if (this.nodes) {
            for (var _iterator5 = this.nodes, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
                var _ref5;

                if (_isArray5) {
                    if (_i5 >= _iterator5.length) break;
                    _ref5 = _iterator5[_i5++];
                } else {
                    _i5 = _iterator5.next();
                    if (_i5.done) break;
                    _ref5 = _i5.value;
                }

                var node = _ref5;
                node.cleanRaws(keepBetween);
            }
        }
    };

    /**
     * Insert new node before old node within the container.
     *
     * @param {Node|number} exist             - child or child’s index.
     * @param {Node|object|string|Node[]} add - new node
     *
     * @return {Node} this node for methods chain
     *
     * @example
     * rule.insertBefore(decl, decl.clone({ prop: '-webkit-' + decl.prop }));
     */


    Container.prototype.insertBefore = function insertBefore(exist, add) {
        exist = this.index(exist);

        var type = exist === 0 ? 'prepend' : false;
        var nodes = this.normalize(add, this.nodes[exist], type).reverse();
        for (var _iterator6 = nodes, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
            var _ref6;

            if (_isArray6) {
                if (_i6 >= _iterator6.length) break;
                _ref6 = _iterator6[_i6++];
            } else {
                _i6 = _iterator6.next();
                if (_i6.done) break;
                _ref6 = _i6.value;
            }

            var node = _ref6;
            this.nodes.splice(exist, 0, node);
        }var index = void 0;
        for (var id in this.indexes) {
            index = this.indexes[id];
            if (exist <= index) {
                this.indexes[id] = index + nodes.length;
            }
        }

        return this;
    };

    /**
     * Insert new node after old node within the container.
     *
     * @param {Node|number} exist             - child or child’s index
     * @param {Node|object|string|Node[]} add - new node
     *
     * @return {Node} this node for methods chain
     */


    Container.prototype.insertAfter = function insertAfter(exist, add) {
        exist = this.index(exist);

        var nodes = this.normalize(add, this.nodes[exist]).reverse();
        for (var _iterator7 = nodes, _isArray7 = Array.isArray(_iterator7), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();;) {
            var _ref7;

            if (_isArray7) {
                if (_i7 >= _iterator7.length) break;
                _ref7 = _iterator7[_i7++];
            } else {
                _i7 = _iterator7.next();
                if (_i7.done) break;
                _ref7 = _i7.value;
            }

            var node = _ref7;
            this.nodes.splice(exist + 1, 0, node);
        }var index = void 0;
        for (var id in this.indexes) {
            index = this.indexes[id];
            if (exist < index) {
                this.indexes[id] = index + nodes.length;
            }
        }

        return this;
    };

    /**
     * Removes node from the container and cleans the parent properties
     * from the node and its children.
     *
     * @param {Node|number} child - child or child’s index
     *
     * @return {Node} this node for methods chain
     *
     * @example
     * rule.nodes.length  //=> 5
     * rule.removeChild(decl);
     * rule.nodes.length  //=> 4
     * decl.parent        //=> undefined
     */


    Container.prototype.removeChild = function removeChild(child) {
        child = this.index(child);
        this.nodes[child].parent = undefined;
        this.nodes.splice(child, 1);

        var index = void 0;
        for (var id in this.indexes) {
            index = this.indexes[id];
            if (index >= child) {
                this.indexes[id] = index - 1;
            }
        }

        return this;
    };

    /**
     * Removes all children from the container
     * and cleans their parent properties.
     *
     * @return {Node} this node for methods chain
     *
     * @example
     * rule.removeAll();
     * rule.nodes.length //=> 0
     */


    Container.prototype.removeAll = function removeAll() {
        for (var _iterator8 = this.nodes, _isArray8 = Array.isArray(_iterator8), _i8 = 0, _iterator8 = _isArray8 ? _iterator8 : _iterator8[Symbol.iterator]();;) {
            var _ref8;

            if (_isArray8) {
                if (_i8 >= _iterator8.length) break;
                _ref8 = _iterator8[_i8++];
            } else {
                _i8 = _iterator8.next();
                if (_i8.done) break;
                _ref8 = _i8.value;
            }

            var node = _ref8;
            node.parent = undefined;
        }this.nodes = [];
        return this;
    };

    /**
     * Passes all declaration values within the container that match pattern
     * through callback, replacing those values with the returned result
     * of callback.
     *
     * This method is useful if you are using a custom unit or function
     * and need to iterate through all values.
     *
     * @param {string|RegExp} pattern      - replace pattern
     * @param {object} opts                - options to speed up the search
     * @param {string|string[]} opts.props - an array of property names
     * @param {string} opts.fast           - string that’s used
     *                                       to narrow down values and speed up
                                             the regexp search
     * @param {function|string} callback   - string to replace pattern
     *                                       or callback that returns a new
     *                                       value.
     *                                       The callback will receive
     *                                       the same arguments as those
     *                                       passed to a function parameter
     *                                       of `String#replace`.
     *
     * @return {Node} this node for methods chain
     *
     * @example
     * root.replaceValues(/\d+rem/, { fast: 'rem' }, string => {
     *   return 15 * parseInt(string) + 'px';
     * });
     */


    Container.prototype.replaceValues = function replaceValues(pattern, opts, callback) {
        if (!callback) {
            callback = opts;
            opts = {};
        }

        this.walkDecls(function (decl) {
            if (opts.props && opts.props.indexOf(decl.prop) === -1) return;
            if (opts.fast && decl.value.indexOf(opts.fast) === -1) return;

            decl.value = decl.value.replace(pattern, callback);
        });

        return this;
    };

    /**
     * Returns `true` if callback returns `true`
     * for all of the container’s children.
     *
     * @param {childCondition} condition - iterator returns true or false.
     *
     * @return {boolean} is every child pass condition
     *
     * @example
     * const noPrefixes = rule.every(i => i.prop[0] !== '-');
     */


    Container.prototype.every = function every(condition) {
        return this.nodes.every(condition);
    };

    /**
     * Returns `true` if callback returns `true` for (at least) one
     * of the container’s children.
     *
     * @param {childCondition} condition - iterator returns true or false.
     *
     * @return {boolean} is some child pass condition
     *
     * @example
     * const hasPrefix = rule.some(i => i.prop[0] === '-');
     */


    Container.prototype.some = function some(condition) {
        return this.nodes.some(condition);
    };

    /**
     * Returns a `child`’s index within the {@link Container#nodes} array.
     *
     * @param {Node} child - child of the current container.
     *
     * @return {number} child index
     *
     * @example
     * rule.index( rule.nodes[2] ) //=> 2
     */


    Container.prototype.index = function index(child) {
        if (typeof child === 'number') {
            return child;
        } else {
            return this.nodes.indexOf(child);
        }
    };

    /**
     * The container’s first child.
     *
     * @type {Node}
     *
     * @example
     * rule.first == rules.nodes[0];
     */


    Container.prototype.normalize = function normalize(nodes, sample) {
        var _this2 = this;

        if (typeof nodes === 'string') {
            var parse = require('./parse');
            nodes = cleanSource(parse(nodes).nodes);
        } else if (Array.isArray(nodes)) {
            nodes = nodes.slice(0);
        } else if (nodes.type === 'root') {
            nodes = nodes.nodes.slice(0);
        } else if (nodes.type) {
            nodes = [nodes];
        } else if (nodes.prop) {
            if (typeof nodes.value === 'undefined') {
                throw new Error('Value field is missed in node creation');
            } else if (typeof nodes.value !== 'string') {
                nodes.value = String(nodes.value);
            }
            nodes = [new _declaration2.default(nodes)];
        } else if (nodes.selector) {
            var Rule = require('./rule');
            nodes = [new Rule(nodes)];
        } else if (nodes.name) {
            var AtRule = require('./at-rule');
            nodes = [new AtRule(nodes)];
        } else if (nodes.text) {
            nodes = [new _comment2.default(nodes)];
        } else {
            throw new Error('Unknown node type in node creation');
        }

        var processed = nodes.map(function (i) {
            if (typeof i.before !== 'function') i = _this2.rebuild(i);

            if (i.parent) i.parent.removeChild(i);
            if (typeof i.raws.before === 'undefined') {
                if (sample && typeof sample.raws.before !== 'undefined') {
                    i.raws.before = sample.raws.before.replace(/[^\s]/g, '');
                }
            }
            i.parent = _this2;
            return i;
        });

        return processed;
    };

    Container.prototype.rebuild = function rebuild(node, parent) {
        var _this3 = this;

        var fix = void 0;
        if (node.type === 'root') {
            var Root = require('./root');
            fix = new Root();
        } else if (node.type === 'atrule') {
            var AtRule = require('./at-rule');
            fix = new AtRule();
        } else if (node.type === 'rule') {
            var Rule = require('./rule');
            fix = new Rule();
        } else if (node.type === 'decl') {
            fix = new _declaration2.default();
        } else if (node.type === 'comment') {
            fix = new _comment2.default();
        }

        for (var i in node) {
            if (i === 'nodes') {
                fix.nodes = node.nodes.map(function (j) {
                    return _this3.rebuild(j, fix);
                });
            } else if (i === 'parent' && parent) {
                fix.parent = parent;
            } else if (node.hasOwnProperty(i)) {
                fix[i] = node[i];
            }
        }

        return fix;
    };

    /**
     * @memberof Container#
     * @member {Node[]} nodes - an array containing the container’s children
     *
     * @example
     * const root = postcss.parse('a { color: black }');
     * root.nodes.length           //=> 1
     * root.nodes[0].selector      //=> 'a'
     * root.nodes[0].nodes[0].prop //=> 'color'
     */

    _createClass(Container, [{
        key: 'first',
        get: function get() {
            if (!this.nodes) return undefined;
            return this.nodes[0];
        }

        /**
         * The container’s last child.
         *
         * @type {Node}
         *
         * @example
         * rule.last == rule.nodes[rule.nodes.length - 1];
         */

    }, {
        key: 'last',
        get: function get() {
            if (!this.nodes) return undefined;
            return this.nodes[this.nodes.length - 1];
        }
    }]);

    return Container;
}(_node2.default);

exports.default = Container;

/**
 * @callback childCondition
 * @param {Node} node    - container child
 * @param {number} index - child index
 * @param {Node[]} nodes - all container children
 * @return {boolean}
 */

/**
 * @callback childIterator
 * @param {Node} node    - container child
 * @param {number} index - child index
 * @return {false|undefined} returning `false` will break iteration
 */

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRhaW5lci5lczYiXSwibmFtZXMiOlsiY2xlYW5Tb3VyY2UiLCJub2RlcyIsIm1hcCIsImkiLCJzb3VyY2UiLCJDb250YWluZXIiLCJwdXNoIiwiY2hpbGQiLCJwYXJlbnQiLCJlYWNoIiwiY2FsbGJhY2siLCJsYXN0RWFjaCIsImluZGV4ZXMiLCJpZCIsInVuZGVmaW5lZCIsImluZGV4IiwicmVzdWx0IiwibGVuZ3RoIiwid2FsayIsIndhbGtEZWNscyIsInByb3AiLCJ0eXBlIiwiUmVnRXhwIiwidGVzdCIsIndhbGtSdWxlcyIsInNlbGVjdG9yIiwid2Fsa0F0UnVsZXMiLCJuYW1lIiwid2Fsa0NvbW1lbnRzIiwiYXBwZW5kIiwiY2hpbGRyZW4iLCJub3JtYWxpemUiLCJsYXN0Iiwibm9kZSIsInByZXBlbmQiLCJyZXZlcnNlIiwiZmlyc3QiLCJ1bnNoaWZ0IiwiY2xlYW5SYXdzIiwia2VlcEJldHdlZW4iLCJpbnNlcnRCZWZvcmUiLCJleGlzdCIsImFkZCIsInNwbGljZSIsImluc2VydEFmdGVyIiwicmVtb3ZlQ2hpbGQiLCJyZW1vdmVBbGwiLCJyZXBsYWNlVmFsdWVzIiwicGF0dGVybiIsIm9wdHMiLCJwcm9wcyIsImluZGV4T2YiLCJkZWNsIiwiZmFzdCIsInZhbHVlIiwicmVwbGFjZSIsImV2ZXJ5IiwiY29uZGl0aW9uIiwic29tZSIsInNhbXBsZSIsInBhcnNlIiwicmVxdWlyZSIsIkFycmF5IiwiaXNBcnJheSIsInNsaWNlIiwiRXJyb3IiLCJTdHJpbmciLCJSdWxlIiwiQXRSdWxlIiwidGV4dCIsInByb2Nlc3NlZCIsImJlZm9yZSIsInJlYnVpbGQiLCJyYXdzIiwiZml4IiwiUm9vdCIsImoiLCJoYXNPd25Qcm9wZXJ0eSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7Ozs7Ozs7QUFFQSxTQUFTQSxXQUFULENBQXFCQyxLQUFyQixFQUE0QjtBQUN4QixXQUFPQSxNQUFNQyxHQUFOLENBQVcsYUFBSztB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Z0M7QUFDbkNrRSxvQkFBSWxFLE1BQUosR0FBYUEsTUFBYjtBQUNILGFBRk0sTUFFQSxJQUFLeUIsS0FBSzRDLGNBQUwsQ0FBb0IxRSxDQUFwQixDQUFMLEVBQThCO0FBQ2pDdUUsb0JBQUl2RSxDQUFKLElBQVM4QixLQUFLOUIsQ0FBTCxDQUFUO0FBQ0g7QUFDSjs7QUFFRCxlQUFPdUUsR0FBUDtBQUNILEs7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7NEJBN0ZZO0FBQ1IsZ0JBQUssQ0FBQyxLQUFLekUsS0FBWCxFQUFtQixPQUFPYSxTQUFQO0FBQ25CLG1CQUFPLEtBQUtiLEtBQUwsQ0FBVyxDQUFYLENBQVA7QUFDSDs7QUFFRDs7Ozs7Ozs7Ozs7NEJBUVc7QUFDUCxnQkFBSyxDQUFDLEtBQUtBLEtBQVgsRUFBbUIsT0FBT2EsU0FBUDtBQUNuQixtQkFBTyxLQUFLYixLQUFMLENBQVcsS0FBS0EsS0FBTCxDQUFXZ0IsTUFBWCxHQUFvQixDQUEvQixDQUFQO0FBQ0g7Ozs7OztrQkEwRlVaLFM7O0FBR2Y7Ozs7Ozs7O0FBUUEiLCJmaWxlIjoiY29udGFpbmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IERlY2xhcmF0aW9uIGZyb20gJy4vZGVjbGFyYXRpb24nO1xuaW1wb3J0IENvbW1lbnQgICAgIGZyb20gJy4vY29tbWVudCc7XG5pbXBvcnQgTm9kZSAgICAgICAgZnJvbSAnLi9ub2RlJztcblxuZnVuY3Rpb24gY2xlYW5Tb3VyY2Uobm9kZXMpIHtcbiAgICByZXR1cm4gbm9kZXMubWFwKCBpID0+IHtcbiAgICAgICAgaWYgKCBpLm5vZGVzICkgaS5ub2RlcyA9IGNsZWFuU291cmNlKGkubm9kZXMpO1xuICAgICAgICBkZWxldGUgaS5zb3VyY2U7XG4gICAgICAgIHJldHVybiBpO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIFRoZSB7QGxpbmsgUm9vdH0sIHtAbGluayBBdFJ1bGV9LCBhbmQge0BsaW5rIFJ1bGV9IGNvbnRhaW5lciBub2Rlc1xuICogaW5oZXJpdCBzb21lIGNvbW1vbiBtZXRob2RzIHRvIGhlbHAgd29yayB3aXRoIHRoZWlyIGNoaWxkcmVuLlxuICpcbiAqIE5vdGUgdGhhdCBhbGwgY29udGFpbmVycyBjYW4gc3RvcmUgYW55IGNvbnRlbnQuIElmIHlvdSB3cml0ZSBhIHJ1bGUgaW5zaWRlXG4gKiBhIHJ1bGUsIFBvc3RDU1Mgd2lsbCBwYXJzZSBpdC5cbiAqXG4gKiBAZXh0ZW5kcyBOb2RlXG4gKiBAYWJzdHJhY3RcbiAqL1xuY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgTm9kZSB7XG5cbiAgICBwdXNoKGNoaWxkKSB7XG4gICAgICAgIGNoaWxkLnBhcmVudCA9IHRoaXM7XG4gICAgICAgIHRoaXMubm9kZXMucHVzaChjaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGVzIHRocm91Z2ggdGhlIGNvbnRhaW5lcuKAmXMgaW1tZWRpYXRlIGNoaWxkcmVuLFxuICAgICAqIGNhbGxpbmcgYGNhbGxiYWNrYCBmb3IgZWFjaCBjaGlsZC5cbiAgICAgKlxuICAgICAqIFJldHVybmluZyBgZmFsc2VgIGluIHRoZSBjYWxsYmFjayB3aWxsIGJyZWFrIGl0ZXJhdGlvbi5cbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIG9ubHkgaXRlcmF0ZXMgdGhyb3VnaCB0aGUgY29udGFpbmVy4oCZcyBpbW1lZGlhdGUgY2hpbGRyZW4uXG4gICAgICogSWYgeW91IG5lZWQgdG8gcmVjdXJzaXZlbHkgaXRlcmF0ZSB0aHJvdWdoIGFsbCB0aGUgY29udGFpbmVy4oCZcyBkZXNjZW5kYW50XG4gICAgICogbm9kZXMsIHVzZSB7QGxpbmsgQ29udGFpbmVyI3dhbGt9LlxuICAgICAqXG4gICAgICogVW5saWtlIHRoZSBmb3IgYHt9YC1jeWNsZSBvciBgQXJyYXkjZm9yRWFjaGAgdGhpcyBpdGVyYXRvciBpcyBzYWZlXG4gICAgICogaWYgeW91IGFyZSBtdXRhdGluZyB0aGUgYXJyYXkgb2YgY2hpbGQgbm9kZXMgZHVyaW5nIGl0ZXJhdGlvbi5cbiAgICAgKiBQb3N0Q1NTIHdpbGwgYWRqdXN0IHRoZSBjdXJyZW50IGluZGV4IHRvIG1hdGNoIHRoZSBtdXRhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2NoaWxkSXRlcmF0b3J9IGNhbGxiYWNrIC0gaXRlcmF0b3IgcmVjZWl2ZXMgZWFjaCBub2RlIGFuZCBpbmRleFxuICAgICAqXG4gICAgICogQHJldHVybiB7ZmFsc2V8dW5kZWZpbmVkfSByZXR1cm5zIGBmYWxzZWAgaWYgaXRlcmF0aW9uIHdhcyBicm9rZVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCByb290ID0gcG9zdGNzcy5wYXJzZSgnYSB7IGNvbG9yOiBibGFjazsgei1pbmRleDogMSB9Jyk7XG4gICAgICogY29uc3QgcnVsZSA9IHJvb3QuZmlyc3Q7XG4gICAgICpcbiAgICAgKiBmb3IgKCBsZXQgZGVjbCBvZiBydWxlLm5vZGVzICkge1xuICAgICAqICAgICBkZWNsLmNsb25lQmVmb3JlKHsgcHJvcDogJy13ZWJraXQtJyArIGRlY2wucHJvcCB9KTtcbiAgICAgKiAgICAgLy8gQ3ljbGUgd2lsbCBiZSBpbmZpbml0ZSwgYmVjYXVzZSBjbG9uZUJlZm9yZSBtb3ZlcyB0aGUgY3VycmVudCBub2RlXG4gICAgICogICAgIC8vIHRvIHRoZSBuZXh0IGluZGV4XG4gICAgICogfVxuICAgICAqXG4gICAgICogcnVsZS5lYWNoKGRlY2wgPT4ge1xuICAgICAqICAgICBkZWNsLmNsb25lQmVmb3JlKHsgcHJvcDogJy13ZWJraXQtJyArIGRlY2wucHJvcCB9KTtcbiAgICAgKiAgICAgLy8gV2lsbCBiZSBleGVjdXRlZCBvbmx5IGZvciBjb2xvciBhbmQgei1pbmRleFxuICAgICAqIH0pO1xuICAgICAqL1xuICAgIGVhY2goY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCAhdGhpcy5sYXN0RWFjaCApIHRoaXMubGFzdEVhY2ggPSAwO1xuICAgICAgICBpZiAoICF0aGlzLmluZGV4ZXMgKSB0aGlzLmluZGV4ZXMgPSB7IH07XG5cbiAgICAgICAgdGhpcy5sYXN0RWFjaCArPSAxO1xuICAgICAgICBsZXQgaWQgPSB0aGlzLmxhc3RFYWNoO1xuICAgICAgICB0aGlzLmluZGV4ZXNbaWRdID0gMDtcblxuICAgICAgICBpZiAoICF0aGlzLm5vZGVzICkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgICBsZXQgaW5kZXgsIHJlc3VsdDtcbiAgICAgICAgd2hpbGUgKCB0aGlzLmluZGV4ZXNbaWRdIDwgdGhpcy5ub2Rlcy5sZW5ndGggKSB7XG4gICAgICAgICAgICBpbmRleCAgPSB0aGlzLmluZGV4ZXNbaWRdO1xuICAgICAgICAgICAgcmVzdWx0ID0gY2FsbGJhY2sodGhpcy5ub2Rlc1tpbmRleF0sIGluZGV4KTtcbiAgICAgICAgICAgIGlmICggcmVzdWx0ID09PSBmYWxzZSApIGJyZWFrO1xuXG4gICAgICAgICAgICB0aGlzLmluZGV4ZXNbaWRdICs9IDE7XG4gICAgICAgIH1cblxuICAgICAgICBkZWxldGUgdGhpcy5pbmRleGVzW2lkXTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYXZlcnNlcyB0aGUgY29udGFpbmVy4oCZcyBkZXNjZW5kYW50IG5vZGVzLCBjYWxsaW5nIGNhbGxiYWNrXG4gICAgICogZm9yIGVhY2ggbm9kZS5cbiAgICAgKlxuICAgICAqIExpa2UgY29udGFpbmVyLmVhY2goKSwgdGhpcyBtZXRob2QgaXMgc2FmZSB0byB1c2VcbiAgICAgKiBpZiB5b3UgYXJlIG11dGF0aW5nIGFycmF5cyBkdXJpbmcgaXRlcmF0aW9uLlxuICAgICAqXG4gICAgICogSWYgeW91IG9ubHkgbmVlZCB0byBpdGVyYXRlIHRocm91Z2ggdGhlIGNvbnRhaW5lcuKAmXMgaW1tZWRpYXRlIGNoaWxkcmVuLFxuICAgICAqIHVzZSB7QGxpbmsgQ29udGFpbmVyI2VhY2h9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtjaGlsZEl0ZXJhdG9yfSBjYWxsYmFjayAtIGl0ZXJhdG9yIHJlY2VpdmVzIGVhY2ggbm9kZSBhbmQgaW5kZXhcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge2ZhbHNlfHVuZGVmaW5lZH0gcmV0dXJucyBgZmFsc2VgIGlmIGl0ZXJhdGlvbiB3YXMgYnJva2VcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcm9vdC53YWxrKG5vZGUgPT4ge1xuICAgICAqICAgLy8gVHJhdmVyc2VzIGFsbCBkZXNjZW5kYW50IG5vZGVzLlxuICAgICAqIH0pO1xuICAgICAqL1xuICAgIHdhbGsoY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaCggKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gY2FsbGJhY2soY2hpbGQsIGkpO1xuICAgICAgICAgICAgaWYgKCByZXN1bHQgIT09IGZhbHNlICYmIGNoaWxkLndhbGsgKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gY2hpbGQud2FsayhjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmF2ZXJzZXMgdGhlIGNvbnRhaW5lcuKAmXMgZGVzY2VuZGFudCBub2RlcywgY2FsbGluZyBjYWxsYmFja1xuICAgICAqIGZvciBlYWNoIGRlY2xhcmF0aW9uIG5vZGUuXG4gICAgICpcbiAgICAgKiBJZiB5b3UgcGFzcyBhIGZpbHRlciwgaXRlcmF0aW9uIHdpbGwgb25seSBoYXBwZW4gb3ZlciBkZWNsYXJhdGlvbnNcbiAgICAgKiB3aXRoIG1hdGNoaW5nIHByb3BlcnRpZXMuXG4gICAgICpcbiAgICAgKiBMaWtlIHtAbGluayBDb250YWluZXIjZWFjaH0sIHRoaXMgbWV0aG9kIGlzIHNhZmVcbiAgICAgKiB0byB1c2UgaWYgeW91IGFyZSBtdXRhdGluZyBhcnJheXMgZHVyaW5nIGl0ZXJhdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfFJlZ0V4cH0gW3Byb3BdICAgLSBzdHJpbmcgb3IgcmVndWxhciBleHByZXNzaW9uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvIGZpbHRlciBkZWNsYXJhdGlvbnMgYnkgcHJvcGVydHkgbmFtZVxuICAgICAqIEBwYXJhbSB7Y2hpbGRJdGVyYXRvcn0gY2FsbGJhY2sgLSBpdGVyYXRvciByZWNlaXZlcyBlYWNoIG5vZGUgYW5kIGluZGV4XG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtmYWxzZXx1bmRlZmluZWR9IHJldHVybnMgYGZhbHNlYCBpZiBpdGVyYXRpb24gd2FzIGJyb2tlXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHJvb3Qud2Fsa0RlY2xzKGRlY2wgPT4ge1xuICAgICAqICAgY2hlY2tQcm9wZXJ0eVN1cHBvcnQoZGVjbC5wcm9wKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIHJvb3Qud2Fsa0RlY2xzKCdib3JkZXItcmFkaXVzJywgZGVjbCA9PiB7XG4gICAgICogICBkZWNsLnJlbW92ZSgpO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogcm9vdC53YWxrRGVjbHMoL15iYWNrZ3JvdW5kLywgZGVjbCA9PiB7XG4gICAgICogICBkZWNsLnZhbHVlID0gdGFrZUZpcnN0Q29sb3JGcm9tR3JhZGllbnQoZGVjbC52YWx1ZSk7XG4gICAgICogfSk7XG4gICAgICovXG4gICAgd2Fsa0RlY2xzKHByb3AsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICggIWNhbGxiYWNrICkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBwcm9wO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud2FsayggKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCBjaGlsZC50eXBlID09PSAnZGVjbCcgKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhjaGlsZCwgaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIHByb3AgaW5zdGFuY2VvZiBSZWdFeHAgKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy53YWxrKCAoY2hpbGQsIGkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIGNoaWxkLnR5cGUgPT09ICdkZWNsJyAmJiBwcm9wLnRlc3QoY2hpbGQucHJvcCkgKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhjaGlsZCwgaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy53YWxrKCAoY2hpbGQsIGkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIGNoaWxkLnR5cGUgPT09ICdkZWNsJyAmJiBjaGlsZC5wcm9wID09PSBwcm9wICkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJhdmVyc2VzIHRoZSBjb250YWluZXLigJlzIGRlc2NlbmRhbnQgbm9kZXMsIGNhbGxpbmcgY2FsbGJhY2tcbiAgICAgKiBmb3IgZWFjaCBydWxlIG5vZGUuXG4gICAgICpcbiAgICAgKiBJZiB5b3UgcGFzcyBhIGZpbHRlciwgaXRlcmF0aW9uIHdpbGwgb25seSBoYXBwZW4gb3ZlciBydWxlc1xuICAgICAqIHdpdGggbWF0Y2hpbmcgc2VsZWN0b3JzLlxuICAgICAqXG4gICAgICogTGlrZSB7QGxpbmsgQ29udGFpbmVyI2VhY2h9LCB0aGlzIG1ldGhvZCBpcyBzYWZlXG4gICAgICogdG8gdXNlIGlmIHlvdSBhcmUgbXV0YXRpbmcgYXJyYXlzIGR1cmluZyBpdGVyYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xSZWdFeHB9IFtzZWxlY3Rvcl0gLSBzdHJpbmcgb3IgcmVndWxhciBleHByZXNzaW9uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZmlsdGVyIHJ1bGVzIGJ5IHNlbGVjdG9yXG4gICAgICogQHBhcmFtIHtjaGlsZEl0ZXJhdG9yfSBjYWxsYmFjayAgIC0gaXRlcmF0b3IgcmVjZWl2ZXMgZWFjaCBub2RlIGFuZCBpbmRleFxuICAgICAqXG4gICAgICogQHJldHVybiB7ZmFsc2V8dW5kZWZpbmVkfSByZXR1cm5zIGBmYWxzZWAgaWYgaXRlcmF0aW9uIHdhcyBicm9rZVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCBzZWxlY3RvcnMgPSBbXTtcbiAgICAgKiByb290LndhbGtSdWxlcyhydWxlID0+IHtcbiAgICAgKiAgIHNlbGVjdG9ycy5wdXNoKHJ1bGUuc2VsZWN0b3IpO1xuICAgICAqIH0pO1xuICAgICAqIGNvbnNvbGUubG9nKGBZb3VyIENTUyB1c2VzICR7c2VsZWN0b3JzLmxlbmd0aH0gc2VsZWN0b3JzYCk7XG4gICAgICovXG4gICAgd2Fsa1J1bGVzKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoICFjYWxsYmFjayApIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gc2VsZWN0b3I7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLndhbGsoIChjaGlsZCwgaSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICggY2hpbGQudHlwZSA9PT0gJ3J1bGUnICkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKCBzZWxlY3RvciBpbnN0YW5jZW9mIFJlZ0V4cCApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLndhbGsoIChjaGlsZCwgaSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICggY2hpbGQudHlwZSA9PT0gJ3J1bGUnICYmIHNlbGVjdG9yLnRlc3QoY2hpbGQuc2VsZWN0b3IpICkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud2FsayggKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCBjaGlsZC50eXBlID09PSAncnVsZScgJiYgY2hpbGQuc2VsZWN0b3IgPT09IHNlbGVjdG9yICkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJhdmVyc2VzIHRoZSBjb250YWluZXLigJlzIGRlc2NlbmRhbnQgbm9kZXMsIGNhbGxpbmcgY2FsbGJhY2tcbiAgICAgKiBmb3IgZWFjaCBhdC1ydWxlIG5vZGUuXG4gICAgICpcbiAgICAgKiBJZiB5b3UgcGFzcyBhIGZpbHRlciwgaXRlcmF0aW9uIHdpbGwgb25seSBoYXBwZW4gb3ZlciBhdC1ydWxlc1xuICAgICAqIHRoYXQgaGF2ZSBtYXRjaGluZyBuYW1lcy5cbiAgICAgKlxuICAgICAqIExpa2Uge0BsaW5rIENvbnRhaW5lciNlYWNofSwgdGhpcyBtZXRob2QgaXMgc2FmZVxuICAgICAqIHRvIHVzZSBpZiB5b3UgYXJlIG11dGF0aW5nIGFycmF5cyBkdXJpbmcgaXRlcmF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd8UmVnRXhwfSBbbmFtZV0gICAtIHN0cmluZyBvciByZWd1bGFyIGV4cHJlc3Npb25cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZmlsdGVyIGF0LXJ1bGVzIGJ5IG5hbWVcbiAgICAgKiBAcGFyYW0ge2NoaWxkSXRlcmF0b3J9IGNhbGxiYWNrIC0gaXRlcmF0b3IgcmVjZWl2ZXMgZWFjaCBub2RlIGFuZCBpbmRleFxuICAgICAqXG4gICAgICogQHJldHVybiB7ZmFsc2V8dW5kZWZpbmVkfSByZXR1cm5zIGBmYWxzZWAgaWYgaXRlcmF0aW9uIHdhcyBicm9rZVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiByb290LndhbGtBdFJ1bGVzKHJ1bGUgPT4ge1xuICAgICAqICAgaWYgKCBpc09sZChydWxlLm5hbWUpICkgcnVsZS5yZW1vdmUoKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIGxldCBmaXJzdCA9IGZhbHNlO1xuICAgICAqIHJvb3Qud2Fsa0F0UnVsZXMoJ2NoYXJzZXQnLCBydWxlID0+IHtcbiAgICAgKiAgIGlmICggIWZpcnN0ICkge1xuICAgICAqICAgICBmaXJzdCA9IHRydWU7XG4gICAgICogICB9IGVsc2Uge1xuICAgICAqICAgICBydWxlLnJlbW92ZSgpO1xuICAgICAqICAgfVxuICAgICAqIH0pO1xuICAgICAqL1xuICAgIHdhbGtBdFJ1bGVzKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICggIWNhbGxiYWNrICkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBuYW1lO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud2FsayggKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCBjaGlsZC50eXBlID09PSAnYXRydWxlJyApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGNoaWxkLCBpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICggbmFtZSBpbnN0YW5jZW9mIFJlZ0V4cCApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLndhbGsoIChjaGlsZCwgaSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICggY2hpbGQudHlwZSA9PT0gJ2F0cnVsZScgJiYgbmFtZS50ZXN0KGNoaWxkLm5hbWUpICkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud2FsayggKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCBjaGlsZC50eXBlID09PSAnYXRydWxlJyAmJiBjaGlsZC5uYW1lID09PSBuYW1lICkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJhdmVyc2VzIHRoZSBjb250YWluZXLigJlzIGRlc2NlbmRhbnQgbm9kZXMsIGNhbGxpbmcgY2FsbGJhY2tcbiAgICAgKiBmb3IgZWFjaCBjb21tZW50IG5vZGUuXG4gICAgICpcbiAgICAgKiBMaWtlIHtAbGluayBDb250YWluZXIjZWFjaH0sIHRoaXMgbWV0aG9kIGlzIHNhZmVcbiAgICAgKiB0byB1c2UgaWYgeW91IGFyZSBtdXRhdGluZyBhcnJheXMgZHVyaW5nIGl0ZXJhdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Y2hpbGRJdGVyYXRvcn0gY2FsbGJhY2sgLSBpdGVyYXRvciByZWNlaXZlcyBlYWNoIG5vZGUgYW5kIGluZGV4XG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtmYWxzZXx1bmRlZmluZWR9IHJldHVybnMgYGZhbHNlYCBpZiBpdGVyYXRpb24gd2FzIGJyb2tlXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHJvb3Qud2Fsa0NvbW1lbnRzKGNvbW1lbnQgPT4ge1xuICAgICAqICAgY29tbWVudC5yZW1vdmUoKTtcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICB3YWxrQ29tbWVudHMoY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud2FsayggKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgICAgICBpZiAoIGNoaWxkLnR5cGUgPT09ICdjb21tZW50JyApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbnNlcnRzIG5ldyBub2RlcyB0byB0aGUgZW5kIG9mIHRoZSBjb250YWluZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gey4uLihOb2RlfG9iamVjdHxzdHJpbmd8Tm9kZVtdKX0gY2hpbGRyZW4gLSBuZXcgbm9kZXNcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge05vZGV9IHRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpblxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCBkZWNsMSA9IHBvc3Rjc3MuZGVjbCh7IHByb3A6ICdjb2xvcicsIHZhbHVlOiAnYmxhY2snIH0pO1xuICAgICAqIGNvbnN0IGRlY2wyID0gcG9zdGNzcy5kZWNsKHsgcHJvcDogJ2JhY2tncm91bmQtY29sb3InLCB2YWx1ZTogJ3doaXRlJyB9KTtcbiAgICAgKiBydWxlLmFwcGVuZChkZWNsMSwgZGVjbDIpO1xuICAgICAqXG4gICAgICogcm9vdC5hcHBlbmQoeyBuYW1lOiAnY2hhcnNldCcsIHBhcmFtczogJ1wiVVRGLThcIicgfSk7ICAvLyBhdC1ydWxlXG4gICAgICogcm9vdC5hcHBlbmQoeyBzZWxlY3RvcjogJ2EnIH0pOyAgICAgICAgICAgICAgICAgICAgICAgLy8gcnVsZVxuICAgICAqIHJ1bGUuYXBwZW5kKHsgcHJvcDogJ2NvbG9yJywgdmFsdWU6ICdibGFjaycgfSk7ICAgICAgIC8vIGRlY2xhcmF0aW9uXG4gICAgICogcnVsZS5hcHBlbmQoeyB0ZXh0OiAnQ29tbWVudCcgfSkgICAgICAgICAgICAgICAgICAgICAgLy8gY29tbWVudFxuICAgICAqXG4gICAgICogcm9vdC5hcHBlbmQoJ2Ege30nKTtcbiAgICAgKiByb290LmZpcnN0LmFwcGVuZCgnY29sb3I6IGJsYWNrOyB6LWluZGV4OiAxJyk7XG4gICAgICovXG4gICAgYXBwZW5kKC4uLmNoaWxkcmVuKSB7XG4gICAgICAgIGZvciAoIGxldCBjaGlsZCBvZiBjaGlsZHJlbiApIHtcbiAgICAgICAgICAgIGxldCBub2RlcyA9IHRoaXMubm9ybWFsaXplKGNoaWxkLCB0aGlzLmxhc3QpO1xuICAgICAgICAgICAgZm9yICggbGV0IG5vZGUgb2Ygbm9kZXMgKSB0aGlzLm5vZGVzLnB1c2gobm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0cyBuZXcgbm9kZXMgdG8gdGhlIHN0YXJ0IG9mIHRoZSBjb250YWluZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gey4uLihOb2RlfG9iamVjdHxzdHJpbmd8Tm9kZVtdKX0gY2hpbGRyZW4gLSBuZXcgbm9kZXNcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge05vZGV9IHRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpblxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCBkZWNsMSA9IHBvc3Rjc3MuZGVjbCh7IHByb3A6ICdjb2xvcicsIHZhbHVlOiAnYmxhY2snIH0pO1xuICAgICAqIGNvbnN0IGRlY2wyID0gcG9zdGNzcy5kZWNsKHsgcHJvcDogJ2JhY2tncm91bmQtY29sb3InLCB2YWx1ZTogJ3doaXRlJyB9KTtcbiAgICAgKiBydWxlLnByZXBlbmQoZGVjbDEsIGRlY2wyKTtcbiAgICAgKlxuICAgICAqIHJvb3QuYXBwZW5kKHsgbmFtZTogJ2NoYXJzZXQnLCBwYXJhbXM6ICdcIlVURi04XCInIH0pOyAgLy8gYXQtcnVsZVxuICAgICAqIHJvb3QuYXBwZW5kKHsgc2VsZWN0b3I6ICdhJyB9KTsgICAgICAgICAgICAgICAgICAgICAgIC8vIHJ1bGVcbiAgICAgKiBydWxlLmFwcGVuZCh7IHByb3A6ICdjb2xvcicsIHZhbHVlOiAnYmxhY2snIH0pOyAgICAgICAvLyBkZWNsYXJhdGlvblxuICAgICAqIHJ1bGUuYXBwZW5kKHsgdGV4dDogJ0NvbW1lbnQnIH0pICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbW1lbnRcbiAgICAgKlxuICAgICAqIHJvb3QuYXBwZW5kKCdhIHt9Jyk7XG4gICAgICogcm9vdC5maXJzdC5hcHBlbmQoJ2NvbG9yOiBibGFjazsgei1pbmRleDogMScpO1xuICAgICAqL1xuICAgIHByZXBlbmQoLi4uY2hpbGRyZW4pIHtcbiAgICAgICAgY2hpbGRyZW4gPSBjaGlsZHJlbi5yZXZlcnNlKCk7XG4gICAgICAgIGZvciAoIGxldCBjaGlsZCBvZiBjaGlsZHJlbiApIHtcbiAgICAgICAgICAgIGxldCBub2RlcyA9IHRoaXMubm9ybWFsaXplKGNoaWxkLCB0aGlzLmZpcnN0LCAncHJlcGVuZCcpLnJldmVyc2UoKTtcbiAgICAgICAgICAgIGZvciAoIGxldCBub2RlIG9mIG5vZGVzICkgdGhpcy5ub2Rlcy51bnNoaWZ0KG5vZGUpO1xuICAgICAgICAgICAgZm9yICggbGV0IGlkIGluIHRoaXMuaW5kZXhlcyApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ZXNbaWRdID0gdGhpcy5pbmRleGVzW2lkXSArIG5vZGVzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBjbGVhblJhd3Moa2VlcEJldHdlZW4pIHtcbiAgICAgICAgc3VwZXIuY2xlYW5SYXdzKGtlZXBCZXR3ZWVuKTtcbiAgICAgICAgaWYgKCB0aGlzLm5vZGVzICkge1xuICAgICAgICAgICAgZm9yICggbGV0IG5vZGUgb2YgdGhpcy5ub2RlcyApIG5vZGUuY2xlYW5SYXdzKGtlZXBCZXR3ZWVuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluc2VydCBuZXcgbm9kZSBiZWZvcmUgb2xkIG5vZGUgd2l0aGluIHRoZSBjb250YWluZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge05vZGV8bnVtYmVyfSBleGlzdCAgICAgICAgICAgICAtIGNoaWxkIG9yIGNoaWxk4oCZcyBpbmRleC5cbiAgICAgKiBAcGFyYW0ge05vZGV8b2JqZWN0fHN0cmluZ3xOb2RlW119IGFkZCAtIG5ldyBub2RlXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtOb2RlfSB0aGlzIG5vZGUgZm9yIG1ldGhvZHMgY2hhaW5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcnVsZS5pbnNlcnRCZWZvcmUoZGVjbCwgZGVjbC5jbG9uZSh7IHByb3A6ICctd2Via2l0LScgKyBkZWNsLnByb3AgfSkpO1xuICAgICAqL1xuICAgIGluc2VydEJlZm9yZShleGlzdCwgYWRkKSB7XG4gICAgICAgIGV4aXN0ID0gdGhpcy5pbmRleChleGlzdCk7XG5cbiAgICAgICAgbGV0IHR5cGUgID0gZXhpc3QgPT09IDAgPyAncHJlcGVuZCcgOiBmYWxzZTtcbiAgICAgICAgbGV0IG5vZGVzID0gdGhpcy5ub3JtYWxpemUoYWRkLCB0aGlzLm5vZGVzW2V4aXN0XSwgdHlwZSkucmV2ZXJzZSgpO1xuICAgICAgICBmb3IgKCBsZXQgbm9kZSBvZiBub2RlcyApIHRoaXMubm9kZXMuc3BsaWNlKGV4aXN0LCAwLCBub2RlKTtcblxuICAgICAgICBsZXQgaW5kZXg7XG4gICAgICAgIGZvciAoIGxldCBpZCBpbiB0aGlzLmluZGV4ZXMgKSB7XG4gICAgICAgICAgICBpbmRleCA9IHRoaXMuaW5kZXhlc1tpZF07XG4gICAgICAgICAgICBpZiAoIGV4aXN0IDw9IGluZGV4ICkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXhlc1tpZF0gPSBpbmRleCArIG5vZGVzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluc2VydCBuZXcgbm9kZSBhZnRlciBvbGQgbm9kZSB3aXRoaW4gdGhlIGNvbnRhaW5lci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Tm9kZXxudW1iZXJ9IGV4aXN0ICAgICAgICAgICAgIC0gY2hpbGQgb3IgY2hpbGTigJlzIGluZGV4XG4gICAgICogQHBhcmFtIHtOb2RlfG9iamVjdHxzdHJpbmd8Tm9kZVtdfSBhZGQgLSBuZXcgbm9kZVxuICAgICAqXG4gICAgICogQHJldHVybiB7Tm9kZX0gdGhpcyBub2RlIGZvciBtZXRob2RzIGNoYWluXG4gICAgICovXG4gICAgaW5zZXJ0QWZ0ZXIoZXhpc3QsIGFkZCkge1xuICAgICAgICBleGlzdCA9IHRoaXMuaW5kZXgoZXhpc3QpO1xuXG4gICAgICAgIGxldCBub2RlcyA9IHRoaXMubm9ybWFsaXplKGFkZCwgdGhpcy5ub2Rlc1tleGlzdF0pLnJldmVyc2UoKTtcbiAgICAgICAgZm9yICggbGV0IG5vZGUgb2Ygbm9kZXMgKSB0aGlzLm5vZGVzLnNwbGljZShleGlzdCArIDEsIDAsIG5vZGUpO1xuXG4gICAgICAgIGxldCBpbmRleDtcbiAgICAgICAgZm9yICggbGV0IGlkIGluIHRoaXMuaW5kZXhlcyApIHtcbiAgICAgICAgICAgIGluZGV4ID0gdGhpcy5pbmRleGVzW2lkXTtcbiAgICAgICAgICAgIGlmICggZXhpc3QgPCBpbmRleCApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ZXNbaWRdID0gaW5kZXggKyBub2Rlcy5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIG5vZGUgZnJvbSB0aGUgY29udGFpbmVyIGFuZCBjbGVhbnMgdGhlIHBhcmVudCBwcm9wZXJ0aWVzXG4gICAgICogZnJvbSB0aGUgbm9kZSBhbmQgaXRzIGNoaWxkcmVuLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtOb2RlfG51bWJlcn0gY2hpbGQgLSBjaGlsZCBvciBjaGlsZOKAmXMgaW5kZXhcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge05vZGV9IHRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpblxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBydWxlLm5vZGVzLmxlbmd0aCAgLy89PiA1XG4gICAgICogcnVsZS5yZW1vdmVDaGlsZChkZWNsKTtcbiAgICAgKiBydWxlLm5vZGVzLmxlbmd0aCAgLy89PiA0XG4gICAgICogZGVjbC5wYXJlbnQgICAgICAgIC8vPT4gdW5kZWZpbmVkXG4gICAgICovXG4gICAgcmVtb3ZlQ2hpbGQoY2hpbGQpIHtcbiAgICAgICAgY2hpbGQgPSB0aGlzLmluZGV4KGNoaWxkKTtcbiAgICAgICAgdGhpcy5ub2Rlc1tjaGlsZF0ucGFyZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm5vZGVzLnNwbGljZShjaGlsZCwgMSk7XG5cbiAgICAgICAgbGV0IGluZGV4O1xuICAgICAgICBmb3IgKCBsZXQgaWQgaW4gdGhpcy5pbmRleGVzICkge1xuICAgICAgICAgICAgaW5kZXggPSB0aGlzLmluZGV4ZXNbaWRdO1xuICAgICAgICAgICAgaWYgKCBpbmRleCA+PSBjaGlsZCApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ZXNbaWRdID0gaW5kZXggLSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhbGwgY2hpbGRyZW4gZnJvbSB0aGUgY29udGFpbmVyXG4gICAgICogYW5kIGNsZWFucyB0aGVpciBwYXJlbnQgcHJvcGVydGllcy5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge05vZGV9IHRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpblxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBydWxlLnJlbW92ZUFsbCgpO1xuICAgICAqIHJ1bGUubm9kZXMubGVuZ3RoIC8vPT4gMFxuICAgICAqL1xuICAgIHJlbW92ZUFsbCgpIHtcbiAgICAgICAgZm9yICggbGV0IG5vZGUgb2YgdGhpcy5ub2RlcyApIG5vZGUucGFyZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm5vZGVzID0gW107XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhc3NlcyBhbGwgZGVjbGFyYXRpb24gdmFsdWVzIHdpdGhpbiB0aGUgY29udGFpbmVyIHRoYXQgbWF0Y2ggcGF0dGVyblxuICAgICAqIHRocm91Z2ggY2FsbGJhY2ssIHJlcGxhY2luZyB0aG9zZSB2YWx1ZXMgd2l0aCB0aGUgcmV0dXJuZWQgcmVzdWx0XG4gICAgICogb2YgY2FsbGJhY2suXG4gICAgICpcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyB1c2VmdWwgaWYgeW91IGFyZSB1c2luZyBhIGN1c3RvbSB1bml0IG9yIGZ1bmN0aW9uXG4gICAgICogYW5kIG5lZWQgdG8gaXRlcmF0ZSB0aHJvdWdoIGFsbCB2YWx1ZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xSZWdFeHB9IHBhdHRlcm4gICAgICAtIHJlcGxhY2UgcGF0dGVyblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRzICAgICAgICAgICAgICAgIC0gb3B0aW9ucyB0byBzcGVlZCB1cCB0aGUgc2VhcmNoXG4gICAgICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IG9wdHMucHJvcHMgLSBhbiBhcnJheSBvZiBwcm9wZXJ0eSBuYW1lc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmZhc3QgICAgICAgICAgIC0gc3RyaW5nIHRoYXTigJlzIHVzZWRcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvIG5hcnJvdyBkb3duIHZhbHVlcyBhbmQgc3BlZWQgdXBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSByZWdleHAgc2VhcmNoXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbnxzdHJpbmd9IGNhbGxiYWNrICAgLSBzdHJpbmcgdG8gcmVwbGFjZSBwYXR0ZXJuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvciBjYWxsYmFjayB0aGF0IHJldHVybnMgYSBuZXdcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlIGNhbGxiYWNrIHdpbGwgcmVjZWl2ZVxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIHNhbWUgYXJndW1lbnRzIGFzIHRob3NlXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXNzZWQgdG8gYSBmdW5jdGlvbiBwYXJhbWV0ZXJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mIGBTdHJpbmcjcmVwbGFjZWAuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtOb2RlfSB0aGlzIG5vZGUgZm9yIG1ldGhvZHMgY2hhaW5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcm9vdC5yZXBsYWNlVmFsdWVzKC9cXGQrcmVtLywgeyBmYXN0OiAncmVtJyB9LCBzdHJpbmcgPT4ge1xuICAgICAqICAgcmV0dXJuIDE1ICogcGFyc2VJbnQoc3RyaW5nKSArICdweCc7XG4gICAgICogfSk7XG4gICAgICovXG4gICAgcmVwbGFjZVZhbHVlcyhwYXR0ZXJuLCBvcHRzLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoICFjYWxsYmFjayApIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICAgICAgICAgIG9wdHMgPSB7IH07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLndhbGtEZWNscyggZGVjbCA9PiB7XG4gICAgICAgICAgICBpZiAoIG9wdHMucHJvcHMgJiYgb3B0cy5wcm9wcy5pbmRleE9mKGRlY2wucHJvcCkgPT09IC0xICkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCBvcHRzLmZhc3QgICYmIGRlY2wudmFsdWUuaW5kZXhPZihvcHRzLmZhc3QpID09PSAtMSApIHJldHVybjtcblxuICAgICAgICAgICAgZGVjbC52YWx1ZSA9IGRlY2wudmFsdWUucmVwbGFjZShwYXR0ZXJuLCBjYWxsYmFjayk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYHRydWVgIGlmIGNhbGxiYWNrIHJldHVybnMgYHRydWVgXG4gICAgICogZm9yIGFsbCBvZiB0aGUgY29udGFpbmVy4oCZcyBjaGlsZHJlbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Y2hpbGRDb25kaXRpb259IGNvbmRpdGlvbiAtIGl0ZXJhdG9yIHJldHVybnMgdHJ1ZSBvciBmYWxzZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IGlzIGV2ZXJ5IGNoaWxkIHBhc3MgY29uZGl0aW9uXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IG5vUHJlZml4ZXMgPSBydWxlLmV2ZXJ5KGkgPT4gaS5wcm9wWzBdICE9PSAnLScpO1xuICAgICAqL1xuICAgIGV2ZXJ5KGNvbmRpdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5ub2Rlcy5ldmVyeShjb25kaXRpb24pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYHRydWVgIGlmIGNhbGxiYWNrIHJldHVybnMgYHRydWVgIGZvciAoYXQgbGVhc3QpIG9uZVxuICAgICAqIG9mIHRoZSBjb250YWluZXLigJlzIGNoaWxkcmVuLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtjaGlsZENvbmRpdGlvbn0gY29uZGl0aW9uIC0gaXRlcmF0b3IgcmV0dXJucyB0cnVlIG9yIGZhbHNlLlxuICAgICAqXG4gICAgICogQHJldHVybiB7Ym9vbGVhbn0gaXMgc29tZSBjaGlsZCBwYXNzIGNvbmRpdGlvblxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCBoYXNQcmVmaXggPSBydWxlLnNvbWUoaSA9PiBpLnByb3BbMF0gPT09ICctJyk7XG4gICAgICovXG4gICAgc29tZShjb25kaXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubm9kZXMuc29tZShjb25kaXRpb24pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBgY2hpbGRg4oCZcyBpbmRleCB3aXRoaW4gdGhlIHtAbGluayBDb250YWluZXIjbm9kZXN9IGFycmF5LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtOb2RlfSBjaGlsZCAtIGNoaWxkIG9mIHRoZSBjdXJyZW50IGNvbnRhaW5lci5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge251bWJlcn0gY2hpbGQgaW5kZXhcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcnVsZS5pbmRleCggcnVsZS5ub2Rlc1syXSApIC8vPT4gMlxuICAgICAqL1xuICAgIGluZGV4KGNoaWxkKSB7XG4gICAgICAgIGlmICggdHlwZW9mIGNoaWxkID09PSAnbnVtYmVyJyApIHtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGVzLmluZGV4T2YoY2hpbGQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIGNvbnRhaW5lcuKAmXMgZmlyc3QgY2hpbGQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7Tm9kZX1cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcnVsZS5maXJzdCA9PSBydWxlcy5ub2Rlc1swXTtcbiAgICAgKi9cbiAgICBnZXQgZmlyc3QoKSB7XG4gICAgICAgIGlmICggIXRoaXMubm9kZXMgKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gdGhpcy5ub2Rlc1swXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgY29udGFpbmVy4oCZcyBsYXN0IGNoaWxkLlxuICAgICAqXG4gICAgICogQHR5cGUge05vZGV9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHJ1bGUubGFzdCA9PSBydWxlLm5vZGVzW3J1bGUubm9kZXMubGVuZ3RoIC0gMV07XG4gICAgICovXG4gICAgZ2V0IGxhc3QoKSB7XG4gICAgICAgIGlmICggIXRoaXMubm9kZXMgKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gdGhpcy5ub2Rlc1t0aGlzLm5vZGVzLmxlbmd0aCAtIDFdO1xuICAgIH1cblxuICAgIG5vcm1hbGl6ZShub2Rlcywgc2FtcGxlKSB7XG4gICAgICAgIGlmICggdHlwZW9mIG5vZGVzID09PSAnc3RyaW5nJyApIHtcbiAgICAgICAgICAgIGxldCBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKTtcbiAgICAgICAgICAgIG5vZGVzID0gY2xlYW5Tb3VyY2UocGFyc2Uobm9kZXMpLm5vZGVzKTtcbiAgICAgICAgfSBlbHNlIGlmICggQXJyYXkuaXNBcnJheShub2RlcykgKSB7XG4gICAgICAgICAgICBub2RlcyA9IG5vZGVzLnNsaWNlKDApO1xuICAgICAgICB9IGVsc2UgaWYgKCBub2Rlcy50eXBlID09PSAncm9vdCcgKSB7XG4gICAgICAgICAgICBub2RlcyA9IG5vZGVzLm5vZGVzLnNsaWNlKDApO1xuICAgICAgICB9IGVsc2UgaWYgKCBub2Rlcy50eXBlICkge1xuICAgICAgICAgICAgbm9kZXMgPSBbbm9kZXNdO1xuICAgICAgICB9IGVsc2UgaWYgKCBub2Rlcy5wcm9wICkge1xuICAgICAgICAgICAgaWYgKCB0eXBlb2Ygbm9kZXMudmFsdWUgPT09ICd1bmRlZmluZWQnICkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVmFsdWUgZmllbGQgaXMgbWlzc2VkIGluIG5vZGUgY3JlYXRpb24nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIHR5cGVvZiBub2Rlcy52YWx1ZSAhPT0gJ3N0cmluZycgKSB7XG4gICAgICAgICAgICAgICAgbm9kZXMudmFsdWUgPSBTdHJpbmcobm9kZXMudmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZXMgPSBbbmV3IERlY2xhcmF0aW9uKG5vZGVzKV07XG4gICAgICAgIH0gZWxzZSBpZiAoIG5vZGVzLnNlbGVjdG9yICkge1xuICAgICAgICAgICAgbGV0IFJ1bGUgPSByZXF1aXJlKCcuL3J1bGUnKTtcbiAgICAgICAgICAgIG5vZGVzID0gW25ldyBSdWxlKG5vZGVzKV07XG4gICAgICAgIH0gZWxzZSBpZiAoIG5vZGVzLm5hbWUgKSB7XG4gICAgICAgICAgICBsZXQgQXRSdWxlID0gcmVxdWlyZSgnLi9hdC1ydWxlJyk7XG4gICAgICAgICAgICBub2RlcyA9IFtuZXcgQXRSdWxlKG5vZGVzKV07XG4gICAgICAgIH0gZWxzZSBpZiAoIG5vZGVzLnRleHQgKSB7XG4gICAgICAgICAgICBub2RlcyA9IFtuZXcgQ29tbWVudChub2RlcyldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIG5vZGUgdHlwZSBpbiBub2RlIGNyZWF0aW9uJyk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcHJvY2Vzc2VkID0gbm9kZXMubWFwKCBpID0+IHtcbiAgICAgICAgICAgIGlmICggdHlwZW9mIGkuYmVmb3JlICE9PSAnZnVuY3Rpb24nICkgaSA9IHRoaXMucmVidWlsZChpKTtcblxuICAgICAgICAgICAgaWYgKCBpLnBhcmVudCApIGkucGFyZW50LnJlbW92ZUNoaWxkKGkpO1xuICAgICAgICAgICAgaWYgKCB0eXBlb2YgaS5yYXdzLmJlZm9yZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBzYW1wbGUgJiYgdHlwZW9mIHNhbXBsZS5yYXdzLmJlZm9yZSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICAgICAgICAgICAgICAgIGkucmF3cy5iZWZvcmUgPSBzYW1wbGUucmF3cy5iZWZvcmUucmVwbGFjZSgvW15cXHNdL2csICcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpLnBhcmVudCA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHByb2Nlc3NlZDtcbiAgICB9XG5cbiAgICByZWJ1aWxkKG5vZGUsIHBhcmVudCkge1xuICAgICAgICBsZXQgZml4O1xuICAgICAgICBpZiAoIG5vZGUudHlwZSA9PT0gJ3Jvb3QnICkge1xuICAgICAgICAgICAgbGV0IFJvb3QgPSByZXF1aXJlKCcuL3Jvb3QnKTtcbiAgICAgICAgICAgIGZpeCA9IG5ldyBSb290KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIG5vZGUudHlwZSA9PT0gJ2F0cnVsZScgKSB7XG4gICAgICAgICAgICBsZXQgQXRSdWxlID0gcmVxdWlyZSgnLi9hdC1ydWxlJyk7XG4gICAgICAgICAgICBmaXggPSBuZXcgQXRSdWxlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIG5vZGUudHlwZSA9PT0gJ3J1bGUnICkge1xuICAgICAgICAgICAgbGV0IFJ1bGUgPSByZXF1aXJlKCcuL3J1bGUnKTtcbiAgICAgICAgICAgIGZpeCA9IG5ldyBSdWxlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIG5vZGUudHlwZSA9PT0gJ2RlY2wnICkge1xuICAgICAgICAgICAgZml4ID0gbmV3IERlY2xhcmF0aW9uKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIG5vZGUudHlwZSA9PT0gJ2NvbW1lbnQnICkge1xuICAgICAgICAgICAgZml4ID0gbmV3IENvbW1lbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoIGxldCBpIGluIG5vZGUgKSB7XG4gICAgICAgICAgICBpZiAoIGkgPT09ICdub2RlcycgKSB7XG4gICAgICAgICAgICAgICAgZml4Lm5vZGVzID0gbm9kZS5ub2Rlcy5tYXAoIGogPT4gdGhpcy5yZWJ1aWxkKGosIGZpeCkgKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIGkgPT09ICdwYXJlbnQnICYmIHBhcmVudCApIHtcbiAgICAgICAgICAgICAgICBmaXgucGFyZW50ID0gcGFyZW50O1xuICAgICAgICAgICAgfSBlbHNlIGlmICggbm9kZS5oYXNPd25Qcm9wZXJ0eShpKSApIHtcbiAgICAgICAgICAgICAgICBmaXhbaV0gPSBub2RlW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZpeDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyb2YgQ29udGFpbmVyI1xuICAgICAqIEBtZW1iZXIge05vZGVbXX0gbm9kZXMgLSBhbiBhcnJheSBjb250YWluaW5nIHRoZSBjb250YWluZXLigJlzIGNoaWxkcmVuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IHJvb3QgPSBwb3N0Y3NzLnBhcnNlKCdhIHsgY29sb3I6IGJsYWNrIH0nKTtcbiAgICAgKiByb290Lm5vZGVzLmxlbmd0aCAgICAgICAgICAgLy89PiAxXG4gICAgICogcm9vdC5ub2Rlc1swXS5zZWxlY3RvciAgICAgIC8vPT4gJ2EnXG4gICAgICogcm9vdC5ub2Rlc1swXS5ub2Rlc1swXS5wcm9wIC8vPT4gJ2NvbG9yJ1xuICAgICAqL1xuXG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbnRhaW5lcjtcblxuXG4vKipcbiAqIEBjYWxsYmFjayBjaGlsZENvbmRpdGlvblxuICogQHBhcmFtIHtOb2RlfSBub2RlICAgIC0gY29udGFpbmVyIGNoaWxkXG4gKiBAcGFyYW0ge251bWJlcn0gaW5kZXggLSBjaGlsZCBpbmRleFxuICogQHBhcmFtIHtOb2RlW119IG5vZGVzIC0gYWxsIGNvbnRhaW5lciBjaGlsZHJlblxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuXG4vKipcbiAqIEBjYWxsYmFjayBjaGlsZEl0ZXJhdG9yXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgICAgLSBjb250YWluZXIgY2hpbGRcbiAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIGNoaWxkIGluZGV4XG4gKiBAcmV0dXJuIHtmYWxzZXx1bmRlZmluZWR9IHJldHVybmluZyBgZmFsc2VgIHdpbGwgYnJlYWsgaXRlcmF0aW9uXG4gKi9cbiJdfQ==
