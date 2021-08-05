'use strict';

exports.__esModule = true;

var _declaration = require('./declaration');

var _declaration2 = _interopRequireDefault(_declaration);

var _processor = require('./processor');

var _processor2 = _interopRequireDefault(_processor);

var _stringify = require('./stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _comment = require('./comment');

var _comment2 = _interopRequireDefault(_comment);

var _atRule = require('./at-rule');

var _atRule2 = _interopRequireDefault(_atRule);

var _vendor = require('./vendor');

var _vendor2 = _interopRequireDefault(_vendor);

var _parse = require('./parse');

var _parse2 = _interopRequireDefault(_parse);

var _list = require('./list');

var _list2 = _interopRequireDefault(_list);

var _rule = require('./rule');

var _rule2 = _interopRequireDefault(_rule);

var _root = require('./root');

var _root2 = _interopRequireDefault(_root);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a new {@link Processor} instance that will apply `plugins`
 * as CSS processors.
 *
 * @param {Array.<Plugin|pluginFunction>|Processor} plugins - PostCSS
 *        plugins. See {@link Processor#use} for plugin format.
 *
 * @return {Processor} Processor to process multiple CSS
 *
 * @example
 * import postcss from 'postcss';
 *
 * postcss(plugins).process(css, { from, to }).then(result => {
 *   console.log(result.css);
 * });
 *
 * @namespace postcss
 */
function postcss() {
  for (var _len = arguments.length, plugins = Array(_len), _key = 0; _key < _len; _key++) {
    plugins[_key] = arguments[_key];
  }

  if (plugins.length === 1 && Array.isArray(plugins[0])) {
    plugins = plugins[0];
  }
  return new _processor2.default(plugins);
}

/**
 * Creates a PostCSS plugin with a standard API.
 *
 * The newly-wrapped function will provide both the name and PostCSS
 * version of the plugin.
 *
 * ```js
 *  const processor = postcss([replace]);
 *  processor.plugins[0].postcssPlugin  //=> 'postcss-replace'
 *  processor.plugins[0].postcssVersion //=> '5.1.0'
 * ```
 *
 * The plugin function receives 2 arguments: {@link Root}
 * and {@link Result} instance. The function should mutate the provided
 * `Root` node. Alternatively, you can create a new `Root` node
 * and override the `result.root` property.
 *
 * ```js
 * const cleaner = postcss.plugin('postcss-cleaner', () => {
 *   return (root, result) => {
 *     result.root = postcss.root();
 *   };
 * });
 * ```
 *
 * As a convenience, plugins also expose a `process` method so that you can use
 * them as standalone tools.
 *
 * ```js
 * cleaner.process(css, processOpts, pluginOpts);
 * // This is equivalent to:
 * postcss([ cleaner(pluginOpts) ]).process(css, processOpts);
 * ```
 *
 * Asynchronous plugins should return a `Promise` instance.
 *
 * ```js
 * postcss.plugin('postcss-import', () => {
 *   return (root, result) => {
 *     return new Promise( (resolve, reject) => {
 *       fs.readFile('base.css', (base) => {
 *         root.prepend(base);
 *         resolve();
 *       });
 *     });
 *   };
 * });
 * ```
 *
 * Add warnings using the {@link Node#warn} method.
 * Send data to other plugins using the {@link Result#messages} array.
 *
 * ```js
 * postcss.plugin('postcss-caniuse-test', () => {
 *   return (root, result) => {
 *     css.walkDecls(decl => {
 *       if ( !caniuse.support(decl.prop) ) {
 *         decl.warn(result, 'Some browsers do not support ' + decl.prop);
 *       }
 *     });
 *   };
 * });
 * ```
 *
 * @param {string} name          - PostCSS plugin name. Same as in `name`
 *                                 property in `package.json`. It will be saved
 *                                 in `plugin.postcssPlugin` property.
 * @param {function} initializer - will receive plugin options
 *                                 and should return {@link pluginFunction}
 *
 * @return {Plugin} PostCSS plugin
 */
postcss.plugin = function plugin(name, initializer) {
  var creator = function creator() {
    var transformer = initializer.apply(undefined, arguments);
    transformer.postcssPlugin = name;
    transformer.postcssVersion = new _processor2.default().version;
    return transformer;
  };

  var cache = void 0;
  Object.defineProperty(creator, 'postcss', {
    get: function get() {
      if (!cache) cache = creator();
      return cache;
    }
  });

  creator.process = function (css, processOpts, pluginOpts) {
    return postcss([creator(pluginOpts)]).process(css, processOpts);
  };

  return creator;
};

/**
 * Default function to convert a node tree into a CSS string.
 *
 * @param {Node} node       - start node for stringifing. Usually {@link Root}.
 * @param {builder} builder - function to concatenate CSS from node’s parts
 *                            or generate string and source map
 *
 * @return {void}
 *
 * @function
 */
postcss.stringify = _stringify2.default;

/**
 * Parses source css and returns a new {@link Root} node,
 * which contains the source CSS nodes.
 *
 * @param {string|toString} css   - string with input CSS or any object
 *                                  with toString() method, like a Buffer
 * @param {processOptions} [opts] - options with only `from` and `map` keys
 *
 * @return {Root} PostCSS AST
 *
 * @example
 * // Simple CSS concatenation with source map support
 * const root1 = postcss.parse(css1, { from: file1 });
 * const root2 = postcss.parse(css2, { from: file2 });
 * root1.append(root2).toResult().css;
 *
 * @function
 */
postcss.parse = _parse2.default;

/**
 * @member {vendor} - Contains the {@link vendor} module.
 *
 * @example
 * postcss.vendor.unprefixed('-moz-tab') //=> ['tab']
 */
postcss.vendor = _vendor2.default;

/**
 * @member {list} - Contains the {@link list} module.
 *
 * @example
 * postcss.list.space('5px calc(10% + 5px)') //=> ['5px', 'calc(10% + 5px)']
 */
postcss.list = _list2.default;

/**
 * Creates a new {@link Comment} node.
 *
 * @param {object} [defaults] - properties for the new node.
 *
 * @return {Comment} new Comment node
 *
 * @example
 * postcss.comment({ text: 'test' })
 */
postcss.comment = function (defaults) {
  return new _comment2.default(defaults);
};

/**
 * Creates a new {@link AtRule} node.
 *
 * @param {object} [defaults] - properties for the new node.
 *
 * @return {AtRule} new AtRule node
 *
 * @example
 * postcss.atRule({ name: 'charset' }).toString() //=> "@charset"
 */
postcss.atRule = function (defaults) {
  return new _atRule2.default(defaults);
};

/**
 * Creates a new {@link Declaration} node.
 *
 * @param {object} [defaults] - properties for the new node.
 *
 * @return {Declaration} new Declaration node
 *
 * @example
 * postcss.decl({ prop: 'color', value: 'red' }).toString() //=> "color: red"
 */
postcss.decl = function (defaults) {
  return new _declaration2.default(defaults);
};

/**
 * Creates a new {@link Rule} node.
 *
 * @param {object} [defaults] - properties for the new node.
 *
 * @return {AtRule} new Rule node
 *
 * @example
 * postcss.rule({ selector: 'a' }).toString() //=> "a {\n}"
 */
postcss.rule = function (defaults) {
  return new _rule2.default(defaults);
};

/**
 * Creates a new {@link Root} node.
 *
 * @param {object} [defaults] - properties for the new node.
 *
 * @return {Root} new Root node
 *
 * @example
 * postcss.root({ after: '\n' }).toString() //=> "\n"
 */
postcss.root = function (defaults) {
  return new _root2.default(defaults);
};

exports.default = postcss;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBvc3Rjc3MuZXM2Il0sIm5hbWVzIjpbInBvc3Rjc3MiLCJwbHVnaW5zIiwibGVuZ3RoIiwiQXJyYXkiLCJpc0FycmF5IiwicGx1Z2luIiwibmFtZSIsImluaXRpYWxpemVyIiwiY3JlYXRvciIsInRyYW5zZm9ybWVyIiwicG9zdGNzc1BsdWdpbiIsInBvc3Rjc3NWZXJzaW9uIiwidmVyc2lvbiIsImNhY2hlIiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJnZXQiLCJwcm9jZXNzIiwiY3NzIiwicHJvY2Vzc09wdHMiLCJwbHVnaW5PcHRzIiwic3RyaW5naWZ5IiwicGFyc2UiLCJ2ZW5kb3IiLCJsaXN0IiwiY29tbWVudCIsImRlZmF1bHRzIiwiYXRSdWxlIiwiZGVjbCIsInJ1bGUiLCJyb290Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkEsU0FBU0EsT0FBVCxHQUE2QjtBQUFBLG9DQUFUQyxPQUFTO0FBQVRBLFdBQVM7QUFBQTs7QUFDekIsTUFBS0EsUUFBUUMsTUFBUixLQUFtQixDQUFuQixJQUF3QkMsTUFBTUMsT0FBTixDQUFjSCxRQUFRLENBQVIsQ0FBZCxDQUE3QixFQUF5RDtBQUNyREEsY0FBVUEsUUFBUSxDQUFSLENBQVY7QUFDSDtBQUNELFNBQU8sd0JBQWNBLE9BQWQsQ0FBUDtBQUNIOztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF3RUFELFFBQVFLLE1BQVIsR0FBaUIsU0FBU0EsTUFBVCxDQUFnQkMsSUFBaEIsRUFBc0JDLFdBQXRCLEVBQW1DO0FBQ2hELE1BQUlDLFVBQVUsU0FBVkEsT0FBVSxHQUFtQjtBQUM3QixRQUFJQyxjQUFjRix1Q0FBbEI7QUFDQUUsZ0JBQVlDLGFBQVosR0FBNkJKLElBQTdCO0FBQ0FHLGdCQUFZRSxjQUFaLEdBQThCLHlCQUFELENBQWtCQyxPQUEvQztBQUNBLFdBQU9ILFdBQVA7QUFDSCxHQUxEOztBQU9BLE1BQUlJLGNBQUo7QUFDQUMsU0FBT0MsY0FBUCxDQUFzQlAsT0FBdEIsRUFBK0IsU0FBL0IsRUFBMEM7QUFDdENRLE9BRHNDLGlCQUNoQztBQUNGLFVBQUssQ0FBQ0gsS0FBTixFQUFjQSxRQUFRTCxTQUFSO0FBQ2QsYUFBT0ssS0FBUDtBQUNIO0FBSnFDLEdBQTFDOztBQU9BTCxVQUFRUyxPQUFSLEdBQWtCLFVBQVVDLEdBQVYsRUFBZUMsV0FBZixFQUE0QkMsVUFBNUIsRUFBd0M7QUFDdEQsV0FBT3BCLFFBQVEsQ0FBRVEsUUFBUVksVUFBUixDQUFGLENBQVIsRUFBaUNILE9BQWpDLENBQXlDQyxHQUF6QyxFQUE4Q0MsV0FBOUMsQ0FBUDtBQUNILEdBRkQ7O0FBSUEsU0FBT1gsT0FBUDtBQUNILENBckJEOztBQXVCQTs7Ozs7Ozs7Ozs7QUFXQVIsUUFBUXFCLFNBQVI7O0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQXJCLFFBQVFzQixLQUFSOztBQUVBOzs7Ozs7QUFNQXRCLFFBQVF1QixNQUFSOztBQUVBOzs7Ozs7QUFNQXZCLFFBQVF3QixJQUFSOztBQUVBOzs7Ozs7Ozs7O0FBVUF4QixRQUFReUIsT0FBUixHQUFrQjtBQUFBLFNBQVksc0JBQVlDLFFBQVosQ0FBWjtBQUFBLENBQWxCOztBQUVBOzs7Ozs7Ozs7O0FBVUExQixRQUFRMkIsTUFBUixHQUFpQjtBQUFBLFNBQVkscUJBQVdELFFBQVgsQ0FBWjtBQUFBLENBQWpCOztBQUVBOzs7Ozs7Ozs7O0FBVUExQixRQUFRNEIsSUFBUixHQUFlO0FBQUEsU0FBWSwwQkFBZ0JGLFFBQWhCLENBQVo7QUFBQSxDQUFmOztBQUVBOzs7Ozs7Ozs7O0FBVUExQixRQUFRNkIsSUFBUixHQUFlO0FBQUEsU0FBWSxtQkFBU0gsUUFBVCxDQUFaO0FBQUEsQ0FBZjs7QUFFQTs7Ozs7Ozs7OztBQVVBMUIsUUFBUThCLElBQVIsR0FBZTtBQUFBLFNBQVksbUJBQVNKLFFBQVQsQ0FBWjtBQUFBLENBQWY7O2tCQUVlMUIsTyIsImZpbGUiOiJwb3N0Y3NzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IERlY2xhcmF0aW9uIGZyb20gJy4vZGVjbGFyYXRpb24nO1xuaW1wb3J0IFByb2Nlc3NvciAgIGZyb20gJy4vcHJvY2Vzc29yJztcbmltcG9ydCBzdHJpbmdpZnkgICBmcm9tICcuL3N0cmluZ2lmeSc7XG5pbXBvcnQgQ29tbWVudCAgICAgZnJvbSAnLi9jb21tZW50JztcbmltcG9ydCBBdFJ1bGUgICAgICBmcm9tICcuL2F0LXJ1bGUnO1xuaW1wb3J0IHZlbmRvciAgICAgIGZyb20gJy4vdmVuZG9yJztcbmltcG9ydCBwYXJzZSAgICAgICBmcm9tICcuL3BhcnNlJztcbmltcG9ydCBsaXN0ICAgICAgICBmcm9tICcuL2xpc3QnO1xuaW1wb3J0IFJ1bGUgICAgICAgIGZyb20gJy4vcnVsZSc7XG5pbXBvcnQgUm9vdCAgICAgICAgZnJvbSAnLi9yb290JztcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcge0BsaW5rIFByb2Nlc3Nvcn0gaW5zdGFuY2UgdGhhdCB3aWxsIGFwcGx5IGBwbHVnaW5zYFxuICogYXMgQ1NTIHByb2Nlc3NvcnMuXG4gKlxuICogQHBhcmFtIHtBcnJheS48UGx1Z2lufHBsdWdpbkZ1bmN0aW9uPnxQcm9jZXNzb3J9IHBsdWdpbnMgLSBQb3N0Q1NTXG4gKiAgICAgICAgcGx1Z2lucy4gU2VlIHtAbGluayBQcm9jZXNzb3IjdXNlfSBmb3IgcGx1Z2luIGZvcm1hdC5cbiAqXG4gKiBAcmV0dXJuIHtQcm9jZXNzb3J9IFByb2Nlc3NvciB0byBwcm9jZXNzIG11bHRpcGxlIENTU1xuICpcbiAqIEBleGFtcGxlXG4gKiBpbXBvcnQgcG9zdGNzcyBmcm9tICdwb3N0Y3NzJztcbiAqXG4gKiBwb3N0Y3NzKHBsdWdpbnMpLnByb2Nlc3MoY3NzLCB7IGZyb20sIHRvIH0pLnRoZW4ocmVzdWx0ID0+IHtcbiAqICAgY29uc29sZS5sb2cocmVzdWx0LmNzcyk7XG4gKiB9KTtcbiAqXG4gKiBAbmFtZXNwYWNlIHBvc3Rjc3NcbiAqL1xuZnVuY3Rpb24gcG9zdGNzcyguLi5wbHVnaW5zKSB7XG4gICAgaWYgKCBwbHVnaW5zLmxlbmd0aCA9PT0gMSAmJiBBcnJheS5pc0FycmF5KHBsdWdpbnNbMF0pICkge1xuICAgICAgICBwbHVnaW5zID0gcGx1Z2luc1swXTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9jZXNzb3IocGx1Z2lucyk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIFBvc3RDU1MgcGx1Z2luIHdpdGggYSBzdGFuZGFyZCBBUEkuXG4gKlxuICogVGhlIG5ld2x5LXdyYXBwZWQgZnVuY3Rpb24gd2lsbCBwcm92aWRlIGJvdGggdGhlIG5hbWUgYW5kIFBvc3RDU1NcbiAqIHZlcnNpb24gb2YgdGhlIHBsdWdpbi5cbiAqXG4gKiBgYGBqc1xuICogIGNvbnN0IHByb2Nlc3NvciA9IHBvc3Rjc3MoW3JlcGxhY2VdKTtcbiAqICBwcm9jZXNzb3IucGx1Z2luc1swXS5wb3N0Y3NzUGx1Z2luICAvLz0+ICdwb3N0Y3NzLXJlcGxhY2UnXG4gKiAgcHJvY2Vzc29yLnBsdWdpbnNbMF0ucG9zdGNzc1ZlcnNpb24gLy89PiAnNS4xLjAnXG4gKiBgYGBcbiAqXG4gKiBUaGUgcGx1Z2luIGZ1bmN0aW9uIHJlY2VpdmVzIDIgYXJndW1lbnRzOiB7QGxpbmsgUm9vdH1cbiAqIGFuZCB7QGxpbmsgUmVzdWx0fSBpbnN0YW5jZS4gVGhlIGZ1bmN0aW9uIHNob3VsZCBtdXRhdGUgdGhlIHByb3ZpZGVkXG4gKiBgUm9vdGAgbm9kZS4gQWx0ZXJuYXRpdmVseSwgeW91IGNhbiBjcmVhdGUgYSBuZXcgYFJvb3RgIG5vZGVcbiAqIGFuZCBvdmVycmlkZSB0aGUgYHJlc3VsdC5yb290YCBwcm9wZXJ0eS5cbiAqXG4gKiBgYGBqc1xuICogY29uc3QgY2xlYW5lciA9IHBvc3Rjc3MucGx1Z2luKCdwb3N0Y3NzLWNsZWFuZXInLCAoKSA9PiB7XG4gKiAgIHJldHVybiAocm9vdCwgcmVzdWx0KSA9PiB7XG4gKiAgICAgcmVzdWx0LnJvb3QgPSBwb3N0Y3NzLnJvb3QoKTtcbiAqICAgfTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogQXMgYSBjb252ZW5pZW5jZSwgcGx1Z2lucyBhbHNvIGV4cG9zZSBhIGBwcm9jZXNzYCBtZXRob2Qgc28gdGhhdCB5b3UgY2FuIHVzZVxuICogdGhlbSBhcyBzdGFuZGFsb25lIHRvb2xzLlxuICpcbiAqIGBgYGpzXG4gKiBjbGVhbmVyLnByb2Nlc3MoY3NzLCBwcm9jZXNzT3B0cywgcGx1Z2luT3B0cyk7XG4gKiAvLyBUaGlzIGlzIGVxdWl2YWxlbnQgdG86XG4gKiBwb3N0Y3NzKFsgY2xlYW5lcihwbHVnaW5PcHRzKSBdKS5wcm9jZXNzKGNzcywgcHJvY2Vzc09wdHMpO1xuICogYGBgXG4gKlxuICogQXN5bmNocm9ub3VzIHBsdWdpbnMgc2hvdWxkIHJldHVybiBhIGBQcm9taXNlYCBpbnN0YW5jZS5cbiAqXG4gKiBgYGBqc1xuICogcG9zdGNzcy5wbHVnaW4oJ3Bvc3Rjc3MtaW1wb3J0JywgKCkgPT4ge1xuICogICByZXR1cm4gKHJvb3QsIHJlc3VsdCkgPT4ge1xuICogICAgIHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICogICAgICAgZnMucmVhZEZpbGUoJ2Jhc2UuY3NzJywgKGJhc2UpID0+IHtcbiAqICAgICAgICAgcm9vdC5wcmVwZW5kKGJhc2UpO1xuICogICAgICAgICByZXNvbHZlKCk7XG4gKiAgICAgICB9KTtcbiAqICAgICB9KTtcbiAqICAgfTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogQWRkIHdhcm5pbmdzIHVzaW5nIHRoZSB7QGxpbmsgTm9kZSN3YXJufSBtZXRob2QuXG4gKiBTZW5kIGRhdGEgdG8gb3RoZXIgcGx1Z2lucyB1c2luZyB0aGUge0BsaW5rIFJlc3VsdCNtZXNzYWdlc30gYXJyYXkuXG4gKlxuICogYGBganNcbiAqIHBvc3Rjc3MucGx1Z2luKCdwb3N0Y3NzLWNhbml1c2UtdGVzdCcsICgpID0+IHtcbiAqICAgcmV0dXJuIChyb290LCByZXN1bHQpID0+IHtcbiAqICAgICBjc3Mud2Fsa0RlY2xzKGRlY2wgPT4ge1xuICogICAgICAgaWYgKCAhY2FuaXVzZS5zdXBwb3J0KGRlY2wucHJvcCkgKSB7XG4gKiAgICAgICAgIGRlY2wud2FybihyZXN1bHQsICdTb21lIGJyb3dzZXJzIGRvIG5vdCBzdXBwb3J0ICcgKyBkZWNsLnByb3ApO1xuICogICAgICAgfVxuICogICAgIH0pO1xuICogICB9O1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAgICAgICAgICAtIFBvc3RDU1MgcGx1Z2luIG5hbWUuIFNhbWUgYXMgaW4gYG5hbWVgXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5IGluIGBwYWNrYWdlLmpzb25gLiBJdCB3aWxsIGJlIHNhdmVkXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluIGBwbHVnaW4ucG9zdGNzc1BsdWdpbmAgcHJvcGVydHkuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBpbml0aWFsaXplciAtIHdpbGwgcmVjZWl2ZSBwbHVnaW4gb3B0aW9uc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQgc2hvdWxkIHJldHVybiB7QGxpbmsgcGx1Z2luRnVuY3Rpb259XG4gKlxuICogQHJldHVybiB7UGx1Z2lufSBQb3N0Q1NTIHBsdWdpblxuICovXG5wb3N0Y3NzLnBsdWdpbiA9IGZ1bmN0aW9uIHBsdWdpbihuYW1lLCBpbml0aWFsaXplcikge1xuICAgIGxldCBjcmVhdG9yID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgbGV0IHRyYW5zZm9ybWVyID0gaW5pdGlhbGl6ZXIoLi4uYXJncyk7XG4gICAgICAgIHRyYW5zZm9ybWVyLnBvc3Rjc3NQbHVnaW4gID0gbmFtZTtcbiAgICAgICAgdHJhbnNmb3JtZXIucG9zdGNzc1ZlcnNpb24gPSAobmV3IFByb2Nlc3NvcigpKS52ZXJzaW9uO1xuICAgICAgICByZXR1cm4gdHJhbnNmb3JtZXI7XG4gICAgfTtcblxuICAgIGxldCBjYWNoZTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY3JlYXRvciwgJ3Bvc3Rjc3MnLCB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICAgIGlmICggIWNhY2hlICkgY2FjaGUgPSBjcmVhdG9yKCk7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGNyZWF0b3IucHJvY2VzcyA9IGZ1bmN0aW9uIChjc3MsIHByb2Nlc3NPcHRzLCBwbHVnaW5PcHRzKSB7XG4gICAgICAgIHJldHVybiBwb3N0Y3NzKFsgY3JlYXRvcihwbHVnaW5PcHRzKSBdKS5wcm9jZXNzKGNzcywgcHJvY2Vzc09wdHMpO1xuICAgIH07XG5cbiAgICByZXR1cm4gY3JlYXRvcjtcbn07XG5cbi8qKlxuICogRGVmYXVsdCBmdW5jdGlvbiB0byBjb252ZXJ0IGEgbm9kZSB0cmVlIGludG8gYSBDU1Mgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAgICAgICAtIHN0YXJ0IG5vZGUgZm9yIHN0cmluZ2lmaW5nLiBVc3VhbGx5IHtAbGluayBSb290fS5cbiAqIEBwYXJhbSB7YnVpbGRlcn0gYnVpbGRlciAtIGZ1bmN0aW9uIHRvIGNvbmNhdGVuYXRlIENTUyBmcm9tIG5vZGXigJlzIHBhcnRzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvciBnZW5lcmF0ZSBzdHJpbmcgYW5kIHNvdXJjZSBtYXBcbiAqXG4gKiBAcmV0dXJuIHt2b2lkfVxuICpcbiAqIEBmdW5jdGlvblxuICovXG5wb3N0Y3NzLnN0cmluZ2lmeSA9IHN0cmluZ2lmeTtcblxuLyoqXG4gKiBQYXJzZXMgc291cmNlIGNzcyBhbmQgcmV0dXJucyBhIG5ldyB7QGxpbmsgUm9vdH0gbm9kZSxcbiAqIHdoaWNoIGNvbnRhaW5zIHRoZSBzb3VyY2UgQ1NTIG5vZGVzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfHRvU3RyaW5nfSBjc3MgICAtIHN0cmluZyB3aXRoIGlucHV0IENTUyBvciBhbnkgb2JqZWN0XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aXRoIHRvU3RyaW5nKCkgbWV0aG9kLCBsaWtlIGEgQnVmZmVyXG4gKiBAcGFyYW0ge3Byb2Nlc3NPcHRpb25zfSBbb3B0c10gLSBvcHRpb25zIHdpdGggb25seSBgZnJvbWAgYW5kIGBtYXBgIGtleXNcbiAqXG4gKiBAcmV0dXJuIHtSb290fSBQb3N0Q1NTIEFTVFxuICpcbiAqIEBleGFtcGxlXG4gKiAvLyBTaW1wbGUgQ1NTIGNvbmNhdGVuYXRpb24gd2l0aCBzb3VyY2UgbWFwIHN1cHBvcnRcbiAqIGNvbnN0IHJvb3QxID0gcG9zdGNzcy5wYXJzZShjc3MxLCB7IGZyb206IGZpbGUxIH0pO1xuICogY29uc3Qgcm9vdDIgPSBwb3N0Y3NzLnBhcnNlKGNzczIsIHsgZnJvbTogZmlsZTIgfSk7XG4gKiByb290MS5hcHBlbmQocm9vdDIpLnRvUmVzdWx0KCkuY3NzO1xuICpcbiAqIEBmdW5jdGlvblxuICovXG5wb3N0Y3NzLnBhcnNlID0gcGFyc2U7XG5cbi8qKlxuICogQG1lbWJlciB7dmVuZG9yfSAtIENvbnRhaW5zIHRoZSB7QGxpbmsgdmVuZG9yfSBtb2R1bGUuXG4gKlxuICogQGV4YW1wbGVcbiAqIHBvc3Rjc3MudmVuZG9yLnVucHJlZml4ZWQoJy1tb3otdGFiJykgLy89PiBbJ3RhYiddXG4gKi9cbnBvc3Rjc3MudmVuZG9yID0gdmVuZG9yO1xuXG4vKipcbiAqIEBtZW1iZXIge2xpc3R9IC0gQ29udGFpbnMgdGhlIHtAbGluayBsaXN0fSBtb2R1bGUuXG4gKlxuICogQGV4YW1wbGVcbiAqIHBvc3Rjc3MubGlzdC5zcGFjZSgnNXB4IGNhbGMoMTAlICsgNXB4KScpIC8vPT4gWyc1cHgnLCAnY2FsYygxMCUgKyA1cHgpJ11cbiAqL1xucG9zdGNzcy5saXN0ID0gbGlzdDtcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHtAbGluayBDb21tZW50fSBub2RlLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBbZGVmYXVsdHNdIC0gcHJvcGVydGllcyBmb3IgdGhlIG5ldyBub2RlLlxuICpcbiAqIEByZXR1cm4ge0NvbW1lbnR9IG5ldyBDb21tZW50IG5vZGVcbiAqXG4gKiBAZXhhbXBsZVxuICogcG9zdGNzcy5jb21tZW50KHsgdGV4dDogJ3Rlc3QnIH0pXG4gKi9cbnBvc3Rjc3MuY29tbWVudCA9IGRlZmF1bHRzID0+IG5ldyBDb21tZW50KGRlZmF1bHRzKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHtAbGluayBBdFJ1bGV9IG5vZGUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IFtkZWZhdWx0c10gLSBwcm9wZXJ0aWVzIGZvciB0aGUgbmV3IG5vZGUuXG4gKlxuICogQHJldHVybiB7QXRSdWxlfSBuZXcgQXRSdWxlIG5vZGVcbiAqXG4gKiBAZXhhbXBsZVxuICogcG9zdGNzcy5hdFJ1bGUoeyBuYW1lOiAnY2hhcnNldCcgfSkudG9TdHJpbmcoKSAvLz0+IFwiQGNoYXJzZXRcIlxuICovXG5wb3N0Y3NzLmF0UnVsZSA9IGRlZmF1bHRzID0+IG5ldyBBdFJ1bGUoZGVmYXVsdHMpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcge0BsaW5rIERlY2xhcmF0aW9ufSBub2RlLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBbZGVmYXVsdHNdIC0gcHJvcGVydGllcyBmb3IgdGhlIG5ldyBub2RlLlxuICpcbiAqIEByZXR1cm4ge0RlY2xhcmF0aW9ufSBuZXcgRGVjbGFyYXRpb24gbm9kZVxuICpcbiAqIEBleGFtcGxlXG4gKiBwb3N0Y3NzLmRlY2woeyBwcm9wOiAnY29sb3InLCB2YWx1ZTogJ3JlZCcgfSkudG9TdHJpbmcoKSAvLz0+IFwiY29sb3I6IHJlZFwiXG4gKi9cbnBvc3Rjc3MuZGVjbCA9IGRlZmF1bHRzID0+IG5ldyBEZWNsYXJhdGlvbihkZWZhdWx0cyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyB7QGxpbmsgUnVsZX0gbm9kZS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gW2RlZmF1bHRzXSAtIHByb3BlcnRpZXMgZm9yIHRoZSBuZXcgbm9kZS5cbiAqXG4gKiBAcmV0dXJuIHtBdFJ1bGV9IG5ldyBSdWxlIG5vZGVcbiAqXG4gKiBAZXhhbXBsZVxuICogcG9zdGNzcy5ydWxlKHsgc2VsZWN0b3I6ICdhJyB9KS50b1N0cmluZygpIC8vPT4gXCJhIHtcXG59XCJcbiAqL1xucG9zdGNzcy5ydWxlID0gZGVmYXVsdHMgPT4gbmV3IFJ1bGUoZGVmYXVsdHMpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcge0BsaW5rIFJvb3R9IG5vZGUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IFtkZWZhdWx0c10gLSBwcm9wZXJ0aWVzIGZvciB0aGUgbmV3IG5vZGUuXG4gKlxuICogQHJldHVybiB7Um9vdH0gbmV3IFJvb3Qgbm9kZVxuICpcbiAqIEBleGFtcGxlXG4gKiBwb3N0Y3NzLnJvb3QoeyBhZnRlcjogJ1xcbicgfSkudG9TdHJpbmcoKSAvLz0+IFwiXFxuXCJcbiAqL1xucG9zdGNzcy5yb290ID0gZGVmYXVsdHMgPT4gbmV3IFJvb3QoZGVmYXVsdHMpO1xuXG5leHBvcnQgZGVmYXVsdCBwb3N0Y3NzO1xuIl19
