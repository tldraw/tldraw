'use strict';

const { parseName } = require('../lib/svgo/tools.js');
const { editorNamespaces } = require('./_collections');

exports.type = 'perItem';

exports.active = true;

exports.description = 'removes editors namespaces, elements and attributes';

const prefixes = [];

exports.params = {
  additionalNamespaces: [],
};

/**
 * Remove editors namespaces, elements and attributes.
 *
 * @example
 * <svg xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd">
 * <sodipodi:namedview/>
 * <path sodipodi:nodetypes="cccc"/>
 *
 * @param {Object} item current iteration item
 * @param {Object} params plugin params
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (item, params) {
  let namespaces = editorNamespaces;
  if (Array.isArray(params.additionalNamespaces)) {
    namespaces = [...editorNamespaces, ...params.additionalNamespaces];
  }

  if (item.type === 'element') {
    if (item.isElem('svg')) {
      for (const [name, value] of Object.entries(item.attributes)) {
        const { prefix, local } = parseName(name);
        if (prefix === 'xmlns' && namespaces.includes(value)) {
          prefixes.push(local);

          // <svg xmlns:sodipodi="">
          delete item.attributes[name];
        }
      }
    }

    // <* sodipodi:*="">
    for (const name of Object.keys(item.attributes)) {
      const { prefix } = parseName(name);
      if (prefixes.includes(prefix)) {
        delete item.attributes[name];
      }
    }

    // <sodipodi:*>
    const { prefix } = parseName(item.name);
    if (prefixes.includes(prefix)) {
      return false;
    }
  }
};
