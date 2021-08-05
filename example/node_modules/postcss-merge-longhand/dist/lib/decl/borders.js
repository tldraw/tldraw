"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _postcss = require("postcss");

var _stylehacks = require("stylehacks");

var _insertCloned = _interopRequireDefault(require("../insertCloned"));

var _parseTrbl = _interopRequireDefault(require("../parseTrbl"));

var _hasAllProps = _interopRequireDefault(require("../hasAllProps"));

var _getDecls = _interopRequireDefault(require("../getDecls"));

var _getRules = _interopRequireDefault(require("../getRules"));

var _getValue = _interopRequireDefault(require("../getValue"));

var _mergeRules = _interopRequireDefault(require("../mergeRules"));

var _minifyTrbl = _interopRequireDefault(require("../minifyTrbl"));

var _minifyWsc = _interopRequireDefault(require("../minifyWsc"));

var _canMerge = _interopRequireDefault(require("../canMerge"));

var _remove = _interopRequireDefault(require("../remove"));

var _trbl = _interopRequireDefault(require("../trbl"));

var _isCustomProp = _interopRequireDefault(require("../isCustomProp"));

var _canExplode = _interopRequireDefault(require("../canExplode"));

var _getLastNode = _interopRequireDefault(require("../getLastNode"));

var _parseWsc = _interopRequireDefault(require("../parseWsc"));

var _validateWsc = require("../validateWsc");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const wsc = ['width', 'style', 'color'];
const defaults = ['medium', 'none', 'currentcolor'];

function borderProperty(...parts) {
  return `border-${parts.join('-')}`;
}

function mapBorderProperty(value) {
  return borderProperty(value);
}

const directions = _trbl.default.map(mapBorderProperty);

const properties = wsc.map(mapBorderProperty);
const directionalProperties = directions.reduce((prev, curr) => prev.concat(wsc.map(prop => `${curr}-${prop}`)), []);
const precedence = [['border'], directions.concat(properties), directionalProperties];
const allProperties = precedence.reduce((a, b) => a.concat(b));

function getLevel(prop) {
  for (let i = 0; i < precedence.length; i++) {
    if (~precedence[i].indexOf(prop.toLowerCase())) {
      return i;
    }
  }
}

const isValueCustomProp = value => value && !!~value.search(/var\s*\(\s*--/i);

function canMergeValues(values) {
  return !values.some(isValueCustomProp);
}

function getColorValue(decl) {
  if (decl.prop.substr(-5) === 'color') {
    return decl.value;
  }

  return (0, _parseWsc.default)(decl.value)[2] || defaults[2];
}

function diffingProps(values, nextValues) {
  return wsc.reduce((prev, curr, i) => {
    if (values[i] === nextValues[i]) {
      return prev;
    }

    return [...prev, curr];
  }, []);
}

function mergeRedundant({
  values,
  nextValues,
  decl,
  nextDecl,
  index
}) {
  if (!(0, _canMerge.default)([decl, nextDecl])) {
    return;
  }

  if ((0, _stylehacks.detect)(decl) || (0, _stylehacks.detect)(nextDecl)) {
    return;
  }

  const diff = diffingProps(values, nextValues);

  if (diff.length > 1) {
    return;
  }

  const prop = diff.pop();
  const position = wsc.indexOf(prop);
  const prop1 = `${nextDecl.prop}-${prop}`;
  const prop2 = `border-${prop}`;
  let props = (0, _parseTrbl.default)(values[position]);
  props[index] = nextValues[position];
  const borderValue2 = values.filter((e, i) => i !== position).join(' ');
  const propValue2 = (0, _minifyTrbl.default)(props);
  const origLength = ((0, _minifyWsc.default)(decl.value) + nextDecl.prop + nextDecl.value).length;
  const newLength1 = decl.value.length + prop1.length + (0, _minifyWsc.default)(nextValues[position]).length;
  const newLength2 = borderValue2.length + prop2.length + propValue2.length;

  if (newLength1 < newLength2 && newLength1 < origLength) {
    nextDecl.prop = prop1;
    nextDecl.value = nextValues[position];
  }

  if (newLength2 < newLength1 && newLength2 < origLength) {
    decl.value = borderValue2;
    nextDecl.prop = prop2;
    nextDecl.value = propValue2;
  }
}

function isCloseEnough(mapped) {
  return mapped[0] === mapped[1] && mapped[1] === mapped[2] || mapped[1] === mapped[2] && mapped[2] === mapped[3] || mapped[2] === mapped[3] && mapped[3] === mapped[0] || mapped[3] === mapped[0] && mapped[0] === mapped[1];
}

function getDistinctShorthands(mapped) {
  return mapped.reduce((a, b) => {
    a = Array.isArray(a) ? a : [a];

    if (!~a.indexOf(b)) {
      a.push(b);
    }

    return a;
  });
}

function explode(rule) {
  rule.walkDecls(/^border/i, decl => {
    if (!(0, _canExplode.default)(decl, false)) {
      return;
    }

    if ((0, _stylehacks.detect)(decl)) {
      return;
    }

    const prop = decl.prop.toLowerCase(); // border -> border-trbl

    if (prop === 'border') {
      if ((0, _validateWsc.isValidWsc)((0, _parseWsc.default)(decl.value))) {
        directions.forEach(direction => {
          (0, _insertCloned.default)(decl.parent, decl, {
            prop: direction
          });
        });
        return decl.remove();
      }
    } // border-trbl -> border-trbl-wsc


    if (directions.some(direction => prop === direction)) {
      let values = (0, _parseWsc.default)(decl.value);

      if ((0, _validateWsc.isValidWsc)(values)) {
        wsc.forEach((d, i) => {
          (0, _insertCloned.default)(decl.parent, decl, {
            prop: `${prop}-${d}`,
            value: values[i] || defaults[i]
          });
        });
        return decl.remove();
      }
    } // border-wsc -> border-trbl-wsc


    wsc.some(style => {
      if (prop !== borderProperty(style)) {
        return false;
      }

      (0, _parseTrbl.default)(decl.value).forEach((value, i) => {
        (0, _insertCloned.default)(decl.parent, decl, {
          prop: borderProperty(_trbl.default[i], style),
          value
        });
      });
      return decl.remove();
    });
  });
}

function merge(rule) {
  // border-trbl-wsc -> border-trbl
  _trbl.default.forEach(direction => {
    const prop = borderProperty(direction);
    (0, _mergeRules.default)(rule, wsc.map(style => borderProperty(direction, style)), (rules, lastNode) => {
      if ((0, _canMerge.default)(rules, false) && !rules.some(_stylehacks.detect)) {
        (0, _insertCloned.default)(lastNode.parent, lastNode, {
          prop,
          value: rules.map(_getValue.default).join(' ')
        });
        rules.forEach(_remove.default);
        return true;
      }
    });
  }); // border-trbl-wsc -> border-wsc


  wsc.forEach(style => {
    const prop = borderProperty(style);
    (0, _mergeRules.default)(rule, _trbl.default.map(direction => borderProperty(direction, style)), (rules, lastNode) => {
      if ((0, _canMerge.default)(rules) && !rules.some(_stylehacks.detect)) {
        (0, _insertCloned.default)(lastNode.parent, lastNode, {
          prop,
          value: (0, _minifyTrbl.default)(rules.map(_getValue.default).join(' '))
        });
        rules.forEach(_remove.default);
        return true;
      }
    });
  }); // border-trbl -> border-wsc

  (0, _mergeRules.default)(rule, directions, (rules, lastNode) => {
    if (rules.some(_stylehacks.detect)) {
      return;
    }

    const values = rules.map(({
      value
    }) => value);

    if (!canMergeValues(values)) {
      return;
    }

    const parsed = values.map(value => (0, _parseWsc.default)(value));

    if (!parsed.every(_validateWsc.isValidWsc)) {
      return;
    }

    wsc.forEach((d, i) => {
      const value = parsed.map(v => v[i] || defaults[i]);

      if (canMergeValues(value)) {
        (0, _insertCloned.default)(lastNode.parent, lastNode, {
          prop: borderProperty(d),
          value: (0, _minifyTrbl.default)(value)
        });
      } else {
        (0, _insertCloned.default)(lastNode.parent, lastNode);
      }
    });
    rules.forEach(_remove.default);
    return true;
  }); // border-wsc -> border
  // border-wsc -> border + border-color
  // border-wsc -> border + border-dir

  (0, _mergeRules.default)(rule, properties, (rules, lastNode) => {
    if (rules.some(_stylehacks.detect)) {
      return;
    }

    const values = rules.map(node => (0, _parseTrbl.default)(node.value));
    const mapped = [0, 1, 2, 3].map(i => [values[0][i], values[1][i], values[2][i]].join(' '));

    if (!canMergeValues(mapped)) {
      return;
    }

    const [width, style, color] = rules;
    const reduced = getDistinctShorthands(mapped);

    if (isCloseEnough(mapped) && (0, _canMerge.default)(rules, false)) {
      const first = mapped.indexOf(reduced[0]) !== mapped.lastIndexOf(reduced[0]);
      const border = (0, _insertCloned.default)(lastNode.parent, lastNode, {
        prop: 'border',
        value: first ? reduced[0] : reduced[1]
      });

      if (reduced[1]) {
        const value = first ? reduced[1] : reduced[0];
        const prop = borderProperty(_trbl.default[mapped.indexOf(value)]);
        rule.insertAfter(border, Object.assign(lastNode.clone(), {
          prop,
          value
        }));
      }

      rules.forEach(_remove.default);
      return true;
    } else if (reduced.length === 1) {
      rule.insertBefore(color, Object.assign(lastNode.clone(), {
        prop: 'border',
        value: [width, style].map(_getValue.default).join(' ')
      }));
      rules.filter(node => node.prop.toLowerCase() !== properties[2]).forEach(_remove.default);
      return true;
    }
  }); // border-wsc -> border + border-trbl

  (0, _mergeRules.default)(rule, properties, (rules, lastNode) => {
    if (rules.some(_stylehacks.detect)) {
      return;
    }

    const values = rules.map(node => (0, _parseTrbl.default)(node.value));
    const mapped = [0, 1, 2, 3].map(i => [values[0][i], values[1][i], values[2][i]].join(' '));
    const reduced = getDistinctShorthands(mapped);
    const none = 'medium none currentcolor';

    if (reduced.length > 1 && reduced.length < 4 && reduced.includes(none)) {
      const filtered = mapped.filter(p => p !== none);
      const mostCommon = reduced.sort((a, b) => mapped.filter(v => v === b).length - mapped.filter(v => v === a).length)[0];
      const borderValue = reduced.length === 2 ? filtered[0] : mostCommon;
      rule.insertBefore(lastNode, Object.assign(lastNode.clone(), {
        prop: 'border',
        value: borderValue
      }));
      directions.forEach((dir, i) => {
        if (mapped[i] !== borderValue) {
          rule.insertBefore(lastNode, Object.assign(lastNode.clone(), {
            prop: dir,
            value: mapped[i]
          }));
        }
      });
      rules.forEach(_remove.default);
      return true;
    }
  }); // border-trbl -> border
  // border-trbl -> border + border-trbl

  (0, _mergeRules.default)(rule, directions, (rules, lastNode) => {
    if (rules.some(_stylehacks.detect)) {
      return;
    }

    const values = rules.map(node => {
      const wscValue = (0, _parseWsc.default)(node.value);

      if (!(0, _validateWsc.isValidWsc)(wscValue)) {
        return node.value;
      }

      return wscValue.map((value, i) => value || defaults[i]).join(' ');
    });
    const reduced = getDistinctShorthands(values);

    if (isCloseEnough(values)) {
      const first = values.indexOf(reduced[0]) !== values.lastIndexOf(reduced[0]);
      rule.insertBefore(lastNode, Object.assign(lastNode.clone(), {
        prop: 'border',
        value: (0, _minifyWsc.default)(first ? values[0] : values[1])
      }));

      if (reduced[1]) {
        const value = first ? reduced[1] : reduced[0];
        const prop = directions[values.indexOf(value)];
        rule.insertBefore(lastNode, Object.assign(lastNode.clone(), {
          prop: prop,
          value: (0, _minifyWsc.default)(value)
        }));
      }

      rules.forEach(_remove.default);
      return true;
    }
  }); // border-trbl-wsc + border-trbl (custom prop) -> border-trbl + border-trbl-wsc (custom prop)

  directions.forEach(direction => {
    wsc.forEach((style, i) => {
      const prop = `${direction}-${style}`;
      (0, _mergeRules.default)(rule, [direction, prop], (rules, lastNode) => {
        if (lastNode.prop !== direction) {
          return;
        }

        const values = (0, _parseWsc.default)(lastNode.value);

        if (!(0, _validateWsc.isValidWsc)(values)) {
          return;
        }

        const wscProp = rules.filter(r => r !== lastNode)[0];

        if (!isValueCustomProp(values[i]) || (0, _isCustomProp.default)(wscProp)) {
          return;
        }

        const wscValue = values[i];
        values[i] = wscProp.value;

        if ((0, _canMerge.default)(rules, false) && !rules.some(_stylehacks.detect)) {
          (0, _insertCloned.default)(lastNode.parent, lastNode, {
            prop,
            value: wscValue
          });
          lastNode.value = (0, _minifyWsc.default)(values);
          wscProp.remove();
          return true;
        }
      });
    });
  }); // border-wsc + border (custom prop) -> border + border-wsc (custom prop)

  wsc.forEach((style, i) => {
    const prop = borderProperty(style);
    (0, _mergeRules.default)(rule, ['border', prop], (rules, lastNode) => {
      if (lastNode.prop !== 'border') {
        return;
      }

      const values = (0, _parseWsc.default)(lastNode.value);

      if (!(0, _validateWsc.isValidWsc)(values)) {
        return;
      }

      const wscProp = rules.filter(r => r !== lastNode)[0];

      if (!isValueCustomProp(values[i]) || (0, _isCustomProp.default)(wscProp)) {
        return;
      }

      const wscValue = values[i];
      values[i] = wscProp.value;

      if ((0, _canMerge.default)(rules, false) && !rules.some(_stylehacks.detect)) {
        (0, _insertCloned.default)(lastNode.parent, lastNode, {
          prop,
          value: wscValue
        });
        lastNode.value = (0, _minifyWsc.default)(values);
        wscProp.remove();
        return true;
      }
    });
  }); // optimize border-trbl

  let decls = (0, _getDecls.default)(rule, directions);

  while (decls.length) {
    const lastNode = decls[decls.length - 1];
    wsc.forEach((d, i) => {
      const names = directions.filter(name => name !== lastNode.prop).map(name => `${name}-${d}`);
      let nodes = rule.nodes.slice(0, rule.nodes.indexOf(lastNode));
      const border = (0, _getLastNode.default)(nodes, 'border');

      if (border) {
        nodes = nodes.slice(nodes.indexOf(border));
      }

      const props = nodes.filter(node => node.prop && ~names.indexOf(node.prop) && node.important === lastNode.important);
      const rules = (0, _getRules.default)(props, names);

      if ((0, _hasAllProps.default)(rules, ...names) && !rules.some(_stylehacks.detect)) {
        const values = rules.map(node => node ? node.value : null);
        const filteredValues = values.filter(Boolean);

        const lastNodeValue = _postcss.list.space(lastNode.value)[i];

        values[directions.indexOf(lastNode.prop)] = lastNodeValue;
        let value = (0, _minifyTrbl.default)(values.join(' '));

        if (filteredValues[0] === filteredValues[1] && filteredValues[1] === filteredValues[2]) {
          value = filteredValues[0];
        }

        let refNode = props[props.length - 1];

        if (value === lastNodeValue) {
          refNode = lastNode;

          let valueArray = _postcss.list.space(lastNode.value);

          valueArray.splice(i, 1);
          lastNode.value = valueArray.join(' ');
        }

        (0, _insertCloned.default)(refNode.parent, refNode, {
          prop: borderProperty(d),
          value
        });
        decls = decls.filter(node => !~rules.indexOf(node));
        rules.forEach(_remove.default);
      }
    });
    decls = decls.filter(node => node !== lastNode);
  }

  rule.walkDecls('border', decl => {
    const nextDecl = decl.next();

    if (!nextDecl || nextDecl.type !== 'decl') {
      return;
    }

    const index = directions.indexOf(nextDecl.prop);

    if (!~index) {
      return;
    }

    const values = (0, _parseWsc.default)(decl.value);
    const nextValues = (0, _parseWsc.default)(nextDecl.value);

    if (!(0, _validateWsc.isValidWsc)(values) || !(0, _validateWsc.isValidWsc)(nextValues)) {
      return;
    }

    const config = {
      values,
      nextValues,
      decl,
      nextDecl,
      index
    };
    return mergeRedundant(config);
  });
  rule.walkDecls(/^border($|-(top|right|bottom|left)$)/i, decl => {
    let values = (0, _parseWsc.default)(decl.value);

    if (!(0, _validateWsc.isValidWsc)(values)) {
      return;
    }

    const position = directions.indexOf(decl.prop);
    let dirs = [...directions];
    dirs.splice(position, 1);
    wsc.forEach((d, i) => {
      const props = dirs.map(dir => `${dir}-${d}`);
      (0, _mergeRules.default)(rule, [decl.prop, ...props], rules => {
        if (!rules.includes(decl)) {
          return;
        }

        const longhands = rules.filter(p => p !== decl);

        if (longhands[0].value.toLowerCase() === longhands[1].value.toLowerCase() && longhands[1].value.toLowerCase() === longhands[2].value.toLowerCase() && values[i] !== undefined && longhands[0].value.toLowerCase() === values[i].toLowerCase()) {
          longhands.forEach(_remove.default);
          (0, _insertCloned.default)(decl.parent, decl, {
            prop: borderProperty(d),
            value: values[i]
          });
          values[i] = null;
        }
      });
      const newValue = values.join(' ');

      if (newValue) {
        decl.value = newValue;
      } else {
        decl.remove();
      }
    });
  }); // clean-up values

  rule.walkDecls(/^border($|-(top|right|bottom|left)$)/i, decl => {
    decl.value = (0, _minifyWsc.default)(decl.value);
  }); // border-spacing-hv -> border-spacing

  rule.walkDecls(/^border-spacing$/i, decl => {
    const value = _postcss.list.space(decl.value); // merge vertical and horizontal dups


    if (value.length > 1 && value[0] === value[1]) {
      decl.value = value.slice(1).join(' ');
    }
  }); // clean-up rules

  decls = (0, _getDecls.default)(rule, allProperties);

  while (decls.length) {
    const lastNode = decls[decls.length - 1];
    const lastPart = lastNode.prop.split('-').pop(); // remove properties of lower precedence

    const lesser = decls.filter(node => !(0, _stylehacks.detect)(lastNode) && !(0, _stylehacks.detect)(node) && !(0, _isCustomProp.default)(lastNode) && node !== lastNode && node.important === lastNode.important && getLevel(node.prop) > getLevel(lastNode.prop) && (!!~node.prop.toLowerCase().indexOf(lastNode.prop) || node.prop.toLowerCase().endsWith(lastPart)));
    lesser.forEach(_remove.default);
    decls = decls.filter(node => !~lesser.indexOf(node)); // get duplicate properties

    let duplicates = decls.filter(node => !(0, _stylehacks.detect)(lastNode) && !(0, _stylehacks.detect)(node) && node !== lastNode && node.important === lastNode.important && node.prop === lastNode.prop && !(!(0, _isCustomProp.default)(node) && (0, _isCustomProp.default)(lastNode)));

    if (duplicates.length) {
      if (/hsla\(|rgba\(/i.test(getColorValue(lastNode))) {
        const preserve = duplicates.filter(node => !/hsla\(|rgba\(/i.test(getColorValue(node))).pop();
        duplicates = duplicates.filter(node => node !== preserve);
      }

      duplicates.forEach(_remove.default);
    }

    decls = decls.filter(node => node !== lastNode && !~duplicates.indexOf(node));
  }
}

var _default = {
  explode,
  merge
};
exports.default = _default;
module.exports = exports.default;