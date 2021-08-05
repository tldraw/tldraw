'use strict';

exports.type = 'perItem';

exports.active = false;

exports.params = {
  delim: '__',
  prefixIds: true,
  prefixClassNames: true,
};

exports.description = 'prefix IDs';

var csstree = require('css-tree'),
  collections = require('./_collections.js'),
  referencesProps = collections.referencesProps,
  rxId = /^#(.*)$/, // regular expression for matching an ID + extracing its name
  addPrefix = null;

const unquote = (string) => {
  const first = string.charAt(0);
  if (first === "'" || first === '"') {
    if (first === string.charAt(string.length - 1)) {
      return string.slice(1, -1);
    }
  }
  return string;
};

// Escapes a string for being used as ID
var escapeIdentifierName = function (str) {
  return str.replace(/[. ]/g, '_');
};

// Matches an #ID value, captures the ID name
var matchId = function (urlVal) {
  var idUrlMatches = urlVal.match(rxId);
  if (idUrlMatches === null) {
    return false;
  }
  return idUrlMatches[1];
};

// Matches an url(...) value, captures the URL
var matchUrl = function (val) {
  var urlMatches = /url\((.*?)\)/gi.exec(val);
  if (urlMatches === null) {
    return false;
  }
  return urlMatches[1];
};

// prefixes an #ID
var prefixId = function (val) {
  var idName = matchId(val);
  if (!idName) {
    return false;
  }
  return '#' + addPrefix(idName);
};

// prefixes a class attribute value
const addPrefixToClassAttr = (element, name) => {
  if (
    element.attributes[name] == null ||
    element.attributes[name].length === 0
  ) {
    return;
  }

  element.attributes[name] = element.attributes[name]
    .split(/\s+/)
    .map(addPrefix)
    .join(' ');
};

// prefixes an ID attribute value
const addPrefixToIdAttr = (element, name) => {
  if (
    element.attributes[name] == null ||
    element.attributes[name].length === 0
  ) {
    return;
  }

  element.attributes[name] = addPrefix(element.attributes[name]);
};

// prefixes a href attribute value
const addPrefixToHrefAttr = (element, name) => {
  if (
    element.attributes[name] == null ||
    element.attributes[name].length === 0
  ) {
    return;
  }

  const idPrefixed = prefixId(element.attributes[name]);
  if (!idPrefixed) {
    return;
  }
  element.attributes[name] = idPrefixed;
};

// prefixes an URL attribute value
const addPrefixToUrlAttr = (element, name) => {
  if (
    element.attributes[name] == null ||
    element.attributes[name].length === 0
  ) {
    return;
  }

  // url(...) in value
  const urlVal = matchUrl(element.attributes[name]);
  if (!urlVal) {
    return;
  }

  const idPrefixed = prefixId(urlVal);
  if (!idPrefixed) {
    return;
  }

  element.attributes[name] = 'url(' + idPrefixed + ')';
};

// prefixes begin/end attribute value
const addPrefixToBeginEndAttr = (element, name) => {
  if (
    element.attributes[name] == null ||
    element.attributes[name].length === 0
  ) {
    return;
  }

  const parts = element.attributes[name].split('; ').map((val) => {
    val = val.trim();

    if (val.endsWith('.end') || val.endsWith('.start')) {
      const [id, postfix] = val.split('.');

      let idPrefixed = prefixId(`#${id}`);

      if (!idPrefixed) {
        return val;
      }

      idPrefixed = idPrefixed.slice(1);
      return `${idPrefixed}.${postfix}`;
    } else {
      return val;
    }
  });

  element.attributes[name] = parts.join('; ');
};

const getBasename = (path) => {
  // extract everything after latest slash or backslash
  const matched = path.match(/[/\\]([^/\\]+)$/);
  if (matched) {
    return matched[1];
  }
  return '';
};

/**
 * Prefixes identifiers
 *
 * @param {Object} node node
 * @param {Object} opts plugin params
 * @param {Object} extra plugin extra information
 *
 * @author strarsis <strarsis@gmail.com>
 */
exports.fn = function (node, opts, extra) {
  // skip subsequent passes when multipass is used
  if (extra.multipassCount && extra.multipassCount > 0) {
    return;
  }

  // prefix, from file name or option
  var prefix = 'prefix';
  if (opts.prefix) {
    if (typeof opts.prefix === 'function') {
      prefix = opts.prefix(node, extra);
    } else {
      prefix = opts.prefix;
    }
  } else if (opts.prefix === false) {
    prefix = false;
  } else if (extra && extra.path && extra.path.length > 0) {
    var filename = getBasename(extra.path);
    prefix = filename;
  }

  // prefixes a normal value
  addPrefix = function (name) {
    if (prefix === false) {
      return escapeIdentifierName(name);
    }
    return escapeIdentifierName(prefix + opts.delim + name);
  };

  // <style/> property values

  if (node.type === 'element' && node.name === 'style') {
    if (node.children.length === 0) {
      // skip empty <style/>s
      return;
    }

    var cssStr = '';
    if (node.children[0].type === 'text' || node.children[0].type === 'cdata') {
      cssStr = node.children[0].value;
    }

    var cssAst = {};
    try {
      cssAst = csstree.parse(cssStr, {
        parseValue: true,
        parseCustomProperty: false,
      });
    } catch (parseError) {
      console.warn(
        'Warning: Parse error of styles of <style/> element, skipped. Error details: ' +
          parseError
      );
      return;
    }

    var idPrefixed = '';
    csstree.walk(cssAst, function (node) {
      // #ID, .class
      if (
        ((opts.prefixIds && node.type === 'IdSelector') ||
          (opts.prefixClassNames && node.type === 'ClassSelector')) &&
        node.name
      ) {
        node.name = addPrefix(node.name);
        return;
      }

      // url(...) in value
      if (
        node.type === 'Url' &&
        node.value.value &&
        node.value.value.length > 0
      ) {
        idPrefixed = prefixId(unquote(node.value.value));
        if (!idPrefixed) {
          return;
        }
        node.value.value = idPrefixed;
      }
    });

    // update <style>s
    node.children[0].value = csstree.generate(cssAst);
    return;
  }

  // element attributes

  if (node.type !== 'element') {
    return;
  }

  // Nodes

  if (opts.prefixIds) {
    // ID
    addPrefixToIdAttr(node, 'id');
  }

  if (opts.prefixClassNames) {
    // Class
    addPrefixToClassAttr(node, 'class');
  }

  // References

  // href
  addPrefixToHrefAttr(node, 'href');

  // (xlink:)href (deprecated, must be still supported)
  addPrefixToHrefAttr(node, 'xlink:href');

  // (referenceable) properties
  for (var referencesProp of referencesProps) {
    addPrefixToUrlAttr(node, referencesProp);
  }

  addPrefixToBeginEndAttr(node, 'begin');
  addPrefixToBeginEndAttr(node, 'end');
};
