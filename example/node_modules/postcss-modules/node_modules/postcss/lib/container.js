"use strict";

exports.__esModule = true;
exports.default = void 0;

var _declaration = _interopRequireDefault(require("./declaration"));

var _comment = _interopRequireDefault(require("./comment"));

var _node = _interopRequireDefault(require("./node"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } it = o[Symbol.iterator](); return it.next.bind(it); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

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


var Container = /*#__PURE__*/function (_Node) {
  _inheritsLoose(Container, _Node);

  function Container() {
    return _Node.apply(this, arguments) || this;
  }

  var _proto = Container.prototype;

  _proto.push = function push(child) {
    child.parent = this;
    this.nodes.push(child);
    return this;
  }
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
   * @param {childIterator} callback Iterator receives each node and index.
   *
   * @return {false|undefined} Returns `false` if iteration was broke.
   *
   * @example
   * const root = postcss.parse('a { color: black; z-index: 1 }')
   * const rule = root.first
   *
   * for (const decl of rule.nodes) {
   *   decl.cloneBefore({ prop: '-webkit-' + decl.prop })
   *   // Cycle will be infinite, because cloneBefore moves the current node
   *   // to the next index
   * }
   *
   * rule.each(decl => {
   *   decl.cloneBefore({ prop: '-webkit-' + decl.prop })
   *   // Will be executed only for color and z-index
   * })
   */
  ;

  _proto.each = function each(callback) {
    if (!this.lastEach) this.lastEach = 0;
    if (!this.indexes) this.indexes = {};
    this.lastEach += 1;
    var id = this.lastEach;
    this.indexes[id] = 0;
    if (!this.nodes) return undefined;
    var index, result;

    while (this.indexes[id] < this.nodes.length) {
      index = this.indexes[id];
      result = callback(this.nodes[index], index);
      if (result === false) break;
      this.indexes[id] += 1;
    }

    delete this.indexes[id];
    return result;
  }
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
   * @param {childIterator} callback Iterator receives each node and index.
   *
   * @return {false|undefined} Returns `false` if iteration was broke.
   *
   * @example
   * root.walk(node => {
   *   // Traverses all descendant nodes.
   * })
   */
  ;

  _proto.walk = function walk(callback) {
    return this.each(function (child, i) {
      var result;

      try {
        result = callback(child, i);
      } catch (e) {
        e.postcssNode = child;

        if (e.stack && child.source && /\n\s{4}at /.test(e.stack)) {
          var s = child.source;
          e.stack = e.stack.replace(/\n\s{4}at /, "$&" + s.input.from + ":" + s.start.line + ":" + s.start.column + "$&");
        }

        throw e;
      }

      if (result !== false && child.walk) {
        result = child.walk(callback);
      }

      return result;
    });
  }
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
   * @param {string|RegExp} [prop]   String or regular expression
   *                                 to filter declarations by property name.
   * @param {childIterator} callback Iterator receives each node and index.
   *
   * @return {false|undefined} Returns `false` if iteration was broke.
   *
   * @example
   * root.walkDecls(decl => {
   *   checkPropertySupport(decl.prop)
   * })
   *
   * root.walkDecls('border-radius', decl => {
   *   decl.remove()
   * })
   *
   * root.walkDecls(/^background/, decl => {
   *   decl.value = takeFirstColorFromGradient(decl.value)
   * })
   */
  ;

  _proto.walkDecls = function walkDecls(prop, callback) {
    if (!callback) {
      callback = prop;
      return this.walk(function (child, i) {
        if (child.type === 'decl') {
          return callback(child, i);
        }
      });
    }

    if (prop instanceof RegExp) {
      return this.walk(function (child, i) {
        if (child.type === 'decl' && prop.test(child.prop)) {
          return callback(child, i);
        }
      });
    }

    return this.walk(function (child, i) {
      if (child.type === 'decl' && child.prop === prop) {
        return callback(child, i);
      }
    });
  }
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
   * @param {string|RegExp} [selector] String or regular expression
   *                                   to filter rules by selector.
   * @param {childIterator} callback   Iterator receives each node and index.
   *
   * @return {false|undefined} returns `false` if iteration was broke.
   *
   * @example
   * const selectors = []
   * root.walkRules(rule => {
   *   selectors.push(rule.selector)
   * })
   * console.log(`Your CSS uses ${ selectors.length } selectors`)
   */
  ;

  _proto.walkRules = function walkRules(selector, callback) {
    if (!callback) {
      callback = selector;
      return this.walk(function (child, i) {
        if (child.type === 'rule') {
          return callback(child, i);
        }
      });
    }

    if (selector instanceof RegExp) {
      return this.walk(function (child, i) {
        if (child.type === 'rule' && selector.test(child.selector)) {
          return callback(child, i);
        }
      });
    }

    return this.walk(function (child, i) {
      if (child.type === 'rule' && child.selector === selector) {
        return callback(child, i);
      }
    });
  }
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
   * @param {string|RegExp} [name]   String or regular expression
   *                                 to filter at-rules by name.
   * @param {childIterator} callback Iterator receives each node and index.
   *
   * @return {false|undefined} Returns `false` if iteration was broke.
   *
   * @example
   * root.walkAtRules(rule => {
   *   if (isOld(rule.name)) rule.remove()
   * })
   *
   * let first = false
   * root.walkAtRules('charset', rule => {
   *   if (!first) {
   *     first = true
   *   } else {
   *     rule.remove()
   *   }
   * })
   */
  ;

  _proto.walkAtRules = function walkAtRules(name, callback) {
    if (!callback) {
      callback = name;
      return this.walk(function (child, i) {
        if (child.type === 'atrule') {
          return callback(child, i);
        }
      });
    }

    if (name instanceof RegExp) {
      return this.walk(function (child, i) {
        if (child.type === 'atrule' && name.test(child.name)) {
          return callback(child, i);
        }
      });
    }

    return this.walk(function (child, i) {
      if (child.type === 'atrule' && child.name === name) {
        return callback(child, i);
      }
    });
  }
  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each comment node.
   *
   * Like {@link Container#each}, this method is safe
   * to use if you are mutating arrays during iteration.
   *
   * @param {childIterator} callback Iterator receives each node and index.
   *
   * @return {false|undefined} Returns `false` if iteration was broke.
   *
   * @example
   * root.walkComments(comment => {
   *   comment.remove()
   * })
   */
  ;

  _proto.walkComments = function walkComments(callback) {
    return this.walk(function (child, i) {
      if (child.type === 'comment') {
        return callback(child, i);
      }
    });
  }
  /**
   * Inserts new nodes to the end of the container.
   *
   * @param {...(Node|object|string|Node[])} children New nodes.
   *
   * @return {Node} This node for methods chain.
   *
   * @example
   * const decl1 = postcss.decl({ prop: 'color', value: 'black' })
   * const decl2 = postcss.decl({ prop: 'background-color', value: 'white' })
   * rule.append(decl1, decl2)
   *
   * root.append({ name: 'charset', params: '"UTF-8"' })  // at-rule
   * root.append({ selector: 'a' })                       // rule
   * rule.append({ prop: 'color', value: 'black' })       // declaration
   * rule.append({ text: 'Comment' })                     // comment
   *
   * root.append('a {}')
   * root.first.append('color: black; z-index: 1')
   */
  ;

  _proto.append = function append() {
    for (var _len = arguments.length, children = new Array(_len), _key = 0; _key < _len; _key++) {
      children[_key] = arguments[_key];
    }

    for (var _i = 0, _children = children; _i < _children.length; _i++) {
      var child = _children[_i];
      var nodes = this.normalize(child, this.last);

      for (var _iterator = _createForOfIteratorHelperLoose(nodes), _step; !(_step = _iterator()).done;) {
        var node = _step.value;
        this.nodes.push(node);
      }
    }

    return this;
  }
  /**
   * Inserts new nodes to the start of the container.
   *
   * @param {...(Node|object|string|Node[])} children New nodes.
   *
   * @return {Node} This node for methods chain.
   *
   * @example
   * const decl1 = postcss.decl({ prop: 'color', value: 'black' })
   * const decl2 = postcss.decl({ prop: 'background-color', value: 'white' })
   * rule.prepend(decl1, decl2)
   *
   * root.append({ name: 'charset', params: '"UTF-8"' })  // at-rule
   * root.append({ selector: 'a' })                       // rule
   * rule.append({ prop: 'color', value: 'black' })       // declaration
   * rule.append({ text: 'Comment' })                     // comment
   *
   * root.append('a {}')
   * root.first.append('color: black; z-index: 1')
   */
  ;

  _proto.prepend = function prepend() {
    for (var _len2 = arguments.length, children = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      children[_key2] = arguments[_key2];
    }

    children = children.reverse();

    for (var _iterator2 = _createForOfIteratorHelperLoose(children), _step2; !(_step2 = _iterator2()).done;) {
      var child = _step2.value;
      var nodes = this.normalize(child, this.first, 'prepend').reverse();

      for (var _iterator3 = _createForOfIteratorHelperLoose(nodes), _step3; !(_step3 = _iterator3()).done;) {
        var node = _step3.value;
        this.nodes.unshift(node);
      }

      for (var id in this.indexes) {
        this.indexes[id] = this.indexes[id] + nodes.length;
      }
    }

    return this;
  };

  _proto.cleanRaws = function cleanRaws(keepBetween) {
    _Node.prototype.cleanRaws.call(this, keepBetween);

    if (this.nodes) {
      for (var _iterator4 = _createForOfIteratorHelperLoose(this.nodes), _step4; !(_step4 = _iterator4()).done;) {
        var node = _step4.value;
        node.cleanRaws(keepBetween);
      }
    }
  }
  /**
   * Insert new node before old node within the container.
   *
   * @param {Node|number} exist             Child or child’s index.
   * @param {Node|object|string|Node[]} add New node.
   *
   * @return {Node} This node for methods chain.
   *
   * @example
   * rule.insertBefore(decl, decl.clone({ prop: '-webkit-' + decl.prop }))
   */
  ;

  _proto.insertBefore = function insertBefore(exist, add) {
    exist = this.index(exist);
    var type = exist === 0 ? 'prepend' : false;
    var nodes = this.normalize(add, this.nodes[exist], type).reverse();

    for (var _iterator5 = _createForOfIteratorHelperLoose(nodes), _step5; !(_step5 = _iterator5()).done;) {
      var node = _step5.value;
      this.nodes.splice(exist, 0, node);
    }

    var index;

    for (var id in this.indexes) {
      index = this.indexes[id];

      if (exist <= index) {
        this.indexes[id] = index + nodes.length;
      }
    }

    return this;
  }
  /**
   * Insert new node after old node within the container.
   *
   * @param {Node|number} exist             Child or child’s index.
   * @param {Node|object|string|Node[]} add New node.
   *
   * @return {Node} This node for methods chain.
   */
  ;

  _proto.insertAfter = function insertAfter(exist, add) {
    exist = this.index(exist);
    var nodes = this.normalize(add, this.nodes[exist]).reverse();

    for (var _iterator6 = _createForOfIteratorHelperLoose(nodes), _step6; !(_step6 = _iterator6()).done;) {
      var node = _step6.value;
      this.nodes.splice(exist + 1, 0, node);
    }

    var index;

    for (var id in this.indexes) {
      index = this.indexes[id];

      if (exist < index) {
        this.indexes[id] = index + nodes.length;
      }
    }

    return this;
  }
  /**
   * Removes node from the container and cleans the parent properties
   * from the node and its children.
   *
   * @param {Node|number} child Child or child’s index.
   *
   * @return {Node} This node for methods chain
   *
   * @example
   * rule.nodes.length  //=> 5
   * rule.removeChild(decl)
   * rule.nodes.length  //=> 4
   * decl.parent        //=> undefined
   */
  ;

  _proto.removeChild = function removeChild(child) {
    child = this.index(child);
    this.nodes[child].parent = undefined;
    this.nodes.splice(child, 1);
    var index;

    for (var id in this.indexes) {
      index = this.indexes[id];

      if (index >= child) {
        this.indexes[id] = index - 1;
      }
    }

    return this;
  }
  /**
   * Removes all children from the container
   * and cleans their parent properties.
   *
   * @return {Node} This node for methods chain.
   *
   * @example
   * rule.removeAll()
   * rule.nodes.length //=> 0
   */
  ;

  _proto.removeAll = function removeAll() {
    for (var _iterator7 = _createForOfIteratorHelperLoose(this.nodes), _step7; !(_step7 = _iterator7()).done;) {
      var node = _step7.value;
      node.parent = undefined;
    }

    this.nodes = [];
    return this;
  }
  /**
   * Passes all declaration values within the container that match pattern
   * through callback, replacing those values with the returned result
   * of callback.
   *
   * This method is useful if you are using a custom unit or function
   * and need to iterate through all values.
   *
   * @param {string|RegExp} pattern      Replace pattern.
   * @param {object} opts                Options to speed up the search.
   * @param {string|string[]} opts.props An array of property names.
   * @param {string} opts.fast           String that’s used to narrow down
   *                                     values and speed up the regexp search.
   * @param {function|string} callback   String to replace pattern or callback
   *                                     that returns a new value. The callback
   *                                     will receive the same arguments
   *                                     as those passed to a function parameter
   *                                     of `String#replace`.
   *
   * @return {Node} This node for methods chain.
   *
   * @example
   * root.replaceValues(/\d+rem/, { fast: 'rem' }, string => {
   *   return 15 * parseInt(string) + 'px'
   * })
   */
  ;

  _proto.replaceValues = function replaceValues(pattern, opts, callback) {
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
  }
  /**
   * Returns `true` if callback returns `true`
   * for all of the container’s children.
   *
   * @param {childCondition} condition Iterator returns true or false.
   *
   * @return {boolean} Is every child pass condition.
   *
   * @example
   * const noPrefixes = rule.every(i => i.prop[0] !== '-')
   */
  ;

  _proto.every = function every(condition) {
    return this.nodes.every(condition);
  }
  /**
   * Returns `true` if callback returns `true` for (at least) one
   * of the container’s children.
   *
   * @param {childCondition} condition Iterator returns true or false.
   *
   * @return {boolean} Is some child pass condition.
   *
   * @example
   * const hasPrefix = rule.some(i => i.prop[0] === '-')
   */
  ;

  _proto.some = function some(condition) {
    return this.nodes.some(condition);
  }
  /**
   * Returns a `child`’s index within the {@link Container#nodes} array.
   *
   * @param {Node} child Child of the current container.
   *
   * @return {number} Child index.
   *
   * @example
   * rule.index( rule.nodes[2] ) //=> 2
   */
  ;

  _proto.index = function index(child) {
    if (typeof child === 'number') {
      return child;
    }

    return this.nodes.indexOf(child);
  }
  /**
   * The container’s first child.
   *
   * @type {Node}
   *
   * @example
   * rule.first === rules.nodes[0]
   */
  ;

  _proto.normalize = function normalize(nodes, sample) {
    var _this = this;

    if (typeof nodes === 'string') {
      var parse = require('./parse');

      nodes = cleanSource(parse(nodes).nodes);
    } else if (Array.isArray(nodes)) {
      nodes = nodes.slice(0);

      for (var _iterator8 = _createForOfIteratorHelperLoose(nodes), _step8; !(_step8 = _iterator8()).done;) {
        var i = _step8.value;
        if (i.parent) i.parent.removeChild(i, 'ignore');
      }
    } else if (nodes.type === 'root') {
      nodes = nodes.nodes.slice(0);

      for (var _iterator9 = _createForOfIteratorHelperLoose(nodes), _step9; !(_step9 = _iterator9()).done;) {
        var _i2 = _step9.value;
        if (_i2.parent) _i2.parent.removeChild(_i2, 'ignore');
      }
    } else if (nodes.type) {
      nodes = [nodes];
    } else if (nodes.prop) {
      if (typeof nodes.value === 'undefined') {
        throw new Error('Value field is missed in node creation');
      } else if (typeof nodes.value !== 'string') {
        nodes.value = String(nodes.value);
      }

      nodes = [new _declaration.default(nodes)];
    } else if (nodes.selector) {
      var Rule = require('./rule');

      nodes = [new Rule(nodes)];
    } else if (nodes.name) {
      var AtRule = require('./at-rule');

      nodes = [new AtRule(nodes)];
    } else if (nodes.text) {
      nodes = [new _comment.default(nodes)];
    } else {
      throw new Error('Unknown node type in node creation');
    }

    var processed = nodes.map(function (i) {
      if (i.parent) i.parent.removeChild(i);

      if (typeof i.raws.before === 'undefined') {
        if (sample && typeof sample.raws.before !== 'undefined') {
          i.raws.before = sample.raws.before.replace(/[^\s]/g, '');
        }
      }

      i.parent = _this;
      return i;
    });
    return processed;
  }
  /**
   * @memberof Container#
   * @member {Node[]} nodes An array containing the container’s children.
   *
   * @example
   * const root = postcss.parse('a { color: black }')
   * root.nodes.length           //=> 1
   * root.nodes[0].selector      //=> 'a'
   * root.nodes[0].nodes[0].prop //=> 'color'
   */
  ;

  _createClass(Container, [{
    key: "first",
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
     * rule.last === rule.nodes[rule.nodes.length - 1]
     */

  }, {
    key: "last",
    get: function get() {
      if (!this.nodes) return undefined;
      return this.nodes[this.nodes.length - 1];
    }
  }]);

  return Container;
}(_node.default);

var _default = Container;
/**
 * @callback childCondition
 * @param {Node} node    Container child.
 * @param {number} index Child index.
 * @param {Node[]} nodes All container children.
 * @return {boolean}
 */

/**
 * @callback childIterator
 * @param {Node} node    Container child.
 * @param {number} index Child index.
 * @return {false|undefined} Returning `false` will break iteration.
 */

exports.default = _default;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRhaW5lci5lczYiXSwibmFtZXMiOlsiY2xlYW5Tb3VyY2UiLCJub2RlcyIsIm1hcCIsImkiLCJzb3VyY2UiLCJDb250YWluZXIiLCJwdXNoIiwiY2hpbGQiLCJwYXJlbnQiLCJlYWNoIiwiY2FsbGJhY2siLCJsYXN0RWFjaCIsImluZGV4ZXMiLCJpZCIsInVuZGVmaW5lZCIsImluZGV4IiwicmVzdWx0IiwibGVuZ3RoIiwid2FsayIsImUiLCJwb3N0Y3NzTm9kZSIsInN0YWNrIiwidGVzdCIsInMiLCJyZXBsYWNlIiwiaW5wdXQiLCJmcm9tIiwic3RhcnQiLCJsaW5lIiwiY29sdW1uIiwid2Fsa0RlY2xzIiwicHJvcCIsInR5cGUiLCJSZWdFeHAiLCJ3YWxrUnVsZXMiLCJzZWxlY3RvciIsIndhbGtBdFJ1bGVzIiwibmFtZSIsIndhbGtDb21tZW50cyIsImFwcGVuZCIsImNoaWxkcmVuIiwibm9ybWFsaXplIiwibGFzdCIsIm5vZGUiLCJwcmVwZW5kIiwicmV2ZXJzZSIsImZpcnN0IiwidW5zaGlmdCIsImNsZWFuUmF3cyIsImtlZXBCZXR3ZWVuIiwiaW5zZXJ0QmVmb3JlIiwiZXhpc3QiLCJhZGQiLCJzcGxpY2UiLCJpbnNlcnRBZnRlciIsInJlbW92ZUNoaWxkIiwicmVtb3ZlQWxsIiwicmVwbGFjZVZhbHVlcyIsInBhdHRlcm4iLCJvcHRzIiwiZGVjbCIsInByb3BzIiwiaW5kZXhPZiIsImZhc3QiLCJ2YWx1ZSIsImV2ZXJ5IiwiY29uZGl0aW9uIiwic29tZSIsInNhbXBsZSIsInBhcnNlIiwicmVxdWlyZSIsIkFycmF5IiwiaXNBcnJheSIsInNsaWNlIiwiRXJyb3IiLCJTdHJpbmciLCJEZWNsYXJhdGlvbiIsIlJ1bGUiLCJBdFJ1bGUiLCJ0ZXh0IiwiQ29tbWVudCIsInByb2Nlc3NlZCIsInJhd3MiLCJiZWZvcmUiLCJOb2RlIl0sIm1hcHBpbmdzIjoiOzs7OztBQUFBOztBQUNBOztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsU0FBU0EsV0FB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LE1BQU4sRUFBY0wsQ0FBQyxDQUFDSyxNQUFGLENBQVMrQyxXQUFULENBQXFCcEQsQ0FBckI7O0FBQ2QsVUFBSSxPQUFPQSxDQUFDLENBQUMrRSxJQUFGLENBQU9DLE1BQWQsS0FBeUIsV0FBN0IsRUFBMEM7QUFDeEMsWUFBSWYsTUFBTSxJQUFJLE9BQU9BLE1BQU0sQ0FBQ2MsSUFBUCxDQUFZQyxNQUFuQixLQUE4QixXQUE1QyxFQUF5RDtBQUN2RGhGLFVBQUFBLENBQUMsQ0FBQytFLElBQUYsQ0FBT0MsTUFBUCxHQUFnQmYsTUFBTSxDQUFDYyxJQUFQLENBQVlDLE1BQVosQ0FBbUIzRCxPQUFuQixDQUEyQixRQUEzQixFQUFxQyxFQUFyQyxDQUFoQjtBQUNEO0FBQ0Y7O0FBQ0RyQixNQUFBQSxDQUFDLENBQUNLLE1BQUYsR0FBVyxLQUFYO0FBQ0EsYUFBT0wsQ0FBUDtBQUNELEtBVGUsQ0FBaEI7QUFXQSxXQUFPOEUsU0FBUDtBQUNEO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O3dCQW5FYTtBQUNYLFVBQUksQ0FBQyxLQUFLaEYsS0FBVixFQUFpQixPQUFPYSxTQUFQO0FBQ2pCLGFBQU8sS0FBS2IsS0FBTCxDQUFXLENBQVgsQ0FBUDtBQUNEO0FBRUQ7Ozs7Ozs7Ozs7O3dCQVFZO0FBQ1YsVUFBSSxDQUFDLEtBQUtBLEtBQVYsRUFBaUIsT0FBT2EsU0FBUDtBQUNqQixhQUFPLEtBQUtiLEtBQUwsQ0FBVyxLQUFLQSxLQUFMLENBQVdnQixNQUFYLEdBQW9CLENBQS9CLENBQVA7QUFDRDs7OztFQWhqQnFCbUUsYTs7ZUErbUJUL0UsUztBQUVmOzs7Ozs7OztBQVFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IERlY2xhcmF0aW9uIGZyb20gJy4vZGVjbGFyYXRpb24nXG5pbXBvcnQgQ29tbWVudCBmcm9tICcuL2NvbW1lbnQnXG5pbXBvcnQgTm9kZSBmcm9tICcuL25vZGUnXG5cbmZ1bmN0aW9uIGNsZWFuU291cmNlIChub2Rlcykge1xuICByZXR1cm4gbm9kZXMubWFwKGkgPT4ge1xuICAgIGlmIChpLm5vZGVzKSBpLm5vZGVzID0gY2xlYW5Tb3VyY2UoaS5ub2RlcylcbiAgICBkZWxldGUgaS5zb3VyY2VcbiAgICByZXR1cm4gaVxuICB9KVxufVxuXG4vKipcbiAqIFRoZSB7QGxpbmsgUm9vdH0sIHtAbGluayBBdFJ1bGV9LCBhbmQge0BsaW5rIFJ1bGV9IGNvbnRhaW5lciBub2Rlc1xuICogaW5oZXJpdCBzb21lIGNvbW1vbiBtZXRob2RzIHRvIGhlbHAgd29yayB3aXRoIHRoZWlyIGNoaWxkcmVuLlxuICpcbiAqIE5vdGUgdGhhdCBhbGwgY29udGFpbmVycyBjYW4gc3RvcmUgYW55IGNvbnRlbnQuIElmIHlvdSB3cml0ZSBhIHJ1bGUgaW5zaWRlXG4gKiBhIHJ1bGUsIFBvc3RDU1Mgd2lsbCBwYXJzZSBpdC5cbiAqXG4gKiBAZXh0ZW5kcyBOb2RlXG4gKiBAYWJzdHJhY3RcbiAqL1xuY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgTm9kZSB7XG4gIHB1c2ggKGNoaWxkKSB7XG4gICAgY2hpbGQucGFyZW50ID0gdGhpc1xuICAgIHRoaXMubm9kZXMucHVzaChjaGlsZClcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGVzIHRocm91Z2ggdGhlIGNvbnRhaW5lcuKAmXMgaW1tZWRpYXRlIGNoaWxkcmVuLFxuICAgKiBjYWxsaW5nIGBjYWxsYmFja2AgZm9yIGVhY2ggY2hpbGQuXG4gICAqXG4gICAqIFJldHVybmluZyBgZmFsc2VgIGluIHRoZSBjYWxsYmFjayB3aWxsIGJyZWFrIGl0ZXJhdGlvbi5cbiAgICpcbiAgICogVGhpcyBtZXRob2Qgb25seSBpdGVyYXRlcyB0aHJvdWdoIHRoZSBjb250YWluZXLigJlzIGltbWVkaWF0ZSBjaGlsZHJlbi5cbiAgICogSWYgeW91IG5lZWQgdG8gcmVjdXJzaXZlbHkgaXRlcmF0ZSB0aHJvdWdoIGFsbCB0aGUgY29udGFpbmVy4oCZcyBkZXNjZW5kYW50XG4gICAqIG5vZGVzLCB1c2Uge0BsaW5rIENvbnRhaW5lciN3YWxrfS5cbiAgICpcbiAgICogVW5saWtlIHRoZSBmb3IgYHt9YC1jeWNsZSBvciBgQXJyYXkjZm9yRWFjaGAgdGhpcyBpdGVyYXRvciBpcyBzYWZlXG4gICAqIGlmIHlvdSBhcmUgbXV0YXRpbmcgdGhlIGFycmF5IG9mIGNoaWxkIG5vZGVzIGR1cmluZyBpdGVyYXRpb24uXG4gICAqIFBvc3RDU1Mgd2lsbCBhZGp1c3QgdGhlIGN1cnJlbnQgaW5kZXggdG8gbWF0Y2ggdGhlIG11dGF0aW9ucy5cbiAgICpcbiAgICogQHBhcmFtIHtjaGlsZEl0ZXJhdG9yfSBjYWxsYmFjayBJdGVyYXRvciByZWNlaXZlcyBlYWNoIG5vZGUgYW5kIGluZGV4LlxuICAgKlxuICAgKiBAcmV0dXJuIHtmYWxzZXx1bmRlZmluZWR9IFJldHVybnMgYGZhbHNlYCBpZiBpdGVyYXRpb24gd2FzIGJyb2tlLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCByb290ID0gcG9zdGNzcy5wYXJzZSgnYSB7IGNvbG9yOiBibGFjazsgei1pbmRleDogMSB9JylcbiAgICogY29uc3QgcnVsZSA9IHJvb3QuZmlyc3RcbiAgICpcbiAgICogZm9yIChjb25zdCBkZWNsIG9mIHJ1bGUubm9kZXMpIHtcbiAgICogICBkZWNsLmNsb25lQmVmb3JlKHsgcHJvcDogJy13ZWJraXQtJyArIGRlY2wucHJvcCB9KVxuICAgKiAgIC8vIEN5Y2xlIHdpbGwgYmUgaW5maW5pdGUsIGJlY2F1c2UgY2xvbmVCZWZvcmUgbW92ZXMgdGhlIGN1cnJlbnQgbm9kZVxuICAgKiAgIC8vIHRvIHRoZSBuZXh0IGluZGV4XG4gICAqIH1cbiAgICpcbiAgICogcnVsZS5lYWNoKGRlY2wgPT4ge1xuICAgKiAgIGRlY2wuY2xvbmVCZWZvcmUoeyBwcm9wOiAnLXdlYmtpdC0nICsgZGVjbC5wcm9wIH0pXG4gICAqICAgLy8gV2lsbCBiZSBleGVjdXRlZCBvbmx5IGZvciBjb2xvciBhbmQgei1pbmRleFxuICAgKiB9KVxuICAgKi9cbiAgZWFjaCAoY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMubGFzdEVhY2gpIHRoaXMubGFzdEVhY2ggPSAwXG4gICAgaWYgKCF0aGlzLmluZGV4ZXMpIHRoaXMuaW5kZXhlcyA9IHsgfVxuXG4gICAgdGhpcy5sYXN0RWFjaCArPSAxXG4gICAgbGV0IGlkID0gdGhpcy5sYXN0RWFjaFxuICAgIHRoaXMuaW5kZXhlc1tpZF0gPSAwXG5cbiAgICBpZiAoIXRoaXMubm9kZXMpIHJldHVybiB1bmRlZmluZWRcblxuICAgIGxldCBpbmRleCwgcmVzdWx0XG4gICAgd2hpbGUgKHRoaXMuaW5kZXhlc1tpZF0gPCB0aGlzLm5vZGVzLmxlbmd0aCkge1xuICAgICAgaW5kZXggPSB0aGlzLmluZGV4ZXNbaWRdXG4gICAgICByZXN1bHQgPSBjYWxsYmFjayh0aGlzLm5vZGVzW2luZGV4XSwgaW5kZXgpXG4gICAgICBpZiAocmVzdWx0ID09PSBmYWxzZSkgYnJlYWtcblxuICAgICAgdGhpcy5pbmRleGVzW2lkXSArPSAxXG4gICAgfVxuXG4gICAgZGVsZXRlIHRoaXMuaW5kZXhlc1tpZF1cblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmF2ZXJzZXMgdGhlIGNvbnRhaW5lcuKAmXMgZGVzY2VuZGFudCBub2RlcywgY2FsbGluZyBjYWxsYmFja1xuICAgKiBmb3IgZWFjaCBub2RlLlxuICAgKlxuICAgKiBMaWtlIGNvbnRhaW5lci5lYWNoKCksIHRoaXMgbWV0aG9kIGlzIHNhZmUgdG8gdXNlXG4gICAqIGlmIHlvdSBhcmUgbXV0YXRpbmcgYXJyYXlzIGR1cmluZyBpdGVyYXRpb24uXG4gICAqXG4gICAqIElmIHlvdSBvbmx5IG5lZWQgdG8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBjb250YWluZXLigJlzIGltbWVkaWF0ZSBjaGlsZHJlbixcbiAgICogdXNlIHtAbGluayBDb250YWluZXIjZWFjaH0uXG4gICAqXG4gICAqIEBwYXJhbSB7Y2hpbGRJdGVyYXRvcn0gY2FsbGJhY2sgSXRlcmF0b3IgcmVjZWl2ZXMgZWFjaCBub2RlIGFuZCBpbmRleC5cbiAgICpcbiAgICogQHJldHVybiB7ZmFsc2V8dW5kZWZpbmVkfSBSZXR1cm5zIGBmYWxzZWAgaWYgaXRlcmF0aW9uIHdhcyBicm9rZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcm9vdC53YWxrKG5vZGUgPT4ge1xuICAgKiAgIC8vIFRyYXZlcnNlcyBhbGwgZGVzY2VuZGFudCBub2Rlcy5cbiAgICogfSlcbiAgICovXG4gIHdhbGsgKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZWFjaCgoY2hpbGQsIGkpID0+IHtcbiAgICAgIGxldCByZXN1bHRcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGNhbGxiYWNrKGNoaWxkLCBpKVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBlLnBvc3Rjc3NOb2RlID0gY2hpbGRcbiAgICAgICAgaWYgKGUuc3RhY2sgJiYgY2hpbGQuc291cmNlICYmIC9cXG5cXHN7NH1hdCAvLnRlc3QoZS5zdGFjaykpIHtcbiAgICAgICAgICBsZXQgcyA9IGNoaWxkLnNvdXJjZVxuICAgICAgICAgIGUuc3RhY2sgPSBlLnN0YWNrLnJlcGxhY2UoL1xcblxcc3s0fWF0IC8sXG4gICAgICAgICAgICBgJCYkeyBzLmlucHV0LmZyb20gfTokeyBzLnN0YXJ0LmxpbmUgfTokeyBzLnN0YXJ0LmNvbHVtbiB9JCZgKVxuICAgICAgICB9XG4gICAgICAgIHRocm93IGVcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgIT09IGZhbHNlICYmIGNoaWxkLndhbGspIHtcbiAgICAgICAgcmVzdWx0ID0gY2hpbGQud2FsayhjYWxsYmFjaylcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFRyYXZlcnNlcyB0aGUgY29udGFpbmVy4oCZcyBkZXNjZW5kYW50IG5vZGVzLCBjYWxsaW5nIGNhbGxiYWNrXG4gICAqIGZvciBlYWNoIGRlY2xhcmF0aW9uIG5vZGUuXG4gICAqXG4gICAqIElmIHlvdSBwYXNzIGEgZmlsdGVyLCBpdGVyYXRpb24gd2lsbCBvbmx5IGhhcHBlbiBvdmVyIGRlY2xhcmF0aW9uc1xuICAgKiB3aXRoIG1hdGNoaW5nIHByb3BlcnRpZXMuXG4gICAqXG4gICAqIExpa2Uge0BsaW5rIENvbnRhaW5lciNlYWNofSwgdGhpcyBtZXRob2QgaXMgc2FmZVxuICAgKiB0byB1c2UgaWYgeW91IGFyZSBtdXRhdGluZyBhcnJheXMgZHVyaW5nIGl0ZXJhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8UmVnRXhwfSBbcHJvcF0gICBTdHJpbmcgb3IgcmVndWxhciBleHByZXNzaW9uXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZmlsdGVyIGRlY2xhcmF0aW9ucyBieSBwcm9wZXJ0eSBuYW1lLlxuICAgKiBAcGFyYW0ge2NoaWxkSXRlcmF0b3J9IGNhbGxiYWNrIEl0ZXJhdG9yIHJlY2VpdmVzIGVhY2ggbm9kZSBhbmQgaW5kZXguXG4gICAqXG4gICAqIEByZXR1cm4ge2ZhbHNlfHVuZGVmaW5lZH0gUmV0dXJucyBgZmFsc2VgIGlmIGl0ZXJhdGlvbiB3YXMgYnJva2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJvb3Qud2Fsa0RlY2xzKGRlY2wgPT4ge1xuICAgKiAgIGNoZWNrUHJvcGVydHlTdXBwb3J0KGRlY2wucHJvcClcbiAgICogfSlcbiAgICpcbiAgICogcm9vdC53YWxrRGVjbHMoJ2JvcmRlci1yYWRpdXMnLCBkZWNsID0+IHtcbiAgICogICBkZWNsLnJlbW92ZSgpXG4gICAqIH0pXG4gICAqXG4gICAqIHJvb3Qud2Fsa0RlY2xzKC9eYmFja2dyb3VuZC8sIGRlY2wgPT4ge1xuICAgKiAgIGRlY2wudmFsdWUgPSB0YWtlRmlyc3RDb2xvckZyb21HcmFkaWVudChkZWNsLnZhbHVlKVxuICAgKiB9KVxuICAgKi9cbiAgd2Fsa0RlY2xzIChwcm9wLCBjYWxsYmFjaykge1xuICAgIGlmICghY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrID0gcHJvcFxuICAgICAgcmV0dXJuIHRoaXMud2FsaygoY2hpbGQsIGkpID0+IHtcbiAgICAgICAgaWYgKGNoaWxkLnR5cGUgPT09ICdkZWNsJykge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhjaGlsZCwgaSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gICAgaWYgKHByb3AgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHJldHVybiB0aGlzLndhbGsoKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgIGlmIChjaGlsZC50eXBlID09PSAnZGVjbCcgJiYgcHJvcC50ZXN0KGNoaWxkLnByb3ApKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGNoaWxkLCBpKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy53YWxrKChjaGlsZCwgaSkgPT4ge1xuICAgICAgaWYgKGNoaWxkLnR5cGUgPT09ICdkZWNsJyAmJiBjaGlsZC5wcm9wID09PSBwcm9wKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhjaGlsZCwgaSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFRyYXZlcnNlcyB0aGUgY29udGFpbmVy4oCZcyBkZXNjZW5kYW50IG5vZGVzLCBjYWxsaW5nIGNhbGxiYWNrXG4gICAqIGZvciBlYWNoIHJ1bGUgbm9kZS5cbiAgICpcbiAgICogSWYgeW91IHBhc3MgYSBmaWx0ZXIsIGl0ZXJhdGlvbiB3aWxsIG9ubHkgaGFwcGVuIG92ZXIgcnVsZXNcbiAgICogd2l0aCBtYXRjaGluZyBzZWxlY3RvcnMuXG4gICAqXG4gICAqIExpa2Uge0BsaW5rIENvbnRhaW5lciNlYWNofSwgdGhpcyBtZXRob2QgaXMgc2FmZVxuICAgKiB0byB1c2UgaWYgeW91IGFyZSBtdXRhdGluZyBhcnJheXMgZHVyaW5nIGl0ZXJhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8UmVnRXhwfSBbc2VsZWN0b3JdIFN0cmluZyBvciByZWd1bGFyIGV4cHJlc3Npb25cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvIGZpbHRlciBydWxlcyBieSBzZWxlY3Rvci5cbiAgICogQHBhcmFtIHtjaGlsZEl0ZXJhdG9yfSBjYWxsYmFjayAgIEl0ZXJhdG9yIHJlY2VpdmVzIGVhY2ggbm9kZSBhbmQgaW5kZXguXG4gICAqXG4gICAqIEByZXR1cm4ge2ZhbHNlfHVuZGVmaW5lZH0gcmV0dXJucyBgZmFsc2VgIGlmIGl0ZXJhdGlvbiB3YXMgYnJva2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IHNlbGVjdG9ycyA9IFtdXG4gICAqIHJvb3Qud2Fsa1J1bGVzKHJ1bGUgPT4ge1xuICAgKiAgIHNlbGVjdG9ycy5wdXNoKHJ1bGUuc2VsZWN0b3IpXG4gICAqIH0pXG4gICAqIGNvbnNvbGUubG9nKGBZb3VyIENTUyB1c2VzICR7IHNlbGVjdG9ycy5sZW5ndGggfSBzZWxlY3RvcnNgKVxuICAgKi9cbiAgd2Fsa1J1bGVzIChzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayA9IHNlbGVjdG9yXG5cbiAgICAgIHJldHVybiB0aGlzLndhbGsoKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgIGlmIChjaGlsZC50eXBlID09PSAncnVsZScpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIGlmIChzZWxlY3RvciBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgcmV0dXJuIHRoaXMud2FsaygoY2hpbGQsIGkpID0+IHtcbiAgICAgICAgaWYgKGNoaWxkLnR5cGUgPT09ICdydWxlJyAmJiBzZWxlY3Rvci50ZXN0KGNoaWxkLnNlbGVjdG9yKSkge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhjaGlsZCwgaSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMud2FsaygoY2hpbGQsIGkpID0+IHtcbiAgICAgIGlmIChjaGlsZC50eXBlID09PSAncnVsZScgJiYgY2hpbGQuc2VsZWN0b3IgPT09IHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhjaGlsZCwgaSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFRyYXZlcnNlcyB0aGUgY29udGFpbmVy4oCZcyBkZXNjZW5kYW50IG5vZGVzLCBjYWxsaW5nIGNhbGxiYWNrXG4gICAqIGZvciBlYWNoIGF0LXJ1bGUgbm9kZS5cbiAgICpcbiAgICogSWYgeW91IHBhc3MgYSBmaWx0ZXIsIGl0ZXJhdGlvbiB3aWxsIG9ubHkgaGFwcGVuIG92ZXIgYXQtcnVsZXNcbiAgICogdGhhdCBoYXZlIG1hdGNoaW5nIG5hbWVzLlxuICAgKlxuICAgKiBMaWtlIHtAbGluayBDb250YWluZXIjZWFjaH0sIHRoaXMgbWV0aG9kIGlzIHNhZmVcbiAgICogdG8gdXNlIGlmIHlvdSBhcmUgbXV0YXRpbmcgYXJyYXlzIGR1cmluZyBpdGVyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfFJlZ0V4cH0gW25hbWVdICAgU3RyaW5nIG9yIHJlZ3VsYXIgZXhwcmVzc2lvblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvIGZpbHRlciBhdC1ydWxlcyBieSBuYW1lLlxuICAgKiBAcGFyYW0ge2NoaWxkSXRlcmF0b3J9IGNhbGxiYWNrIEl0ZXJhdG9yIHJlY2VpdmVzIGVhY2ggbm9kZSBhbmQgaW5kZXguXG4gICAqXG4gICAqIEByZXR1cm4ge2ZhbHNlfHVuZGVmaW5lZH0gUmV0dXJucyBgZmFsc2VgIGlmIGl0ZXJhdGlvbiB3YXMgYnJva2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJvb3Qud2Fsa0F0UnVsZXMocnVsZSA9PiB7XG4gICAqICAgaWYgKGlzT2xkKHJ1bGUubmFtZSkpIHJ1bGUucmVtb3ZlKClcbiAgICogfSlcbiAgICpcbiAgICogbGV0IGZpcnN0ID0gZmFsc2VcbiAgICogcm9vdC53YWxrQXRSdWxlcygnY2hhcnNldCcsIHJ1bGUgPT4ge1xuICAgKiAgIGlmICghZmlyc3QpIHtcbiAgICogICAgIGZpcnN0ID0gdHJ1ZVxuICAgKiAgIH0gZWxzZSB7XG4gICAqICAgICBydWxlLnJlbW92ZSgpXG4gICAqICAgfVxuICAgKiB9KVxuICAgKi9cbiAgd2Fsa0F0UnVsZXMgKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2sgPSBuYW1lXG4gICAgICByZXR1cm4gdGhpcy53YWxrKChjaGlsZCwgaSkgPT4ge1xuICAgICAgICBpZiAoY2hpbGQudHlwZSA9PT0gJ2F0cnVsZScpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIGlmIChuYW1lIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICByZXR1cm4gdGhpcy53YWxrKChjaGlsZCwgaSkgPT4ge1xuICAgICAgICBpZiAoY2hpbGQudHlwZSA9PT0gJ2F0cnVsZScgJiYgbmFtZS50ZXN0KGNoaWxkLm5hbWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGNoaWxkLCBpKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy53YWxrKChjaGlsZCwgaSkgPT4ge1xuICAgICAgaWYgKGNoaWxkLnR5cGUgPT09ICdhdHJ1bGUnICYmIGNoaWxkLm5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGNoaWxkLCBpKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogVHJhdmVyc2VzIHRoZSBjb250YWluZXLigJlzIGRlc2NlbmRhbnQgbm9kZXMsIGNhbGxpbmcgY2FsbGJhY2tcbiAgICogZm9yIGVhY2ggY29tbWVudCBub2RlLlxuICAgKlxuICAgKiBMaWtlIHtAbGluayBDb250YWluZXIjZWFjaH0sIHRoaXMgbWV0aG9kIGlzIHNhZmVcbiAgICogdG8gdXNlIGlmIHlvdSBhcmUgbXV0YXRpbmcgYXJyYXlzIGR1cmluZyBpdGVyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7Y2hpbGRJdGVyYXRvcn0gY2FsbGJhY2sgSXRlcmF0b3IgcmVjZWl2ZXMgZWFjaCBub2RlIGFuZCBpbmRleC5cbiAgICpcbiAgICogQHJldHVybiB7ZmFsc2V8dW5kZWZpbmVkfSBSZXR1cm5zIGBmYWxzZWAgaWYgaXRlcmF0aW9uIHdhcyBicm9rZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcm9vdC53YWxrQ29tbWVudHMoY29tbWVudCA9PiB7XG4gICAqICAgY29tbWVudC5yZW1vdmUoKVxuICAgKiB9KVxuICAgKi9cbiAgd2Fsa0NvbW1lbnRzIChjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLndhbGsoKGNoaWxkLCBpKSA9PiB7XG4gICAgICBpZiAoY2hpbGQudHlwZSA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhjaGlsZCwgaSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEluc2VydHMgbmV3IG5vZGVzIHRvIHRoZSBlbmQgb2YgdGhlIGNvbnRhaW5lci5cbiAgICpcbiAgICogQHBhcmFtIHsuLi4oTm9kZXxvYmplY3R8c3RyaW5nfE5vZGVbXSl9IGNoaWxkcmVuIE5ldyBub2Rlcy5cbiAgICpcbiAgICogQHJldHVybiB7Tm9kZX0gVGhpcyBub2RlIGZvciBtZXRob2RzIGNoYWluLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCBkZWNsMSA9IHBvc3Rjc3MuZGVjbCh7IHByb3A6ICdjb2xvcicsIHZhbHVlOiAnYmxhY2snIH0pXG4gICAqIGNvbnN0IGRlY2wyID0gcG9zdGNzcy5kZWNsKHsgcHJvcDogJ2JhY2tncm91bmQtY29sb3InLCB2YWx1ZTogJ3doaXRlJyB9KVxuICAgKiBydWxlLmFwcGVuZChkZWNsMSwgZGVjbDIpXG4gICAqXG4gICAqIHJvb3QuYXBwZW5kKHsgbmFtZTogJ2NoYXJzZXQnLCBwYXJhbXM6ICdcIlVURi04XCInIH0pICAvLyBhdC1ydWxlXG4gICAqIHJvb3QuYXBwZW5kKHsgc2VsZWN0b3I6ICdhJyB9KSAgICAgICAgICAgICAgICAgICAgICAgLy8gcnVsZVxuICAgKiBydWxlLmFwcGVuZCh7IHByb3A6ICdjb2xvcicsIHZhbHVlOiAnYmxhY2snIH0pICAgICAgIC8vIGRlY2xhcmF0aW9uXG4gICAqIHJ1bGUuYXBwZW5kKHsgdGV4dDogJ0NvbW1lbnQnIH0pICAgICAgICAgICAgICAgICAgICAgLy8gY29tbWVudFxuICAgKlxuICAgKiByb290LmFwcGVuZCgnYSB7fScpXG4gICAqIHJvb3QuZmlyc3QuYXBwZW5kKCdjb2xvcjogYmxhY2s7IHotaW5kZXg6IDEnKVxuICAgKi9cbiAgYXBwZW5kICguLi5jaGlsZHJlbikge1xuICAgIGZvciAobGV0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICBsZXQgbm9kZXMgPSB0aGlzLm5vcm1hbGl6ZShjaGlsZCwgdGhpcy5sYXN0KVxuICAgICAgZm9yIChsZXQgbm9kZSBvZiBub2RlcykgdGhpcy5ub2Rlcy5wdXNoKG5vZGUpXG4gICAgfVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogSW5zZXJ0cyBuZXcgbm9kZXMgdG8gdGhlIHN0YXJ0IG9mIHRoZSBjb250YWluZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7Li4uKE5vZGV8b2JqZWN0fHN0cmluZ3xOb2RlW10pfSBjaGlsZHJlbiBOZXcgbm9kZXMuXG4gICAqXG4gICAqIEByZXR1cm4ge05vZGV9IFRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpbi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgZGVjbDEgPSBwb3N0Y3NzLmRlY2woeyBwcm9wOiAnY29sb3InLCB2YWx1ZTogJ2JsYWNrJyB9KVxuICAgKiBjb25zdCBkZWNsMiA9IHBvc3Rjc3MuZGVjbCh7IHByb3A6ICdiYWNrZ3JvdW5kLWNvbG9yJywgdmFsdWU6ICd3aGl0ZScgfSlcbiAgICogcnVsZS5wcmVwZW5kKGRlY2wxLCBkZWNsMilcbiAgICpcbiAgICogcm9vdC5hcHBlbmQoeyBuYW1lOiAnY2hhcnNldCcsIHBhcmFtczogJ1wiVVRGLThcIicgfSkgIC8vIGF0LXJ1bGVcbiAgICogcm9vdC5hcHBlbmQoeyBzZWxlY3RvcjogJ2EnIH0pICAgICAgICAgICAgICAgICAgICAgICAvLyBydWxlXG4gICAqIHJ1bGUuYXBwZW5kKHsgcHJvcDogJ2NvbG9yJywgdmFsdWU6ICdibGFjaycgfSkgICAgICAgLy8gZGVjbGFyYXRpb25cbiAgICogcnVsZS5hcHBlbmQoeyB0ZXh0OiAnQ29tbWVudCcgfSkgICAgICAgICAgICAgICAgICAgICAvLyBjb21tZW50XG4gICAqXG4gICAqIHJvb3QuYXBwZW5kKCdhIHt9JylcbiAgICogcm9vdC5maXJzdC5hcHBlbmQoJ2NvbG9yOiBibGFjazsgei1pbmRleDogMScpXG4gICAqL1xuICBwcmVwZW5kICguLi5jaGlsZHJlbikge1xuICAgIGNoaWxkcmVuID0gY2hpbGRyZW4ucmV2ZXJzZSgpXG4gICAgZm9yIChsZXQgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgIGxldCBub2RlcyA9IHRoaXMubm9ybWFsaXplKGNoaWxkLCB0aGlzLmZpcnN0LCAncHJlcGVuZCcpLnJldmVyc2UoKVxuICAgICAgZm9yIChsZXQgbm9kZSBvZiBub2RlcykgdGhpcy5ub2Rlcy51bnNoaWZ0KG5vZGUpXG4gICAgICBmb3IgKGxldCBpZCBpbiB0aGlzLmluZGV4ZXMpIHtcbiAgICAgICAgdGhpcy5pbmRleGVzW2lkXSA9IHRoaXMuaW5kZXhlc1tpZF0gKyBub2Rlcy5sZW5ndGhcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGNsZWFuUmF3cyAoa2VlcEJldHdlZW4pIHtcbiAgICBzdXBlci5jbGVhblJhd3Moa2VlcEJldHdlZW4pXG4gICAgaWYgKHRoaXMubm9kZXMpIHtcbiAgICAgIGZvciAobGV0IG5vZGUgb2YgdGhpcy5ub2Rlcykgbm9kZS5jbGVhblJhd3Moa2VlcEJldHdlZW4pXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluc2VydCBuZXcgbm9kZSBiZWZvcmUgb2xkIG5vZGUgd2l0aGluIHRoZSBjb250YWluZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZXxudW1iZXJ9IGV4aXN0ICAgICAgICAgICAgIENoaWxkIG9yIGNoaWxk4oCZcyBpbmRleC5cbiAgICogQHBhcmFtIHtOb2RlfG9iamVjdHxzdHJpbmd8Tm9kZVtdfSBhZGQgTmV3IG5vZGUuXG4gICAqXG4gICAqIEByZXR1cm4ge05vZGV9IFRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpbi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcnVsZS5pbnNlcnRCZWZvcmUoZGVjbCwgZGVjbC5jbG9uZSh7IHByb3A6ICctd2Via2l0LScgKyBkZWNsLnByb3AgfSkpXG4gICAqL1xuICBpbnNlcnRCZWZvcmUgKGV4aXN0LCBhZGQpIHtcbiAgICBleGlzdCA9IHRoaXMuaW5kZXgoZXhpc3QpXG5cbiAgICBsZXQgdHlwZSA9IGV4aXN0ID09PSAwID8gJ3ByZXBlbmQnIDogZmFsc2VcbiAgICBsZXQgbm9kZXMgPSB0aGlzLm5vcm1hbGl6ZShhZGQsIHRoaXMubm9kZXNbZXhpc3RdLCB0eXBlKS5yZXZlcnNlKClcbiAgICBmb3IgKGxldCBub2RlIG9mIG5vZGVzKSB0aGlzLm5vZGVzLnNwbGljZShleGlzdCwgMCwgbm9kZSlcblxuICAgIGxldCBpbmRleFxuICAgIGZvciAobGV0IGlkIGluIHRoaXMuaW5kZXhlcykge1xuICAgICAgaW5kZXggPSB0aGlzLmluZGV4ZXNbaWRdXG4gICAgICBpZiAoZXhpc3QgPD0gaW5kZXgpIHtcbiAgICAgICAgdGhpcy5pbmRleGVzW2lkXSA9IGluZGV4ICsgbm9kZXMubGVuZ3RoXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnNlcnQgbmV3IG5vZGUgYWZ0ZXIgb2xkIG5vZGUgd2l0aGluIHRoZSBjb250YWluZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZXxudW1iZXJ9IGV4aXN0ICAgICAgICAgICAgIENoaWxkIG9yIGNoaWxk4oCZcyBpbmRleC5cbiAgICogQHBhcmFtIHtOb2RlfG9iamVjdHxzdHJpbmd8Tm9kZVtdfSBhZGQgTmV3IG5vZGUuXG4gICAqXG4gICAqIEByZXR1cm4ge05vZGV9IFRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpbi5cbiAgICovXG4gIGluc2VydEFmdGVyIChleGlzdCwgYWRkKSB7XG4gICAgZXhpc3QgPSB0aGlzLmluZGV4KGV4aXN0KVxuXG4gICAgbGV0IG5vZGVzID0gdGhpcy5ub3JtYWxpemUoYWRkLCB0aGlzLm5vZGVzW2V4aXN0XSkucmV2ZXJzZSgpXG4gICAgZm9yIChsZXQgbm9kZSBvZiBub2RlcykgdGhpcy5ub2Rlcy5zcGxpY2UoZXhpc3QgKyAxLCAwLCBub2RlKVxuXG4gICAgbGV0IGluZGV4XG4gICAgZm9yIChsZXQgaWQgaW4gdGhpcy5pbmRleGVzKSB7XG4gICAgICBpbmRleCA9IHRoaXMuaW5kZXhlc1tpZF1cbiAgICAgIGlmIChleGlzdCA8IGluZGV4KSB7XG4gICAgICAgIHRoaXMuaW5kZXhlc1tpZF0gPSBpbmRleCArIG5vZGVzLmxlbmd0aFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBub2RlIGZyb20gdGhlIGNvbnRhaW5lciBhbmQgY2xlYW5zIHRoZSBwYXJlbnQgcHJvcGVydGllc1xuICAgKiBmcm9tIHRoZSBub2RlIGFuZCBpdHMgY2hpbGRyZW4uXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZXxudW1iZXJ9IGNoaWxkIENoaWxkIG9yIGNoaWxk4oCZcyBpbmRleC5cbiAgICpcbiAgICogQHJldHVybiB7Tm9kZX0gVGhpcyBub2RlIGZvciBtZXRob2RzIGNoYWluXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJ1bGUubm9kZXMubGVuZ3RoICAvLz0+IDVcbiAgICogcnVsZS5yZW1vdmVDaGlsZChkZWNsKVxuICAgKiBydWxlLm5vZGVzLmxlbmd0aCAgLy89PiA0XG4gICAqIGRlY2wucGFyZW50ICAgICAgICAvLz0+IHVuZGVmaW5lZFxuICAgKi9cbiAgcmVtb3ZlQ2hpbGQgKGNoaWxkKSB7XG4gICAgY2hpbGQgPSB0aGlzLmluZGV4KGNoaWxkKVxuICAgIHRoaXMubm9kZXNbY2hpbGRdLnBhcmVudCA9IHVuZGVmaW5lZFxuICAgIHRoaXMubm9kZXMuc3BsaWNlKGNoaWxkLCAxKVxuXG4gICAgbGV0IGluZGV4XG4gICAgZm9yIChsZXQgaWQgaW4gdGhpcy5pbmRleGVzKSB7XG4gICAgICBpbmRleCA9IHRoaXMuaW5kZXhlc1tpZF1cbiAgICAgIGlmIChpbmRleCA+PSBjaGlsZCkge1xuICAgICAgICB0aGlzLmluZGV4ZXNbaWRdID0gaW5kZXggLSAxXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGFsbCBjaGlsZHJlbiBmcm9tIHRoZSBjb250YWluZXJcbiAgICogYW5kIGNsZWFucyB0aGVpciBwYXJlbnQgcHJvcGVydGllcy5cbiAgICpcbiAgICogQHJldHVybiB7Tm9kZX0gVGhpcyBub2RlIGZvciBtZXRob2RzIGNoYWluLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBydWxlLnJlbW92ZUFsbCgpXG4gICAqIHJ1bGUubm9kZXMubGVuZ3RoIC8vPT4gMFxuICAgKi9cbiAgcmVtb3ZlQWxsICgpIHtcbiAgICBmb3IgKGxldCBub2RlIG9mIHRoaXMubm9kZXMpIG5vZGUucGFyZW50ID0gdW5kZWZpbmVkXG4gICAgdGhpcy5ub2RlcyA9IFtdXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXNzZXMgYWxsIGRlY2xhcmF0aW9uIHZhbHVlcyB3aXRoaW4gdGhlIGNvbnRhaW5lciB0aGF0IG1hdGNoIHBhdHRlcm5cbiAgICogdGhyb3VnaCBjYWxsYmFjaywgcmVwbGFjaW5nIHRob3NlIHZhbHVlcyB3aXRoIHRoZSByZXR1cm5lZCByZXN1bHRcbiAgICogb2YgY2FsbGJhY2suXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGlzIHVzZWZ1bCBpZiB5b3UgYXJlIHVzaW5nIGEgY3VzdG9tIHVuaXQgb3IgZnVuY3Rpb25cbiAgICogYW5kIG5lZWQgdG8gaXRlcmF0ZSB0aHJvdWdoIGFsbCB2YWx1ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfFJlZ0V4cH0gcGF0dGVybiAgICAgIFJlcGxhY2UgcGF0dGVybi5cbiAgICogQHBhcmFtIHtvYmplY3R9IG9wdHMgICAgICAgICAgICAgICAgT3B0aW9ucyB0byBzcGVlZCB1cCB0aGUgc2VhcmNoLlxuICAgKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0gb3B0cy5wcm9wcyBBbiBhcnJheSBvZiBwcm9wZXJ0eSBuYW1lcy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuZmFzdCAgICAgICAgICAgU3RyaW5nIHRoYXTigJlzIHVzZWQgdG8gbmFycm93IGRvd25cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzIGFuZCBzcGVlZCB1cCB0aGUgcmVnZXhwIHNlYXJjaC5cbiAgICogQHBhcmFtIHtmdW5jdGlvbnxzdHJpbmd9IGNhbGxiYWNrICAgU3RyaW5nIHRvIHJlcGxhY2UgcGF0dGVybiBvciBjYWxsYmFja1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0IHJldHVybnMgYSBuZXcgdmFsdWUuIFRoZSBjYWxsYmFja1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsIHJlY2VpdmUgdGhlIHNhbWUgYXJndW1lbnRzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzIHRob3NlIHBhc3NlZCB0byBhIGZ1bmN0aW9uIHBhcmFtZXRlclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZiBgU3RyaW5nI3JlcGxhY2VgLlxuICAgKlxuICAgKiBAcmV0dXJuIHtOb2RlfSBUaGlzIG5vZGUgZm9yIG1ldGhvZHMgY2hhaW4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJvb3QucmVwbGFjZVZhbHVlcygvXFxkK3JlbS8sIHsgZmFzdDogJ3JlbScgfSwgc3RyaW5nID0+IHtcbiAgICogICByZXR1cm4gMTUgKiBwYXJzZUludChzdHJpbmcpICsgJ3B4J1xuICAgKiB9KVxuICAgKi9cbiAgcmVwbGFjZVZhbHVlcyAocGF0dGVybiwgb3B0cywgY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdHNcbiAgICAgIG9wdHMgPSB7IH1cbiAgICB9XG5cbiAgICB0aGlzLndhbGtEZWNscyhkZWNsID0+IHtcbiAgICAgIGlmIChvcHRzLnByb3BzICYmIG9wdHMucHJvcHMuaW5kZXhPZihkZWNsLnByb3ApID09PSAtMSkgcmV0dXJuXG4gICAgICBpZiAob3B0cy5mYXN0ICYmIGRlY2wudmFsdWUuaW5kZXhPZihvcHRzLmZhc3QpID09PSAtMSkgcmV0dXJuXG5cbiAgICAgIGRlY2wudmFsdWUgPSBkZWNsLnZhbHVlLnJlcGxhY2UocGF0dGVybiwgY2FsbGJhY2spXG4gICAgfSlcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBgdHJ1ZWAgaWYgY2FsbGJhY2sgcmV0dXJucyBgdHJ1ZWBcbiAgICogZm9yIGFsbCBvZiB0aGUgY29udGFpbmVy4oCZcyBjaGlsZHJlbi5cbiAgICpcbiAgICogQHBhcmFtIHtjaGlsZENvbmRpdGlvbn0gY29uZGl0aW9uIEl0ZXJhdG9yIHJldHVybnMgdHJ1ZSBvciBmYWxzZS5cbiAgICpcbiAgICogQHJldHVybiB7Ym9vbGVhbn0gSXMgZXZlcnkgY2hpbGQgcGFzcyBjb25kaXRpb24uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IG5vUHJlZml4ZXMgPSBydWxlLmV2ZXJ5KGkgPT4gaS5wcm9wWzBdICE9PSAnLScpXG4gICAqL1xuICBldmVyeSAoY29uZGl0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMubm9kZXMuZXZlcnkoY29uZGl0aW9uKVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYHRydWVgIGlmIGNhbGxiYWNrIHJldHVybnMgYHRydWVgIGZvciAoYXQgbGVhc3QpIG9uZVxuICAgKiBvZiB0aGUgY29udGFpbmVy4oCZcyBjaGlsZHJlbi5cbiAgICpcbiAgICogQHBhcmFtIHtjaGlsZENvbmRpdGlvbn0gY29uZGl0aW9uIEl0ZXJhdG9yIHJldHVybnMgdHJ1ZSBvciBmYWxzZS5cbiAgICpcbiAgICogQHJldHVybiB7Ym9vbGVhbn0gSXMgc29tZSBjaGlsZCBwYXNzIGNvbmRpdGlvbi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgaGFzUHJlZml4ID0gcnVsZS5zb21lKGkgPT4gaS5wcm9wWzBdID09PSAnLScpXG4gICAqL1xuICBzb21lIChjb25kaXRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5ub2Rlcy5zb21lKGNvbmRpdGlvbilcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgYGNoaWxkYOKAmXMgaW5kZXggd2l0aGluIHRoZSB7QGxpbmsgQ29udGFpbmVyI25vZGVzfSBhcnJheS5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSBjaGlsZCBDaGlsZCBvZiB0aGUgY3VycmVudCBjb250YWluZXIuXG4gICAqXG4gICAqIEByZXR1cm4ge251bWJlcn0gQ2hpbGQgaW5kZXguXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJ1bGUuaW5kZXgoIHJ1bGUubm9kZXNbMl0gKSAvLz0+IDJcbiAgICovXG4gIGluZGV4IChjaGlsZCkge1xuICAgIGlmICh0eXBlb2YgY2hpbGQgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gY2hpbGRcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9kZXMuaW5kZXhPZihjaGlsZClcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgY29udGFpbmVy4oCZcyBmaXJzdCBjaGlsZC5cbiAgICpcbiAgICogQHR5cGUge05vZGV9XG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJ1bGUuZmlyc3QgPT09IHJ1bGVzLm5vZGVzWzBdXG4gICAqL1xuICBnZXQgZmlyc3QgKCkge1xuICAgIGlmICghdGhpcy5ub2RlcykgcmV0dXJuIHVuZGVmaW5lZFxuICAgIHJldHVybiB0aGlzLm5vZGVzWzBdXG4gIH1cblxuICAvKipcbiAgICogVGhlIGNvbnRhaW5lcuKAmXMgbGFzdCBjaGlsZC5cbiAgICpcbiAgICogQHR5cGUge05vZGV9XG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJ1bGUubGFzdCA9PT0gcnVsZS5ub2Rlc1tydWxlLm5vZGVzLmxlbmd0aCAtIDFdXG4gICAqL1xuICBnZXQgbGFzdCAoKSB7XG4gICAgaWYgKCF0aGlzLm5vZGVzKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMubm9kZXNbdGhpcy5ub2Rlcy5sZW5ndGggLSAxXVxuICB9XG5cbiAgbm9ybWFsaXplIChub2Rlcywgc2FtcGxlKSB7XG4gICAgaWYgKHR5cGVvZiBub2RlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxldCBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKVxuICAgICAgbm9kZXMgPSBjbGVhblNvdXJjZShwYXJzZShub2Rlcykubm9kZXMpXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG5vZGVzKSkge1xuICAgICAgbm9kZXMgPSBub2Rlcy5zbGljZSgwKVxuICAgICAgZm9yIChsZXQgaSBvZiBub2Rlcykge1xuICAgICAgICBpZiAoaS5wYXJlbnQpIGkucGFyZW50LnJlbW92ZUNoaWxkKGksICdpZ25vcmUnKVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobm9kZXMudHlwZSA9PT0gJ3Jvb3QnKSB7XG4gICAgICBub2RlcyA9IG5vZGVzLm5vZGVzLnNsaWNlKDApXG4gICAgICBmb3IgKGxldCBpIG9mIG5vZGVzKSB7XG4gICAgICAgIGlmIChpLnBhcmVudCkgaS5wYXJlbnQucmVtb3ZlQ2hpbGQoaSwgJ2lnbm9yZScpXG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2Rlcy50eXBlKSB7XG4gICAgICBub2RlcyA9IFtub2Rlc11cbiAgICB9IGVsc2UgaWYgKG5vZGVzLnByb3ApIHtcbiAgICAgIGlmICh0eXBlb2Ygbm9kZXMudmFsdWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVmFsdWUgZmllbGQgaXMgbWlzc2VkIGluIG5vZGUgY3JlYXRpb24nKVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygbm9kZXMudmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIG5vZGVzLnZhbHVlID0gU3RyaW5nKG5vZGVzLnZhbHVlKVxuICAgICAgfVxuICAgICAgbm9kZXMgPSBbbmV3IERlY2xhcmF0aW9uKG5vZGVzKV1cbiAgICB9IGVsc2UgaWYgKG5vZGVzLnNlbGVjdG9yKSB7XG4gICAgICBsZXQgUnVsZSA9IHJlcXVpcmUoJy4vcnVsZScpXG4gICAgICBub2RlcyA9IFtuZXcgUnVsZShub2RlcyldXG4gICAgfSBlbHNlIGlmIChub2Rlcy5uYW1lKSB7XG4gICAgICBsZXQgQXRSdWxlID0gcmVxdWlyZSgnLi9hdC1ydWxlJylcbiAgICAgIG5vZGVzID0gW25ldyBBdFJ1bGUobm9kZXMpXVxuICAgIH0gZWxzZSBpZiAobm9kZXMudGV4dCkge1xuICAgICAgbm9kZXMgPSBbbmV3IENvbW1lbnQobm9kZXMpXVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbm9kZSB0eXBlIGluIG5vZGUgY3JlYXRpb24nKVxuICAgIH1cblxuICAgIGxldCBwcm9jZXNzZWQgPSBub2Rlcy5tYXAoaSA9PiB7XG4gICAgICBpZiAoaS5wYXJlbnQpIGkucGFyZW50LnJlbW92ZUNoaWxkKGkpXG4gICAgICBpZiAodHlwZW9mIGkucmF3cy5iZWZvcmUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmIChzYW1wbGUgJiYgdHlwZW9mIHNhbXBsZS5yYXdzLmJlZm9yZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBpLnJhd3MuYmVmb3JlID0gc2FtcGxlLnJhd3MuYmVmb3JlLnJlcGxhY2UoL1teXFxzXS9nLCAnJylcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaS5wYXJlbnQgPSB0aGlzXG4gICAgICByZXR1cm4gaVxuICAgIH0pXG5cbiAgICByZXR1cm4gcHJvY2Vzc2VkXG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlcm9mIENvbnRhaW5lciNcbiAgICogQG1lbWJlciB7Tm9kZVtdfSBub2RlcyBBbiBhcnJheSBjb250YWluaW5nIHRoZSBjb250YWluZXLigJlzIGNoaWxkcmVuLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCByb290ID0gcG9zdGNzcy5wYXJzZSgnYSB7IGNvbG9yOiBibGFjayB9JylcbiAgICogcm9vdC5ub2Rlcy5sZW5ndGggICAgICAgICAgIC8vPT4gMVxuICAgKiByb290Lm5vZGVzWzBdLnNlbGVjdG9yICAgICAgLy89PiAnYSdcbiAgICogcm9vdC5ub2Rlc1swXS5ub2Rlc1swXS5wcm9wIC8vPT4gJ2NvbG9yJ1xuICAgKi9cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ29udGFpbmVyXG5cbi8qKlxuICogQGNhbGxiYWNrIGNoaWxkQ29uZGl0aW9uXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgICAgQ29udGFpbmVyIGNoaWxkLlxuICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IENoaWxkIGluZGV4LlxuICogQHBhcmFtIHtOb2RlW119IG5vZGVzIEFsbCBjb250YWluZXIgY2hpbGRyZW4uXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5cbi8qKlxuICogQGNhbGxiYWNrIGNoaWxkSXRlcmF0b3JcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAgICBDb250YWluZXIgY2hpbGQuXG4gKiBAcGFyYW0ge251bWJlcn0gaW5kZXggQ2hpbGQgaW5kZXguXG4gKiBAcmV0dXJuIHtmYWxzZXx1bmRlZmluZWR9IFJldHVybmluZyBgZmFsc2VgIHdpbGwgYnJlYWsgaXRlcmF0aW9uLlxuICovXG4iXSwiZmlsZSI6ImNvbnRhaW5lci5qcyJ9
