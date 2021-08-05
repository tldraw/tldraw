'use strict';

var EOL = require('os').EOL,
  textElems = require('../../plugins/_collections.js').textElems;

var defaults = {
  doctypeStart: '<!DOCTYPE',
  doctypeEnd: '>',
  procInstStart: '<?',
  procInstEnd: '?>',
  tagOpenStart: '<',
  tagOpenEnd: '>',
  tagCloseStart: '</',
  tagCloseEnd: '>',
  tagShortStart: '<',
  tagShortEnd: '/>',
  attrStart: '="',
  attrEnd: '"',
  commentStart: '<!--',
  commentEnd: '-->',
  cdataStart: '<![CDATA[',
  cdataEnd: ']]>',
  textStart: '',
  textEnd: '',
  indent: 4,
  regEntities: /[&'"<>]/g,
  regValEntities: /[&"<>]/g,
  encodeEntity: encodeEntity,
  pretty: false,
  useShortTags: true,
};

var entities = {
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
  '>': '&gt;',
  '<': '&lt;',
};

/**
 * Convert SVG-as-JS object to SVG (XML) string.
 *
 * @param {Object} data input data
 * @param {Object} config config
 *
 * @return {Object} output data
 */
module.exports = function (data, config) {
  return new JS2SVG(config).convert(data);
};

function JS2SVG(config) {
  if (config) {
    this.config = Object.assign({}, defaults, config);
  } else {
    this.config = Object.assign({}, defaults);
  }

  var indent = this.config.indent;
  if (typeof indent == 'number' && !isNaN(indent)) {
    this.config.indent = indent < 0 ? '\t' : ' '.repeat(indent);
  } else if (typeof indent != 'string') {
    this.config.indent = '    ';
  }

  if (this.config.pretty) {
    this.config.doctypeEnd += EOL;
    this.config.procInstEnd += EOL;
    this.config.commentEnd += EOL;
    this.config.cdataEnd += EOL;
    this.config.tagShortEnd += EOL;
    this.config.tagOpenEnd += EOL;
    this.config.tagCloseEnd += EOL;
    this.config.textEnd += EOL;
  }

  this.indentLevel = 0;
  this.textContext = null;
}

function encodeEntity(char) {
  return entities[char];
}

/**
 * Start conversion.
 *
 * @param {Object} data input data
 *
 * @return {String}
 */
JS2SVG.prototype.convert = function (data) {
  var svg = '';

  this.indentLevel++;

  for (const item of data.children) {
    if (item.type === 'element') {
      svg += this.createElem(item);
    }
    if (item.type === 'text') {
      svg += this.createText(item);
    }
    if (item.type === 'doctype') {
      svg += this.createDoctype(item);
    }
    if (item.type === 'instruction') {
      svg += this.createProcInst(item);
    }
    if (item.type === 'comment') {
      svg += this.createComment(item);
    }
    if (item.type === 'cdata') {
      svg += this.createCDATA(item);
    }
  }

  this.indentLevel--;

  return {
    data: svg,
    info: {
      width: this.width,
      height: this.height,
    },
  };
};

/**
 * Create indent string in accordance with the current node level.
 *
 * @return {String}
 */
JS2SVG.prototype.createIndent = function () {
  var indent = '';

  if (this.config.pretty && !this.textContext) {
    indent = this.config.indent.repeat(this.indentLevel - 1);
  }

  return indent;
};

/**
 * Create doctype tag.
 *
 * @param {String} doctype doctype body string
 *
 * @return {String}
 */
JS2SVG.prototype.createDoctype = function (node) {
  const { doctype } = node.data;
  return this.config.doctypeStart + doctype + this.config.doctypeEnd;
};

/**
 * Create XML Processing Instruction tag.
 *
 * @param {Object} instruction instruction object
 *
 * @return {String}
 */
JS2SVG.prototype.createProcInst = function (node) {
  const { name, value } = node;
  return (
    this.config.procInstStart + name + ' ' + value + this.config.procInstEnd
  );
};

/**
 * Create comment tag.
 *
 * @param {String} comment comment body
 *
 * @return {String}
 */
JS2SVG.prototype.createComment = function (node) {
  const { value } = node;
  return this.config.commentStart + value + this.config.commentEnd;
};

/**
 * Create CDATA section.
 *
 * @param {String} cdata CDATA body
 *
 * @return {String}
 */
JS2SVG.prototype.createCDATA = function (node) {
  const { value } = node;
  return (
    this.createIndent() + this.config.cdataStart + value + this.config.cdataEnd
  );
};

/**
 * Create element tag.
 *
 * @param {Object} data element object
 *
 * @return {String}
 */
JS2SVG.prototype.createElem = function (data) {
  // beautiful injection for obtaining SVG information :)
  if (
    data.name === 'svg' &&
    data.attributes.width != null &&
    data.attributes.height != null
  ) {
    this.width = data.attributes.width;
    this.height = data.attributes.height;
  }

  // empty element and short tag
  if (data.children.length === 0) {
    if (this.config.useShortTags) {
      return (
        this.createIndent() +
        this.config.tagShortStart +
        data.name +
        this.createAttrs(data) +
        this.config.tagShortEnd
      );
    } else {
      return (
        this.createIndent() +
        this.config.tagShortStart +
        data.name +
        this.createAttrs(data) +
        this.config.tagOpenEnd +
        this.config.tagCloseStart +
        data.name +
        this.config.tagCloseEnd
      );
    }
    // non-empty element
  } else {
    var tagOpenStart = this.config.tagOpenStart,
      tagOpenEnd = this.config.tagOpenEnd,
      tagCloseStart = this.config.tagCloseStart,
      tagCloseEnd = this.config.tagCloseEnd,
      openIndent = this.createIndent(),
      closeIndent = this.createIndent(),
      processedData = '',
      dataEnd = '';

    if (this.textContext) {
      tagOpenStart = defaults.tagOpenStart;
      tagOpenEnd = defaults.tagOpenEnd;
      tagCloseStart = defaults.tagCloseStart;
      tagCloseEnd = defaults.tagCloseEnd;
      openIndent = '';
    } else if (data.isElem(textElems)) {
      tagOpenEnd = defaults.tagOpenEnd;
      tagCloseStart = defaults.tagCloseStart;
      closeIndent = '';
      this.textContext = data;
    }

    processedData += this.convert(data).data;

    if (this.textContext == data) {
      this.textContext = null;
    }

    return (
      openIndent +
      tagOpenStart +
      data.name +
      this.createAttrs(data) +
      tagOpenEnd +
      processedData +
      dataEnd +
      closeIndent +
      tagCloseStart +
      data.name +
      tagCloseEnd
    );
  }
};

/**
 * Create element attributes.
 *
 * @param {Object} elem attributes object
 *
 * @return {String}
 */
JS2SVG.prototype.createAttrs = function (element) {
  let attrs = '';
  for (const [name, value] of Object.entries(element.attributes)) {
    if (value !== undefined) {
      const encodedValue = value
        .toString()
        .replace(this.config.regValEntities, this.config.encodeEntity);
      attrs +=
        ' ' + name + this.config.attrStart + encodedValue + this.config.attrEnd;
    } else {
      attrs += ' ' + name;
    }
  }
  return attrs;
};

/**
 * Create text node.
 *
 * @param {String} text text
 *
 * @return {String}
 */
JS2SVG.prototype.createText = function (node) {
  const { value } = node;
  return (
    this.createIndent() +
    this.config.textStart +
    value.replace(this.config.regEntities, this.config.encodeEntity) +
    (this.textContext ? '' : this.config.textEnd)
  );
};
