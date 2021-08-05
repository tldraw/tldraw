'use strict'

var high = require('highlight.js/lib/core')
var fault = require('fault')

exports.highlight = highlight
exports.highlightAuto = highlightAuto
exports.registerLanguage = registerLanguage
exports.listLanguages = listLanguages
exports.registerAlias = registerAlias

Emitter.prototype.addText = text
Emitter.prototype.addKeyword = addKeyword
Emitter.prototype.addSublanguage = addSublanguage
Emitter.prototype.openNode = open
Emitter.prototype.closeNode = close
Emitter.prototype.closeAllNodes = noop
Emitter.prototype.finalize = noop
Emitter.prototype.toHTML = toHtmlNoop

var defaultPrefix = 'hljs-'

// Highlighting `value` in the language `name`.
function highlight(name, value, options) {
  var before = high.configure({})
  var settings = options || {}
  var prefix = settings.prefix
  var result

  if (typeof name !== 'string') {
    throw fault('Expected `string` for name, got `%s`', name)
  }

  if (!high.getLanguage(name)) {
    throw fault('Unknown language: `%s` is not registered', name)
  }

  if (typeof value !== 'string') {
    throw fault('Expected `string` for value, got `%s`', value)
  }

  if (prefix === null || prefix === undefined) {
    prefix = defaultPrefix
  }

  high.configure({__emitter: Emitter, classPrefix: prefix})

  result = high.highlight(name, value, true)

  high.configure(before || {})

  /* istanbul ignore if - Highlight.js seems to use this (currently) for broken
   * grammars, so let’s keep it in there just to be sure. */
  if (result.errorRaised) {
    throw result.errorRaised
  }

  return {
    relevance: result.relevance,
    language: result.language,
    value: result.emitter.rootNode.children
  }
}

function highlightAuto(value, options) {
  var settings = options || {}
  var subset = settings.subset || high.listLanguages()
  var prefix = settings.prefix
  var length = subset.length
  var index = -1
  var result
  var secondBest
  var current
  var name

  if (prefix === null || prefix === undefined) {
    prefix = defaultPrefix
  }

  if (typeof value !== 'string') {
    throw fault('Expected `string` for value, got `%s`', value)
  }

  secondBest = {relevance: 0, language: null, value: []}
  result = {relevance: 0, language: null, value: []}

  while (++index < length) {
    name = subset[index]

    if (!high.getLanguage(name)) {
      continue
    }

    current = highlight(name, value, options)
    current.language = name

    if (current.relevance > secondBest.relevance) {
      secondBest = current
    }

    if (current.relevance > result.relevance) {
      secondBest = result
      result = current
    }
  }

  if (secondBest.language) {
    result.secondBest = secondBest
  }

  return result
}

// Register a language.
function registerLanguage(name, syntax) {
  high.registerLanguage(name, syntax)
}

// Get a list of all registered languages.
function listLanguages() {
  return high.listLanguages()
}

// Register more aliases for an already registered language.
function registerAlias(name, alias) {
  var map = name
  var key

  if (alias) {
    map = {}
    map[name] = alias
  }

  for (key in map) {
    high.registerAliases(map[key], {languageName: key})
  }
}

function Emitter(options) {
  this.options = options
  this.rootNode = {children: []}
  this.stack = [this.rootNode]
}

function addKeyword(value, name) {
  this.openNode(name)
  this.addText(value)
  this.closeNode()
}

function addSublanguage(other, name) {
  var stack = this.stack
  var current = stack[stack.length - 1]
  var results = other.rootNode.children
  var node = name
    ? {
        type: 'element',
        tagName: 'span',
        properties: {className: [name]},
        children: results
      }
    : results

  current.children = current.children.concat(node)
}

function text(value) {
  var stack = this.stack
  var current
  var tail

  if (value === '') return

  current = stack[stack.length - 1]
  tail = current.children[current.children.length - 1]

  if (tail && tail.type === 'text') {
    tail.value += value
  } else {
    current.children.push({type: 'text', value: value})
  }
}

function open(name) {
  var stack = this.stack
  var className = this.options.classPrefix + name
  var current = stack[stack.length - 1]
  var child = {
    type: 'element',
    tagName: 'span',
    properties: {className: [className]},
    children: []
  }

  current.children.push(child)
  stack.push(child)
}

function close() {
  this.stack.pop()
}

function toHtmlNoop() {
  return ''
}

function noop() {}
