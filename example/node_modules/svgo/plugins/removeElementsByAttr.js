'use strict';

exports.type = 'perItem';

exports.active = false;

exports.description =
  'removes arbitrary elements by ID or className (disabled by default)';

exports.params = {
  id: [],
  class: [],
};

/**
 * Remove arbitrary SVG elements by ID or className.
 *
 * @param id
 *   examples:
 *
 *     > single: remove element with ID of `elementID`
 *     ---
 *     removeElementsByAttr:
 *       id: 'elementID'
 *
 *     > list: remove multiple elements by ID
 *     ---
 *     removeElementsByAttr:
 *       id:
 *         - 'elementID'
 *         - 'anotherID'
 *
 * @param class
 *   examples:
 *
 *     > single: remove all elements with class of `elementClass`
 *     ---
 *     removeElementsByAttr:
 *       class: 'elementClass'
 *
 *     > list: remove all elements with class of `elementClass` or `anotherClass`
 *     ---
 *     removeElementsByAttr:
 *       class:
 *         - 'elementClass'
 *         - 'anotherClass'
 *
 * @param {Object} item current iteration item
 * @param {Object} params plugin params
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Eli Dupuis (@elidupuis)
 */
exports.fn = function (item, params) {
  // wrap params in an array if not already
  ['id', 'class'].forEach(function (key) {
    if (!Array.isArray(params[key])) {
      params[key] = [params[key]];
    }
  });

  // abort if current item is no an element
  if (item.type !== 'element') {
    return;
  }

  // remove element if it's `id` matches configured `id` params
  if (item.attributes.id != null && params.id.length !== 0) {
    return params.id.includes(item.attributes.id) === false;
  }

  // remove element if it's `class` contains any of the configured `class` params
  if (item.attributes.class && params.class.length !== 0) {
    const classList = item.attributes.class.split(' ');
    return params.class.some((item) => classList.includes(item)) === false;
  }
};
