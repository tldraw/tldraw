'use strict'

var chalk = require('chalk')
var lowlight = require('lowlight/lib/core.js')

var high = lowlight.highlight
var auto = lowlight.highlightAuto

// Inherit.
function Lowlight() {}

Lowlight.prototype = lowlight

var emphasize = new Lowlight()

// Expose.
module.exports = emphasize

emphasize.highlight = highlight
emphasize.highlightAuto = highlightAuto

// Default style sheet.
var defaultSheet = {
  comment: chalk.gray,
  quote: chalk.gray,

  keyword: chalk.green,
  'selector-tag': chalk.green,
  addition: chalk.green,

  number: chalk.cyan,
  string: chalk.cyan,
  'meta meta-string': chalk.cyan,
  literal: chalk.cyan,
  doctag: chalk.cyan,
  regexp: chalk.cyan,

  title: chalk.blue,
  section: chalk.blue,
  name: chalk.blue,
  'selector-id': chalk.blue,
  'selector-class': chalk.blue,

  attribute: chalk.yellow,
  attr: chalk.yellow,
  variable: chalk.yellow,
  'template-variable': chalk.yellow,
  'class title': chalk.yellow,
  type: chalk.yellow,

  symbol: chalk.magenta,
  bullet: chalk.magenta,
  subst: chalk.magenta,
  meta: chalk.magenta,
  'meta keyword': chalk.magenta,
  'selector-attr': chalk.magenta,
  'selector-pseudo': chalk.magenta,
  link: chalk.magenta,

  /* eslint-disable camelcase */
  built_in: chalk.red,
  /* eslint-enable camelcase */
  deletion: chalk.red,

  emphasis: chalk.italic,
  strong: chalk.bold,
  formula: chalk.inverse
}

// Highlight `value` as `language`.
function highlight(language, value, sheet) {
  var result = high.call(this, language, value)
  result.value = all(sheet || defaultSheet, result.value)
  return result
}

// Highlight `value` and guess its syntax.
function highlightAuto(value, options) {
  var result
  var sheet
  var config

  if (options) {
    if (options.subset) {
      sheet = options.sheet
      config = {subset: options.subset}
    } else {
      sheet = options
    }
  }

  if (!sheet) {
    sheet = defaultSheet
  }

  result = auto.call(this, value, config)

  result.value = all(sheet, result.value)

  if (result.secondBest) {
    result.secondBest.value = all(sheet, result.secondBest.value)
  }

  return result
}

// Visit one `node`.
function visit(sheet, node) {
  var name = (node.properties || {}).className
  var scoped = {}
  var key
  var parts
  var color
  var style
  var content

  // Always just one class.
  name = name ? name[0].replace(/hljs-/, '') : ''

  for (key in sheet) {
    parts = key.split(' ')
    color = sheet[key]

    if (parts[0] === name) {
      if (parts.length === 1) {
        style = color
      } else {
        scoped[parts.slice(1).join(' ')] = color
      }
    } else {
      scoped[key] = color
    }
  }

  content = ''

  if ('value' in node) {
    content = node.value
  }

  if ('children' in node) {
    content = all(scoped, node.children)
  }

  if (style) {
    content = style(content)
  }

  return content
}

// Visit children in `node`.
function all(sheet, nodes) {
  var result = []
  var length = nodes.length
  var index = -1

  while (++index < length) {
    result.push(visit(sheet, nodes[index]))
  }

  return result.join('')
}
