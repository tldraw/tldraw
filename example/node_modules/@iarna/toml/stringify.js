'use strict'
module.exports = stringify
module.exports.value = stringifyInline

function stringify (obj) {
  if (obj === null) throw typeError('null')
  if (obj === void (0)) throw typeError('undefined')
  if (typeof obj !== 'object') throw typeError(typeof obj)

  if (typeof obj.toJSON === 'function') obj = obj.toJSON()
  if (obj == null) return null
  const type = tomlType(obj)
  if (type !== 'table') throw typeError(type)
  return stringifyObject('', '', obj)
}

function typeError (type) {
  return new Error('Can only stringify objects, not ' + type)
}

function arrayOneTypeError () {
  return new Error("Array values can't have mixed types")
}

function getInlineKeys (obj) {
  return Object.keys(obj).filter(key => isInline(obj[key]))
}
function getComplexKeys (obj) {
  return Object.keys(obj).filter(key => !isInline(obj[key]))
}

function toJSON (obj) {
  let nobj = Array.isArray(obj) ? [] : Object.prototype.hasOwnProperty.call(obj, '__proto__') ? {['__proto__']: undefined} : {}
  for (let prop of Object.keys(obj)) {
    if (obj[prop] && typeof obj[prop].toJSON === 'function' && !('toISOString' in obj[prop])) {
      nobj[prop] = obj[prop].toJSON()
    } else {
      nobj[prop] = obj[prop]
    }
  }
  return nobj
}

function stringifyObject (prefix, indent, obj) {
  obj = toJSON(obj)
  var inlineKeys
  var complexKeys
  inlineKeys = getInlineKeys(obj)
  complexKeys = getComplexKeys(obj)
  var result = []
  var inlineIndent = indent || ''
  inlineKeys.forEach(key => {
    var type = tomlType(obj[key])
    if (type !== 'undefined' && type !== 'null') {
      result.push(inlineIndent + stringifyKey(key) + ' = ' + stringifyAnyInline(obj[key], true))
    }
  })
  if (result.length > 0) result.push('')
  var complexIndent = prefix && inlineKeys.length > 0 ? indent + '  ' : ''
  complexKeys.forEach(key => {
    result.push(stringifyComplex(prefix, complexIndent, key, obj[key]))
  })
  return result.join('\n')
}

function isInline (value) {
  switch (tomlType(value)) {
    case 'undefined':
    case 'null':
    case 'integer':
    case 'nan':
    case 'float':
    case 'boolean':
    case 'string':
    case 'datetime':
      return true
    case 'array':
      return value.length === 0 || tomlType(value[0]) !== 'table'
    case 'table':
      return Object.keys(value).length === 0
    /* istanbul ignore next */
    default:
      return false
  }
}

function tomlType (value) {
  if (value === undefined) {
    return 'undefined'
  } else if (value === null) {
    return 'null'
  /* eslint-disable valid-typeof */
  } else if (typeof value === 'bigint' || (Number.isInteger(value) && !Object.is(value, -0))) {
    return 'integer'
  } else if (typeof value === 'number') {
    return 'float'
  } else if (typeof value === 'boolean') {
    return 'boolean'
  } else if (typeof value === 'string') {
    return 'string'
  } else if ('toISOString' in value) {
    return isNaN(value) ? 'undefined' : 'datetime'
  } else if (Array.isArray(value)) {
    return 'array'
  } else {
    return 'table'
  }
}

function stringifyKey (key) {
  var keyStr = String(key)
  if (/^[-A-Za-z0-9_]+$/.test(keyStr)) {
    return keyStr
  } else {
    return stringifyBasicString(keyStr)
  }
}

function stringifyBasicString (str) {
  return '"' + escapeString(str).replace(/"/g, '\\"') + '"'
}

function stringifyLiteralString (str) {
  return "'" + str + "'"
}

function numpad (num, str) {
  while (str.length < num) str = '0' + str
  return str
}

function escapeString (str) {
  return str.replace(/\\/g, '\\\\')
    .replace(/[\b]/g, '\\b')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\f/g, '\\f')
    .replace(/\r/g, '\\r')
    /* eslint-disable no-control-regex */
    .replace(/([\u0000-\u001f\u007f])/, c => '\\u' + numpad(4, c.codePointAt(0).toString(16)))
    /* eslint-enable no-control-regex */
}

function stringifyMultilineString (str) {
  let escaped = str.split(/\n/).map(str => {
    return escapeString(str).replace(/"(?="")/g, '\\"')
  }).join('\n')
  if (escaped.slice(-1) === '"') escaped += '\\\n'
  return '"""\n' + escaped + '"""'
}

function stringifyAnyInline (value, multilineOk) {
  let type = tomlType(value)
  if (type === 'string') {
    if (multilineOk && /\n/.test(value)) {
      type = 'string-multiline'
    } else if (!/[\b\t\n\f\r']/.test(value) && /"/.test(value)) {
      type = 'string-literal'
    }
  }
  return stringifyInline(value, type)
}

function stringifyInline (value, type) {
  /* istanbul ignore if */
  if (!type) type = tomlType(value)
  switch (type) {
    case 'string-multiline':
      return stringifyMultilineString(value)
    case 'string':
      return stringifyBasicString(value)
    case 'string-literal':
      return stringifyLiteralString(value)
    case 'integer':
      return stringifyInteger(value)
    case 'float':
      return stringifyFloat(value)
    case 'boolean':
      return stringifyBoolean(value)
    case 'datetime':
      return stringifyDatetime(value)
    case 'array':
      return stringifyInlineArray(value.filter(_ => tomlType(_) !== 'null' && tomlType(_) !== 'undefined' && tomlType(_) !== 'nan'))
    case 'table':
      return stringifyInlineTable(value)
    /* istanbul ignore next */
    default:
      throw typeError(type)
  }
}

function stringifyInteger (value) {
  /* eslint-disable security/detect-unsafe-regex */
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '_')
}

function stringifyFloat (value) {
  if (value === Infinity) {
    return 'inf'
  } else if (value === -Infinity) {
    return '-inf'
  } else if (Object.is(value, NaN)) {
    return 'nan'
  } else if (Object.is(value, -0)) {
    return '-0.0'
  }
  var chunks = String(value).split('.')
  var int = chunks[0]
  var dec = chunks[1] || 0
  return stringifyInteger(int) + '.' + dec
}

function stringifyBoolean (value) {
  return String(value)
}

function stringifyDatetime (value) {
  return value.toISOString()
}

function isNumber (type) {
  return type === 'float' || type === 'integer'
}
function arrayType (values) {
  var contentType = tomlType(values[0])
  if (values.every(_ => tomlType(_) === contentType)) return contentType
  // mixed integer/float, emit as floats
  if (values.every(_ => isNumber(tomlType(_)))) return 'float'
  return 'mixed'
}
function validateArray (values) {
  const type = arrayType(values)
  if (type === 'mixed') {
    throw arrayOneTypeError()
  }
  return type
}

function stringifyInlineArray (values) {
  values = toJSON(values)
  const type = validateArray(values)
  var result = '['
  var stringified = values.map(_ => stringifyInline(_, type))
  if (stringified.join(', ').length > 60 || /\n/.test(stringified)) {
    result += '\n  ' + stringified.join(',\n  ') + '\n'
  } else {
    result += ' ' + stringified.join(', ') + (stringified.length > 0 ? ' ' : '')
  }
  return result + ']'
}

function stringifyInlineTable (value) {
  value = toJSON(value)
  var result = []
  Object.keys(value).forEach(key => {
    result.push(stringifyKey(key) + ' = ' + stringifyAnyInline(value[key], false))
  })
  return '{ ' + result.join(', ') + (result.length > 0 ? ' ' : '') + '}'
}

function stringifyComplex (prefix, indent, key, value) {
  var valueType = tomlType(value)
  /* istanbul ignore else */
  if (valueType === 'array') {
    return stringifyArrayOfTables(prefix, indent, key, value)
  } else if (valueType === 'table') {
    return stringifyComplexTable(prefix, indent, key, value)
  } else {
    throw typeError(valueType)
  }
}

function stringifyArrayOfTables (prefix, indent, key, values) {
  values = toJSON(values)
  validateArray(values)
  var firstValueType = tomlType(values[0])
  /* istanbul ignore if */
  if (firstValueType !== 'table') throw typeError(firstValueType)
  var fullKey = prefix + stringifyKey(key)
  var result = ''
  values.forEach(table => {
    if (result.length > 0) result += '\n'
    result += indent + '[[' + fullKey + ']]\n'
    result += stringifyObject(fullKey + '.', indent, table)
  })
  return result
}

function stringifyComplexTable (prefix, indent, key, value) {
  var fullKey = prefix + stringifyKey(key)
  var result = ''
  if (getInlineKeys(value).length > 0) {
    result += indent + '[' + fullKey + ']\n'
  }
  return result + stringifyObject(fullKey + '.', indent, value)
}
