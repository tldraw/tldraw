'use strict';

const { traverse } = require('../lib/xast.js');
const JSAPI = require('../lib/svgo/jsAPI');

exports.type = 'full';

exports.active = false;

exports.description =
  'Finds <path> elements with the same d, fill, and ' +
  'stroke, and converts them to <use> elements ' +
  'referencing a single <path> def.';

/**
 * Finds <path> elements with the same d, fill, and stroke, and converts them to
 * <use> elements referencing a single <path> def.
 *
 * @author Jacob Howcroft
 */
exports.fn = function (root) {
  const seen = new Map();
  let count = 0;
  const defs = [];
  traverse(root, (node) => {
    if (
      node.type !== 'element' ||
      node.name !== 'path' ||
      node.attributes.d == null
    ) {
      return;
    }
    const d = node.attributes.d;
    const fill = node.attributes.fill || '';
    const stroke = node.attributes.stroke || '';
    const key = d + ';s:' + stroke + ';f:' + fill;
    const hasSeen = seen.get(key);
    if (!hasSeen) {
      seen.set(key, { elem: node, reused: false });
      return;
    }
    if (!hasSeen.reused) {
      hasSeen.reused = true;
      if (hasSeen.elem.attributes.id == null) {
        hasSeen.elem.attributes.id = 'reuse-' + count++;
      }
      defs.push(hasSeen.elem);
    }
    convertToUse(node, hasSeen.elem.attributes.id);
  });
  if (defs.length > 0) {
    const defsTag = new JSAPI(
      {
        type: 'element',
        name: 'defs',
        attributes: {},
        children: [],
      },
      root
    );
    root.children[0].spliceContent(0, 0, defsTag);
    for (let def of defs) {
      // Remove class and style before copying to avoid circular refs in
      // JSON.stringify. This is fine because we don't actually want class or
      // style information to be copied.
      const style = def.style;
      const defClass = def.class;
      delete def.style;
      delete def.class;
      const defClone = def.clone();
      def.style = style;
      def.class = defClass;
      delete defClone.attributes.transform;
      defsTag.spliceContent(0, 0, defClone);
      // Convert the original def to a use so the first usage isn't duplicated.
      def = convertToUse(def, defClone.attributes.id);
      delete def.attributes.id;
    }
  }
  return root;
};

/** */
function convertToUse(item, href) {
  item.renameElem('use');
  delete item.attributes.d;
  delete item.attributes.stroke;
  delete item.attributes.fill;
  item.attributes['xlink:href'] = '#' + href;
  delete item.pathJS;
  return item;
}
