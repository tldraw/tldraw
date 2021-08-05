'use strict';

exports.__esModule = true;

var _container = require('./container');

var _container2 = _interopRequireDefault(_container);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Represents an at-rule.
 *
 * If it’s followed in the CSS by a {} block, this node will have
 * a nodes property representing its children.
 *
 * @extends Container
 *
 * @example
 * const root = postcss.parse('@charset "UTF-8"; @media print {}');
 *
 * const charset = root.first;
 * charset.type  //=> 'atrule'
 * charset.nodes //=> undefined
 *
 * const media = root.last;
 * media.nodes   //=> []
 */
var AtRule = function (_Container) {
  _inherits(AtRule, _Container);

  function AtRule(defaults) {
    _classCallCheck(this, AtRule);

    var _this = _possibleConstructorReturn(this, _Container.call(this, defaults));

    _this.type = 'atrule';
    return _this;
  }

  AtRule.prototype.append = function append() {
    var _Container$prototype$;

    if (!this.nodes) this.nodes = [];

    for (var _len = arguments.length, children = Array(_len), _key = 0; _key < _len; _key++) {
      children[_key] = arguments[_key];
    }

    return (_Container$prototype$ = _Container.prototype.append).call.apply(_Container$prototype$, [this].concat(children));
  };

  AtRule.prototype.prepend = function prepend() {
    var _Container$prototype$2;

    if (!this.nodes) this.nodes = [];

    for (var _len2 = arguments.length, children = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      children[_key2] = arguments[_key2];
    }

    return (_Container$prototype$2 = _Container.prototype.prepend).call.apply(_Container$prototype$2, [this].concat(children));
  };

  /**
   * @memberof AtRule#
   * @member {string} name - the at-rule’s name immediately follows the `@`
   *
   * @example
   * const root  = postcss.parse('@media print {}');
   * media.name //=> 'media'
   * const media = root.first;
   */

  /**
   * @memberof AtRule#
   * @member {string} params - the at-rule’s parameters, the values
   *                           that follow the at-rule’s name but precede
   *                           any {} block
   *
   * @example
   * const root  = postcss.parse('@media print, screen {}');
   * const media = root.first;
   * media.params //=> 'print, screen'
   */

  /**
   * @memberof AtRule#
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
   *
   * PostCSS cleans at-rule parameters from comments and extra spaces,
   * but it stores origin content in raws properties.
   * As such, if you don’t change a declaration’s value,
   * PostCSS will use the raw value with comments.
   *
   * @example
   * const root = postcss.parse('  @media\nprint {\n}')
   * root.first.first.raws //=> { before: '  ',
   *                       //     between: ' ',
   *                       //     afterName: '\n',
   *                       //     after: '\n' }
   */


  return AtRule;
}(_container2.default);

exports.default = AtRule;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImF0LXJ1bGUuZXM2Il0sIm5hbWVzIjpbIkF0UnVsZSIsImRlZmF1bHRzIiwidHlwZSIsImFwcGVuZCIsIm5vZGVzIiwiY2hpbGRyZW4iLCJwcmVwZW5kIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7Ozs7OztBQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFrQk1BLE07OztBQUVGLGtCQUFZQyxRQUFaLEVBQXNCO0FBQUE7O0FBQUEsaURBQ2xCLHNCQUFNQSxRQUFOLENBRGtCOztBQUVsQixVQUFLQyxJQUFMLEdBQVksUUFBWjtBQUZrQjtBQUdyQjs7bUJBRURDLE0scUJBQW9CO0FBQUE7O0FBQ2hCLFFBQUssQ0FBQyxLQUFLQyxLQUFYLEVBQW1CLEtBQUtBLEtBQUwsR0FBYSxFQUFiOztBQURILHNDQUFWQyxRQUFVO0FBQVZBLGNBQVU7QUFBQTs7QUFFaEIsV0FBTyw4Q0FBTUYsTUFBTixrREFBZ0JFLFFBQWhCLEVBQVA7QUFDSCxHOzttQkFFREMsTyxzQkFBcUI7QUFBQTs7QUFDakIsUUFBSyxDQUFDLEtBQUtGLEtBQVgsRUFBbUIsS0FBS0EsS0FBTCxHQUFhLEVBQWI7O0FBREYsdUNBQVZDLFFBQVU7QUFBVkEsY0FBVTtBQUFBOztBQUVqQixXQUFPLCtDQUFNQyxPQUFOLG1EQUFpQkQsUUFBakIsRUFBUDtBQUNILEc7O0FBRUQ7Ozs7Ozs7Ozs7QUFVQTs7Ozs7Ozs7Ozs7O0FBWUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztrQkFpQ1dMLE0iLCJmaWxlIjoiYXQtcnVsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBDb250YWluZXIgZnJvbSAnLi9jb250YWluZXInO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gYXQtcnVsZS5cbiAqXG4gKiBJZiBpdOKAmXMgZm9sbG93ZWQgaW4gdGhlIENTUyBieSBhIHt9IGJsb2NrLCB0aGlzIG5vZGUgd2lsbCBoYXZlXG4gKiBhIG5vZGVzIHByb3BlcnR5IHJlcHJlc2VudGluZyBpdHMgY2hpbGRyZW4uXG4gKlxuICogQGV4dGVuZHMgQ29udGFpbmVyXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHJvb3QgPSBwb3N0Y3NzLnBhcnNlKCdAY2hhcnNldCBcIlVURi04XCI7IEBtZWRpYSBwcmludCB7fScpO1xuICpcbiAqIGNvbnN0IGNoYXJzZXQgPSByb290LmZpcnN0O1xuICogY2hhcnNldC50eXBlICAvLz0+ICdhdHJ1bGUnXG4gKiBjaGFyc2V0Lm5vZGVzIC8vPT4gdW5kZWZpbmVkXG4gKlxuICogY29uc3QgbWVkaWEgPSByb290Lmxhc3Q7XG4gKiBtZWRpYS5ub2RlcyAgIC8vPT4gW11cbiAqL1xuY2xhc3MgQXRSdWxlIGV4dGVuZHMgQ29udGFpbmVyIHtcblxuICAgIGNvbnN0cnVjdG9yKGRlZmF1bHRzKSB7XG4gICAgICAgIHN1cGVyKGRlZmF1bHRzKTtcbiAgICAgICAgdGhpcy50eXBlID0gJ2F0cnVsZSc7XG4gICAgfVxuXG4gICAgYXBwZW5kKC4uLmNoaWxkcmVuKSB7XG4gICAgICAgIGlmICggIXRoaXMubm9kZXMgKSB0aGlzLm5vZGVzID0gW107XG4gICAgICAgIHJldHVybiBzdXBlci5hcHBlbmQoLi4uY2hpbGRyZW4pO1xuICAgIH1cblxuICAgIHByZXBlbmQoLi4uY2hpbGRyZW4pIHtcbiAgICAgICAgaWYgKCAhdGhpcy5ub2RlcyApIHRoaXMubm9kZXMgPSBbXTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLnByZXBlbmQoLi4uY2hpbGRyZW4pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJvZiBBdFJ1bGUjXG4gICAgICogQG1lbWJlciB7c3RyaW5nfSBuYW1lIC0gdGhlIGF0LXJ1bGXigJlzIG5hbWUgaW1tZWRpYXRlbHkgZm9sbG93cyB0aGUgYEBgXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IHJvb3QgID0gcG9zdGNzcy5wYXJzZSgnQG1lZGlhIHByaW50IHt9Jyk7XG4gICAgICogbWVkaWEubmFtZSAvLz0+ICdtZWRpYSdcbiAgICAgKiBjb25zdCBtZWRpYSA9IHJvb3QuZmlyc3Q7XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyb2YgQXRSdWxlI1xuICAgICAqIEBtZW1iZXIge3N0cmluZ30gcGFyYW1zIC0gdGhlIGF0LXJ1bGXigJlzIHBhcmFtZXRlcnMsIHRoZSB2YWx1ZXNcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQgZm9sbG93IHRoZSBhdC1ydWxl4oCZcyBuYW1lIGJ1dCBwcmVjZWRlXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICBhbnkge30gYmxvY2tcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogY29uc3Qgcm9vdCAgPSBwb3N0Y3NzLnBhcnNlKCdAbWVkaWEgcHJpbnQsIHNjcmVlbiB7fScpO1xuICAgICAqIGNvbnN0IG1lZGlhID0gcm9vdC5maXJzdDtcbiAgICAgKiBtZWRpYS5wYXJhbXMgLy89PiAncHJpbnQsIHNjcmVlbidcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJvZiBBdFJ1bGUjXG4gICAgICogQG1lbWJlciB7b2JqZWN0fSByYXdzIC0gSW5mb3JtYXRpb24gdG8gZ2VuZXJhdGUgYnl0ZS10by1ieXRlIGVxdWFsXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSBzdHJpbmcgYXMgaXQgd2FzIGluIHRoZSBvcmlnaW4gaW5wdXQuXG4gICAgICpcbiAgICAgKiBFdmVyeSBwYXJzZXIgc2F2ZXMgaXRzIG93biBwcm9wZXJ0aWVzLFxuICAgICAqIGJ1dCB0aGUgZGVmYXVsdCBDU1MgcGFyc2VyIHVzZXM6XG4gICAgICpcbiAgICAgKiAqIGBiZWZvcmVgOiB0aGUgc3BhY2Ugc3ltYm9scyBiZWZvcmUgdGhlIG5vZGUuIEl0IGFsc28gc3RvcmVzIGAqYFxuICAgICAqICAgYW5kIGBfYCBzeW1ib2xzIGJlZm9yZSB0aGUgZGVjbGFyYXRpb24gKElFIGhhY2spLlxuICAgICAqICogYGFmdGVyYDogdGhlIHNwYWNlIHN5bWJvbHMgYWZ0ZXIgdGhlIGxhc3QgY2hpbGQgb2YgdGhlIG5vZGVcbiAgICAgKiAgIHRvIHRoZSBlbmQgb2YgdGhlIG5vZGUuXG4gICAgICogKiBgYmV0d2VlbmA6IHRoZSBzeW1ib2xzIGJldHdlZW4gdGhlIHByb3BlcnR5IGFuZCB2YWx1ZVxuICAgICAqICAgZm9yIGRlY2xhcmF0aW9ucywgc2VsZWN0b3IgYW5kIGB7YCBmb3IgcnVsZXMsIG9yIGxhc3QgcGFyYW1ldGVyXG4gICAgICogICBhbmQgYHtgIGZvciBhdC1ydWxlcy5cbiAgICAgKiAqIGBzZW1pY29sb25gOiBjb250YWlucyB0cnVlIGlmIHRoZSBsYXN0IGNoaWxkIGhhc1xuICAgICAqICAgYW4gKG9wdGlvbmFsKSBzZW1pY29sb24uXG4gICAgICogKiBgYWZ0ZXJOYW1lYDogdGhlIHNwYWNlIGJldHdlZW4gdGhlIGF0LXJ1bGUgbmFtZSBhbmQgaXRzIHBhcmFtZXRlcnMuXG4gICAgICpcbiAgICAgKiBQb3N0Q1NTIGNsZWFucyBhdC1ydWxlIHBhcmFtZXRlcnMgZnJvbSBjb21tZW50cyBhbmQgZXh0cmEgc3BhY2VzLFxuICAgICAqIGJ1dCBpdCBzdG9yZXMgb3JpZ2luIGNvbnRlbnQgaW4gcmF3cyBwcm9wZXJ0aWVzLlxuICAgICAqIEFzIHN1Y2gsIGlmIHlvdSBkb27igJl0IGNoYW5nZSBhIGRlY2xhcmF0aW9u4oCZcyB2YWx1ZSxcbiAgICAgKiBQb3N0Q1NTIHdpbGwgdXNlIHRoZSByYXcgdmFsdWUgd2l0aCBjb21tZW50cy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogY29uc3Qgcm9vdCA9IHBvc3Rjc3MucGFyc2UoJyAgQG1lZGlhXFxucHJpbnQge1xcbn0nKVxuICAgICAqIHJvb3QuZmlyc3QuZmlyc3QucmF3cyAvLz0+IHsgYmVmb3JlOiAnICAnLFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYmV0d2VlbjogJyAnLFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYWZ0ZXJOYW1lOiAnXFxuJyxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGFmdGVyOiAnXFxuJyB9XG4gICAgICovXG59XG5cbmV4cG9ydCBkZWZhdWx0IEF0UnVsZTtcbiJdfQ==
