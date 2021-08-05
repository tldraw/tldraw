'use strict';

const SAX = require('@trysound/sax');
const JSAPI = require('./jsAPI.js');
const { textElems } = require('../../plugins/_collections.js');

const entityDeclaration = /<!ENTITY\s+(\S+)\s+(?:'([^']+)'|"([^"]+)")\s*>/g;

const config = {
  strict: true,
  trim: false,
  normalize: false,
  lowercase: true,
  xmlns: true,
  position: true,
};

/**
 * Convert SVG (XML) string to SVG-as-JS object.
 *
 * @param {String} data input data
 */
module.exports = function (data) {
  const sax = SAX.parser(config.strict, config);
  const root = new JSAPI({ type: 'root', children: [] });
  let current = root;
  let stack = [root];

  function pushToContent(node) {
    const wrapped = new JSAPI(node, current);
    current.children.push(wrapped);
    return wrapped;
  }

  sax.ondoctype = function (doctype) {
    pushToContent({
      type: 'doctype',
      // TODO parse doctype for name, public and system to match xast
      name: 'svg',
      data: {
        doctype,
      },
    });

    const subsetStart = doctype.indexOf('[');
    let entityMatch;

    if (subsetStart >= 0) {
      entityDeclaration.lastIndex = subsetStart;

      while ((entityMatch = entityDeclaration.exec(data)) != null) {
        sax.ENTITIES[entityMatch[1]] = entityMatch[2] || entityMatch[3];
      }
    }
  };

  sax.onprocessinginstruction = function (data) {
    pushToContent({
      type: 'instruction',
      name: data.name,
      value: data.body,
    });
  };

  sax.oncomment = function (comment) {
    pushToContent({
      type: 'comment',
      value: comment.trim(),
    });
  };

  sax.oncdata = function (cdata) {
    pushToContent({
      type: 'cdata',
      value: cdata,
    });
  };

  sax.onopentag = function (data) {
    var element = {
      type: 'element',
      name: data.name,
      attributes: {},
      children: [],
    };

    for (const [name, attr] of Object.entries(data.attributes)) {
      element.attributes[name] = attr.value;
    }

    element = pushToContent(element);
    current = element;

    stack.push(element);
  };

  sax.ontext = function (text) {
    // prevent trimming of meaningful whitespace inside textual tags
    if (textElems.includes(current.name) && !data.prefix) {
      pushToContent({
        type: 'text',
        value: text,
      });
    } else if (/\S/.test(text)) {
      pushToContent({
        type: 'text',
        value: text.trim(),
      });
    }
  };

  sax.onclosetag = function () {
    stack.pop();
    current = stack[stack.length - 1];
  };

  sax.onerror = function (e) {
    e.message = 'Error in parsing SVG: ' + e.message;
    if (e.message.indexOf('Unexpected end') < 0) {
      throw e;
    }
  };

  try {
    sax.write(data).close();
    return root;
  } catch (e) {
    return { error: e.message };
  }
};
