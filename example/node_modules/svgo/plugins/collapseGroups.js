'use strict';

const { inheritableAttrs, elemsGroups } = require('./_collections');

exports.type = 'perItemReverse';

exports.active = true;

exports.description = 'collapses useless groups';

function hasAnimatedAttr(item, name) {
  if (item.type === 'element') {
    return (
      (elemsGroups.animation.includes(item.name) &&
        item.attributes.attributeName === name) ||
      (item.children.length !== 0 &&
        item.children.some((child) => hasAnimatedAttr(child, name)))
    );
  }
  return false;
}

/*
 * Collapse useless groups.
 *
 * @example
 * <g>
 *     <g attr1="val1">
 *         <path d="..."/>
 *     </g>
 * </g>
 *         ⬇
 * <g>
 *     <g>
 *         <path attr1="val1" d="..."/>
 *     </g>
 * </g>
 *         ⬇
 * <path attr1="val1" d="..."/>
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (item) {
  // non-empty elements
  if (
    item.type === 'element' &&
    item.name !== 'switch' &&
    item.children.length !== 0
  ) {
    item.children.forEach(function (g, i) {
      // non-empty groups
      if (g.type === 'element' && g.name === 'g' && g.children.length !== 0) {
        // move group attibutes to the single child element
        if (Object.keys(g.attributes).length !== 0 && g.children.length === 1) {
          var inner = g.children[0];

          if (
            inner.type === 'element' &&
            inner.attributes.id == null &&
            g.attributes.filter == null &&
            (g.attributes.class == null || inner.attributes.class == null) &&
            ((g.attributes['clip-path'] == null && g.attributes.mask == null) ||
              (inner.type === 'element' &&
                inner.name === 'g' &&
                g.attributes.transform == null &&
                inner.attributes.transform == null))
          ) {
            for (const [name, value] of Object.entries(g.attributes)) {
              if (g.children.some((item) => hasAnimatedAttr(item, name)))
                return;

              if (inner.attributes[name] == null) {
                inner.attributes[name] = value;
              } else if (name == 'transform') {
                inner.attributes[name] = value + ' ' + inner.attributes[name];
              } else if (inner.attributes[name] === 'inherit') {
                inner.attributes[name] = value;
              } else if (
                inheritableAttrs.includes(name) === false &&
                inner.attributes[name] !== value
              ) {
                return;
              }

              delete g.attributes[name];
            }
          }
        }

        // collapse groups without attributes
        if (
          Object.keys(g.attributes).length === 0 &&
          !g.children.some((item) => item.isElem(elemsGroups.animation))
        ) {
          item.spliceContent(i, 1, g.children);
        }
      }
    });
  }
};
