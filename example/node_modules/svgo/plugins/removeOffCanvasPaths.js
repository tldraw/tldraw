'use strict';

exports.type = 'perItem';

exports.active = false;

exports.description =
  'removes elements that are drawn outside of the viewbox (disabled by default)';

const JSAPI = require('../lib/svgo/jsAPI.js');

var _path = require('./_path.js'),
  intersects = _path.intersects,
  path2js = _path.path2js,
  viewBox,
  viewBoxJS;

/**
 * Remove elements that are drawn outside of the viewbox.
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author JoshyPHP
 */
exports.fn = function (item) {
  if (
    item.type === 'element' &&
    item.name === 'path' &&
    item.attributes.d != null &&
    typeof viewBox !== 'undefined'
  ) {
    // Consider that any item with a transform attribute or a M instruction
    // within the viewBox is visible
    if (hasTransform(item) || pathMovesWithinViewBox(item.attributes.d)) {
      return true;
    }

    var pathJS = path2js(item);
    if (pathJS.length === 2) {
      // Use a closed clone of the path if it's too short for intersects()
      pathJS = JSON.parse(JSON.stringify(pathJS));
      pathJS.push({ instruction: 'z' });
    }

    return intersects(viewBoxJS, pathJS);
  }
  if (item.type === 'element' && item.name === 'svg') {
    parseViewBox(item);
  }

  return true;
};

/**
 * Test whether given item or any of its ancestors has a transform attribute.
 *
 * @param {String} path
 * @return {Boolean}
 */
function hasTransform(item) {
  return (
    item.attributes.transform != null ||
    (item.parentNode &&
      item.parentNode.type === 'element' &&
      hasTransform(item.parentNode))
  );
}

/**
 * Parse the viewBox coordinates and compute the JS representation of its path.
 *
 * @param {Object} svg svg element item
 */
function parseViewBox(svg) {
  var viewBoxData = '';
  if (svg.attributes.viewBox != null) {
    // Remove commas and plus signs, normalize and trim whitespace
    viewBoxData = svg.attributes.viewBox;
  } else if (svg.attributes.height != null && svg.attributes.width != null) {
    viewBoxData = `0 0 ${svg.attributes.width} ${svg.attributes.height}`;
  }

  // Remove commas and plus signs, normalize and trim whitespace
  viewBoxData = viewBoxData
    .replace(/[,+]|px/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*|\s*$/g, '');

  // Ensure that the dimensions are 4 values separated by space
  var m = /^(-?\d*\.?\d+) (-?\d*\.?\d+) (\d*\.?\d+) (\d*\.?\d+)$/.exec(
    viewBoxData
  );
  if (!m) {
    return;
  }

  // Store the viewBox boundaries
  viewBox = {
    left: parseFloat(m[1]),
    top: parseFloat(m[2]),
    right: parseFloat(m[1]) + parseFloat(m[3]),
    bottom: parseFloat(m[2]) + parseFloat(m[4]),
  };

  var path = new JSAPI({
    type: 'element',
    name: 'path',
    attributes: {
      d: 'M' + m[1] + ' ' + m[2] + 'h' + m[3] + 'v' + m[4] + 'H' + m[1] + 'z',
    },
    content: [],
  });

  viewBoxJS = path2js(path);
}

/**
 * Test whether given path has a M instruction with coordinates within the viewBox.
 *
 * @param {String} path
 * @return {Boolean}
 */
function pathMovesWithinViewBox(path) {
  var regexp = /M\s*(-?\d*\.?\d+)(?!\d)\s*(-?\d*\.?\d+)/g,
    m;
  while (null !== (m = regexp.exec(path))) {
    if (
      m[1] >= viewBox.left &&
      m[1] <= viewBox.right &&
      m[2] >= viewBox.top &&
      m[2] <= viewBox.bottom
    ) {
      return true;
    }
  }

  return false;
}
