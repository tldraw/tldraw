'use strict'
/* eslint-disable no-new-wrappers, no-eval, camelcase, operator-linebreak */
module.exports = makeParserClass(require('./parser.js'))
module.exports.makeParserClass = makeParserClass

class TomlError extends Error {
  constructor (msg) {
    super(msg)
    this.name = 'TomlError'
    /* istanbul ignore next */
    if (Error.captureStackTrace) Error.captureStackTrace(this, TomlError)
    this.fromTOML = true
    this.wrapped = null
  }
}
TomlError.wrap = err => {
  const terr = new TomlError(err.message)
  terr.code = err.code
  terr.wrapped = err
  return terr
}
module.exports.TomlError = TomlError

const createDateTime = require('./create-datetime.js')
const createDateTimeFloat = require('./create-datetime-float.js')
const createDate = require('./create-date.js')
const createTime = require('./create-time.js')

const CTRL_I = 0x09
const CTRL_J = 0x0A
const CTRL_M = 0x0D
const CTRL_CHAR_BOUNDARY = 0x1F // the last non-character in the latin1 region of unicode, except DEL
const CHAR_SP = 0x20
const CHAR_QUOT = 0x22
const CHAR_NUM = 0x23
const CHAR_APOS = 0x27
const CHAR_PLUS = 0x2B
const CHAR_COMMA = 0x2C
const CHAR_HYPHEN = 0x2D
const CHAR_PERIOD = 0x2E
const CHAR_0 = 0x30
const CHAR_1 = 0x31
const CHAR_7 = 0x37
const CHAR_9 = 0x39
const CHAR_COLON = 0x3A
const CHAR_EQUALS = 0x3D
const CHAR_A = 0x41
const CHAR_E = 0x45
const CHAR_F = 0x46
const CHAR_T = 0x54
const CHAR_U = 0x55
const CHAR_Z = 0x5A
const CHAR_LOWBAR = 0x5F
const CHAR_a = 0x61
const CHAR_b = 0x62
const CHAR_e = 0x65
const CHAR_f = 0x66
const CHAR_i = 0x69
const CHAR_l = 0x6C
const CHAR_n = 0x6E
const CHAR_o = 0x6F
const CHAR_r = 0x72
const CHAR_s = 0x73
const CHAR_t = 0x74
const CHAR_u = 0x75
const CHAR_x = 0x78
const CHAR_z = 0x7A
const CHAR_LCUB = 0x7B
const CHAR_RCUB = 0x7D
const CHAR_LSQB = 0x5B
const CHAR_BSOL = 0x5C
const CHAR_RSQB = 0x5D
const CHAR_DEL = 0x7F
const SURROGATE_FIRST = 0xD800
const SURROGATE_LAST = 0xDFFF

const escapes = {
  [CHAR_b]: '\u0008',
  [CHAR_t]: '\u0009',
  [CHAR_n]: '\u000A',
  [CHAR_f]: '\u000C',
  [CHAR_r]: '\u000D',
  [CHAR_QUOT]: '\u0022',
  [CHAR_BSOL]: '\u005C'
}

function isDigit (cp) {
  return cp >= CHAR_0 && cp <= CHAR_9
}
function isHexit (cp) {
  return (cp >= CHAR_A && cp <= CHAR_F) || (cp >= CHAR_a && cp <= CHAR_f) || (cp >= CHAR_0 && cp <= CHAR_9)
}
function isBit (cp) {
  return cp === CHAR_1 || cp === CHAR_0
}
function isOctit (cp) {
  return (cp >= CHAR_0 && cp <= CHAR_7)
}
function isAlphaNumQuoteHyphen (cp) {
  return (cp >= CHAR_A && cp <= CHAR_Z)
      || (cp >= CHAR_a && cp <= CHAR_z)
      || (cp >= CHAR_0 && cp <= CHAR_9)
      || cp === CHAR_APOS
      || cp === CHAR_QUOT
      || cp === CHAR_LOWBAR
      || cp === CHAR_HYPHEN
}
function isAlphaNumHyphen (cp) {
  return (cp >= CHAR_A && cp <= CHAR_Z)
      || (cp >= CHAR_a && cp <= CHAR_z)
      || (cp >= CHAR_0 && cp <= CHAR_9)
      || cp === CHAR_LOWBAR
      || cp === CHAR_HYPHEN
}
const _type = Symbol('type')
const _declared = Symbol('declared')

const hasOwnProperty = Object.prototype.hasOwnProperty
const defineProperty = Object.defineProperty
const descriptor = {configurable: true, enumerable: true, writable: true, value: undefined}

function hasKey (obj, key) {
  if (hasOwnProperty.call(obj, key)) return true
  if (key === '__proto__') defineProperty(obj, '__proto__', descriptor)
  return false
}

const INLINE_TABLE = Symbol('inline-table')
function InlineTable () {
  return Object.defineProperties({}, {
    [_type]: {value: INLINE_TABLE}
  })
}
function isInlineTable (obj) {
  if (obj === null || typeof (obj) !== 'object') return false
  return obj[_type] === INLINE_TABLE
}

const TABLE = Symbol('table')
function Table () {
  return Object.defineProperties({}, {
    [_type]: {value: TABLE},
    [_declared]: {value: false, writable: true}
  })
}
function isTable (obj) {
  if (obj === null || typeof (obj) !== 'object') return false
  return obj[_type] === TABLE
}

const _contentType = Symbol('content-type')
const INLINE_LIST = Symbol('inline-list')
function InlineList (type) {
  return Object.defineProperties([], {
    [_type]: {value: INLINE_LIST},
    [_contentType]: {value: type}
  })
}
function isInlineList (obj) {
  if (obj === null || typeof (obj) !== 'object') return false
  return obj[_type] === INLINE_LIST
}

const LIST = Symbol('list')
function List () {
  return Object.defineProperties([], {
    [_type]: {value: LIST}
  })
}
function isList (obj) {
  if (obj === null || typeof (obj) !== 'object') return false
  return obj[_type] === LIST
}

// in an eval, to let bundlers not slurp in a util proxy
let _custom
try {
  const utilInspect = eval("require('util').inspect")
  _custom = utilInspect.custom
} catch (_) {
  /* eval require not available in transpiled bundle */
}
/* istanbul ignore next */
const _inspect = _custom || 'inspect'

class BoxedBigInt {
  constructor (value) {
    try {
      this.value = global.BigInt.asIntN(64, value)
    } catch (_) {
      /* istanbul ignore next */
      this.value = null
    }
    Object.defineProperty(this, _type, {value: INTEGER})
  }
  isNaN () {
    return this.value === null
  }
  /* istanbul ignore next */
  toString () {
    return String(this.value)
  }
  /* istanbul ignore next */
  [_inspect] () {
    return `[BigInt: ${this.toString()}]}`
  }
  valueOf () {
    return this.value
  }
}

const INTEGER = Symbol('integer')
function Integer (value) {
  let num = Number(value)
  // -0 is a float thing, not an int thing
  if (Object.is(num, -0)) num = 0
  /* istanbul ignore else */
  if (global.BigInt && !Number.isSafeInteger(num)) {
    return new BoxedBigInt(value)
  } else {
    /* istanbul ignore next */
    return Object.defineProperties(new Number(num), {
      isNaN: {value: function () { return isNaN(this) }},
      [_type]: {value: INTEGER},
      [_inspect]: {value: () => `[Integer: ${value}]`}
    })
  }
}
function isInteger (obj) {
  if (obj === null || typeof (obj) !== 'object') return false
  return obj[_type] === INTEGER
}

const FLOAT = Symbol('float')
function Float (value) {
  /* istanbul ignore next */
  return Object.defineProperties(new Number(value), {
    [_type]: {value: FLOAT},
    [_inspect]: {value: () => `[Float: ${value}]`}
  })
}
function isFloat (obj) {
  if (obj === null || typeof (obj) !== 'object') return false
  return obj[_type] === FLOAT
}

function tomlType (value) {
  const type = typeof value
  if (type === 'object') {
    /* istanbul ignore if */
    if (value === null) return 'null'
    if (value instanceof Date) return 'datetime'
    /* istanbul ignore else */
    if (_type in value) {
      switch (value[_type]) {
        case INLINE_TABLE: return 'inline-table'
        case INLINE_LIST: return 'inline-list'
        /* istanbul ignore next */
        case TABLE: return 'table'
        /* istanbul ignore next */
        case LIST: return 'list'
        case FLOAT: return 'float'
        case INTEGER: return 'integer'
      }
    }
  }
  return type
}

function makeParserClass (Parser) {
  class TOMLParser extends Parser {
    constructor () {
      super()
      this.ctx = this.obj = Table()
    }

    /* MATCH HELPER */
    atEndOfWord () {
      return this.char === CHAR_NUM || this.char === CTRL_I || this.char === CHAR_SP || this.atEndOfLine()
    }
    atEndOfLine () {
      return this.char === Parser.END || this.char === CTRL_J || this.char === CTRL_M
    }

    parseStart () {
      if (this.char === Parser.END) {
        return null
      } else if (this.char === CHAR_LSQB) {
        return this.call(this.parseTableOrList)
      } else if (this.char === CHAR_NUM) {
        return this.call(this.parseComment)
      } else if (this.char === CTRL_J || this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
        return null
      } else if (isAlphaNumQuoteHyphen(this.char)) {
        return this.callNow(this.parseAssignStatement)
      } else {
        throw this.error(new TomlError(`Unknown character "${this.char}"`))
      }
    }

    // HELPER, this strips any whitespace and comments to the end of the line
    // then RETURNS. Last state in a production.
    parseWhitespaceToEOL () {
      if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
        return null
      } else if (this.char === CHAR_NUM) {
        return this.goto(this.parseComment)
      } else if (this.char === Parser.END || this.char === CTRL_J) {
        return this.return()
      } else {
        throw this.error(new TomlError('Unexpected character, expected only whitespace or comments till end of line'))
      }
    }

    /* ASSIGNMENT: key = value */
    parseAssignStatement () {
      return this.callNow(this.parseAssign, this.recordAssignStatement)
    }
    recordAssignStatement (kv) {
      let target = this.ctx
      let finalKey = kv.key.pop()
      for (let kw of kv.key) {
        if (hasKey(target, kw) && (!isTable(target[kw]) || target[kw][_declared])) {
          throw this.error(new TomlError("Can't redefine existing key"))
        }
        target = target[kw] = target[kw] || Table()
      }
      if (hasKey(target, finalKey)) {
        throw this.error(new TomlError("Can't redefine existing key"))
      }
      // unbox our numbers
      if (isInteger(kv.value) || isFloat(kv.value)) {
        target[finalKey] = kv.value.valueOf()
      } else {
        target[finalKey] = kv.value
      }
      return this.goto(this.parseWhitespaceToEOL)
    }

    /* ASSSIGNMENT expression, key = value possibly inside an inline table */
    parseAssign () {
      return this.callNow(this.parseKeyword, this.recordAssignKeyword)
    }
    recordAssignKeyword (key) {
      if (this.state.resultTable) {
        this.state.resultTable.push(key)
      } else {
        this.state.resultTable = [key]
      }
      return this.goto(this.parseAssignKeywordPreDot)
    }
    parseAssignKeywordPreDot () {
      if (this.char === CHAR_PERIOD) {
        return this.next(this.parseAssignKeywordPostDot)
      } else if (this.char !== CHAR_SP && this.char !== CTRL_I) {
        return this.goto(this.parseAssignEqual)
      }
    }
    parseAssignKeywordPostDot () {
      if (this.char !== CHAR_SP && this.char !== CTRL_I) {
        return this.callNow(this.parseKeyword, this.recordAssignKeyword)
      }
    }

    parseAssignEqual () {
      if (this.char === CHAR_EQUALS) {
        return this.next(this.parseAssignPreValue)
      } else {
        throw this.error(new TomlError('Invalid character, expected "="'))
      }
    }
    parseAssignPreValue () {
      if (this.char === CHAR_SP || this.char === CTRL_I) {
        return null
      } else {
        return this.callNow(this.parseValue, this.recordAssignValue)
      }
    }
    recordAssignValue (value) {
      return this.returnNow({key: this.state.resultTable, value: value})
    }

    /* COMMENTS: #...eol */
    parseComment () {
      do {
        if (this.char === Parser.END || this.char === CTRL_J) {
          return this.return()
        }
      } while (this.nextChar())
    }

    /* TABLES AND LISTS, [foo] and [[foo]] */
    parseTableOrList () {
      if (this.char === CHAR_LSQB) {
        this.next(this.parseList)
      } else {
        return this.goto(this.parseTable)
      }
    }

    /* TABLE [foo.bar.baz] */
    parseTable () {
      this.ctx = this.obj
      return this.goto(this.parseTableNext)
    }
    parseTableNext () {
      if (this.char === CHAR_SP || this.char === CTRL_I) {
        return null
      } else {
        return this.callNow(this.parseKeyword, this.parseTableMore)
      }
    }
    parseTableMore (keyword) {
      if (this.char === CHAR_SP || this.char === CTRL_I) {
        return null
      } else if (this.char === CHAR_RSQB) {
        if (hasKey(this.ctx, keyword) && (!isTable(this.ctx[keyword]) || this.ctx[keyword][_declared])) {
          throw this.error(new TomlError("Can't redefine existing key"))
        } else {
          this.ctx = this.ctx[keyword] = this.ctx[keyword] || Table()
          this.ctx[_declared] = true
        }
        return this.next(this.parseWhitespaceToEOL)
      } else if (this.char === CHAR_PERIOD) {
        if (!hasKey(this.ctx, keyword)) {
          this.ctx = this.ctx[keyword] = Table()
        } else if (isTable(this.ctx[keyword])) {
          this.ctx = this.ctx[keyword]
        } else if (isList(this.ctx[keyword])) {
          this.ctx = this.ctx[keyword][this.ctx[keyword].length - 1]
        } else {
          throw this.error(new TomlError("Can't redefine existing key"))
        }
        return this.next(this.parseTableNext)
      } else {
        throw this.error(new TomlError('Unexpected character, expected whitespace, . or ]'))
      }
    }

    /* LIST [[a.b.c]] */
    parseList () {
      this.ctx = this.obj
      return this.goto(this.parseListNext)
    }
    parseListNext () {
      if (this.char === CHAR_SP || this.char === CTRL_I) {
        return null
      } else {
        return this.callNow(this.parseKeyword, this.parseListMore)
      }
    }
    parseListMore (keyword) {
      if (this.char === CHAR_SP || this.char === CTRL_I) {
        return null
      } else if (this.char === CHAR_RSQB) {
        if (!hasKey(this.ctx, keyword)) {
          this.ctx[keyword] = List()
        }
        if (isInlineList(this.ctx[keyword])) {
          throw this.error(new TomlError("Can't extend an inline array"))
        } else if (isList(this.ctx[keyword])) {
          const next = Table()
          this.ctx[keyword].push(next)
          this.ctx = next
        } else {
          throw this.error(new TomlError("Can't redefine an existing key"))
        }
        return this.next(this.parseListEnd)
      } else if (this.char === CHAR_PERIOD) {
        if (!hasKey(this.ctx, keyword)) {
          this.ctx = this.ctx[keyword] = Table()
        } else if (isInlineList(this.ctx[keyword])) {
          throw this.error(new TomlError("Can't extend an inline array"))
        } else if (isInlineTable(this.ctx[keyword])) {
          throw this.error(new TomlError("Can't extend an inline table"))
        } else if (isList(this.ctx[keyword])) {
          this.ctx = this.ctx[keyword][this.ctx[keyword].length - 1]
        } else if (isTable(this.ctx[keyword])) {
          this.ctx = this.ctx[keyword]
        } else {
          throw this.error(new TomlError("Can't redefine an existing key"))
        }
        return this.next(this.parseListNext)
      } else {
        throw this.error(new TomlError('Unexpected character, expected whitespace, . or ]'))
      }
    }
    parseListEnd (keyword) {
      if (this.char === CHAR_RSQB) {
        return this.next(this.parseWhitespaceToEOL)
      } else {
        throw this.error(new TomlError('Unexpected character, expected whitespace, . or ]'))
      }
    }

    /* VALUE string, number, boolean, inline list, inline object */
    parseValue () {
      if (this.char === Parser.END) {
        throw this.error(new TomlError('Key without value'))
      } else if (this.char === CHAR_QUOT) {
        return this.next(this.parseDoubleString)
      } if (this.char === CHAR_APOS) {
        return this.next(this.parseSingleString)
      } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
        return this.goto(this.parseNumberSign)
      } else if (this.char === CHAR_i) {
        return this.next(this.parseInf)
      } else if (this.char === CHAR_n) {
        return this.next(this.parseNan)
      } else if (isDigit(this.char)) {
        return this.goto(this.parseNumberOrDateTime)
      } else if (this.char === CHAR_t || this.char === CHAR_f) {
        return this.goto(this.parseBoolean)
      } else if (this.char === CHAR_LSQB) {
        return this.call(this.parseInlineList, this.recordValue)
      } else if (this.char === CHAR_LCUB) {
        return this.call(this.parseInlineTable, this.recordValue)
      } else {
        throw this.error(new TomlError('Unexpected character, expecting string, number, datetime, boolean, inline array or inline table'))
      }
    }
    recordValue (value) {
      return this.returnNow(value)
    }

    parseInf () {
      if (this.char === CHAR_n) {
        return this.next(this.parseInf2)
      } else {
        throw this.error(new TomlError('Unexpected character, expected "inf", "+inf" or "-inf"'))
      }
    }
    parseInf2 () {
      if (this.char === CHAR_f) {
        if (this.state.buf === '-') {
          return this.return(-Infinity)
        } else {
          return this.return(Infinity)
        }
      } else {
        throw this.error(new TomlError('Unexpected character, expected "inf", "+inf" or "-inf"'))
      }
    }

    parseNan () {
      if (this.char === CHAR_a) {
        return this.next(this.parseNan2)
      } else {
        throw this.error(new TomlError('Unexpected character, expected "nan"'))
      }
    }
    parseNan2 () {
      if (this.char === CHAR_n) {
        return this.return(NaN)
      } else {
        throw this.error(new TomlError('Unexpected character, expected "nan"'))
      }
    }

    /* KEYS, barewords or basic, literal, or dotted */
    parseKeyword () {
      if (this.char === CHAR_QUOT) {
        return this.next(this.parseBasicString)
      } else if (this.char === CHAR_APOS) {
        return this.next(this.parseLiteralString)
      } else {
        return this.goto(this.parseBareKey)
      }
    }

    /* KEYS: barewords */
    parseBareKey () {
      do {
        if (this.char === Parser.END) {
          throw this.error(new TomlError('Key ended without value'))
        } else if (isAlphaNumHyphen(this.char)) {
          this.consume()
        } else if (this.state.buf.length === 0) {
          throw this.error(new TomlError('Empty bare keys are not allowed'))
        } else {
          return this.returnNow()
        }
      } while (this.nextChar())
    }

    /* STRINGS, single quoted (literal) */
    parseSingleString () {
      if (this.char === CHAR_APOS) {
        return this.next(this.parseLiteralMultiStringMaybe)
      } else {
        return this.goto(this.parseLiteralString)
      }
    }
    parseLiteralString () {
      do {
        if (this.char === CHAR_APOS) {
          return this.return()
        } else if (this.atEndOfLine()) {
          throw this.error(new TomlError('Unterminated string'))
        } else if (this.char === CHAR_DEL || (this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I)) {
          throw this.errorControlCharInString()
        } else {
          this.consume()
        }
      } while (this.nextChar())
    }
    parseLiteralMultiStringMaybe () {
      if (this.char === CHAR_APOS) {
        return this.next(this.parseLiteralMultiString)
      } else {
        return this.returnNow()
      }
    }
    parseLiteralMultiString () {
      if (this.char === CTRL_M) {
        return null
      } else if (this.char === CTRL_J) {
        return this.next(this.parseLiteralMultiStringContent)
      } else {
        return this.goto(this.parseLiteralMultiStringContent)
      }
    }
    parseLiteralMultiStringContent () {
      do {
        if (this.char === CHAR_APOS) {
          return this.next(this.parseLiteralMultiEnd)
        } else if (this.char === Parser.END) {
          throw this.error(new TomlError('Unterminated multi-line string'))
        } else if (this.char === CHAR_DEL || (this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I && this.char !== CTRL_J && this.char !== CTRL_M)) {
          throw this.errorControlCharInString()
        } else {
          this.consume()
        }
      } while (this.nextChar())
    }
    parseLiteralMultiEnd () {
      if (this.char === CHAR_APOS) {
        return this.next(this.parseLiteralMultiEnd2)
      } else {
        this.state.buf += "'"
        return this.goto(this.parseLiteralMultiStringContent)
      }
    }
    parseLiteralMultiEnd2 () {
      if (this.char === CHAR_APOS) {
        return this.return()
      } else {
        this.state.buf += "''"
        return this.goto(this.parseLiteralMultiStringContent)
      }
    }

    /* STRINGS double quoted */
    parseDoubleString () {
      if (this.char === CHAR_QUOT) {
        return this.next(this.parseMultiStringMaybe)
      } else {
        return this.goto(this.parseBasicString)
      }
    }
    parseBasicString () {
      do {
        if (this.char === CHAR_BSOL) {
          return this.call(this.parseEscape, this.recordEscapeReplacement)
        } else if (this.char === CHAR_QUOT) {
          return this.return()
        } else if (this.atEndOfLine()) {
          throw this.error(new TomlError('Unterminated string'))
        } else if (this.char === CHAR_DEL || (this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I)) {
          throw this.errorControlCharInString()
        } else {
          this.consume()
        }
      } while (this.nextChar())
    }
    recordEscapeReplacement (replacement) {
      this.state.buf += replacement
      return this.goto(this.parseBasicString)
    }
    parseMultiStringMaybe () {
      if (this.char === CHAR_QUOT) {
        return this.next(this.parseMultiString)
      } else {
        return this.returnNow()
      }
    }
    parseMultiString () {
      if (this.char === CTRL_M) {
        return null
      } else if (this.char === CTRL_J) {
        return this.next(this.parseMultiStringContent)
      } else {
        return this.goto(this.parseMultiStringContent)
      }
    }
    parseMultiStringContent () {
      do {
        if (this.char === CHAR_BSOL) {
          return this.call(this.parseMultiEscape, this.recordMultiEscapeReplacement)
        } else if (this.char === CHAR_QUOT) {
          return this.next(this.parseMultiEnd)
        } else if (this.char === Parser.END) {
          throw this.error(new TomlError('Unterminated multi-line string'))
        } else if (this.char === CHAR_DEL || (this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I && this.char !== CTRL_J && this.char !== CTRL_M)) {
          throw this.errorControlCharInString()
        } else {
          this.consume()
        }
      } while (this.nextChar())
    }
    errorControlCharInString () {
      let displayCode = '\\u00'
      if (this.char < 16) {
        displayCode += '0'
      }
      displayCode += this.char.toString(16)

      return this.error(new TomlError(`Control characters (codes < 0x1f and 0x7f) are not allowed in strings, use ${displayCode} instead`))
    }
    recordMultiEscapeReplacement (replacement) {
      this.state.buf += replacement
      return this.goto(this.parseMultiStringContent)
    }
    parseMultiEnd () {
      if (this.char === CHAR_QUOT) {
        return this.next(this.parseMultiEnd2)
      } else {
        this.state.buf += '"'
        return this.goto(this.parseMultiStringContent)
      }
    }
    parseMultiEnd2 () {
      if (this.char === CHAR_QUOT) {
        return this.return()
      } else {
        this.state.buf += '""'
        return this.goto(this.parseMultiStringContent)
      }
    }
    parseMultiEscape () {
      if (this.char === CTRL_M || this.char === CTRL_J) {
        return this.next(this.parseMultiTrim)
      } else if (this.char === CHAR_SP || this.char === CTRL_I) {
        return this.next(this.parsePreMultiTrim)
      } else {
        return this.goto(this.parseEscape)
      }
    }
    parsePreMultiTrim () {
      if (this.char === CHAR_SP || this.char === CTRL_I) {
        return null
      } else if (this.char === CTRL_M || this.char === CTRL_J) {
        return this.next(this.parseMultiTrim)
      } else {
        throw this.error(new TomlError("Can't escape whitespace"))
      }
    }
    parseMultiTrim () {
      // explicitly whitespace here, END should follow the same path as chars
      if (this.char === CTRL_J || this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
        return null
      } else {
        return this.returnNow()
      }
    }
    parseEscape () {
      if (this.char in escapes) {
        return this.return(escapes[this.char])
      } else if (this.char === CHAR_u) {
        return this.call(this.parseSmallUnicode, this.parseUnicodeReturn)
      } else if (this.char === CHAR_U) {
        return this.call(this.parseLargeUnicode, this.parseUnicodeReturn)
      } else {
        throw this.error(new TomlError('Unknown escape character: ' + this.char))
      }
    }
    parseUnicodeReturn (char) {
      try {
        const codePoint = parseInt(char, 16)
        if (codePoint >= SURROGATE_FIRST && codePoint <= SURROGATE_LAST) {
          throw this.error(new TomlError('Invalid unicode, character in range 0xD800 - 0xDFFF is reserved'))
        }
        return this.returnNow(String.fromCodePoint(codePoint))
      } catch (err) {
        throw this.error(TomlError.wrap(err))
      }
    }
    parseSmallUnicode () {
      if (!isHexit(this.char)) {
        throw this.error(new TomlError('Invalid character in unicode sequence, expected hex'))
      } else {
        this.consume()
        if (this.state.buf.length >= 4) return this.return()
      }
    }
    parseLargeUnicode () {
      if (!isHexit(this.char)) {
        throw this.error(new TomlError('Invalid character in unicode sequence, expected hex'))
      } else {
        this.consume()
        if (this.state.buf.length >= 8) return this.return()
      }
    }

    /* NUMBERS */
    parseNumberSign () {
      this.consume()
      return this.next(this.parseMaybeSignedInfOrNan)
    }
    parseMaybeSignedInfOrNan () {
      if (this.char === CHAR_i) {
        return this.next(this.parseInf)
      } else if (this.char === CHAR_n) {
        return this.next(this.parseNan)
      } else {
        return this.callNow(this.parseNoUnder, this.parseNumberIntegerStart)
      }
    }
    parseNumberIntegerStart () {
      if (this.char === CHAR_0) {
        this.consume()
        return this.next(this.parseNumberIntegerExponentOrDecimal)
      } else {
        return this.goto(this.parseNumberInteger)
      }
    }
    parseNumberIntegerExponentOrDecimal () {
      if (this.char === CHAR_PERIOD) {
        this.consume()
        return this.call(this.parseNoUnder, this.parseNumberFloat)
      } else if (this.char === CHAR_E || this.char === CHAR_e) {
        this.consume()
        return this.next(this.parseNumberExponentSign)
      } else {
        return this.returnNow(Integer(this.state.buf))
      }
    }
    parseNumberInteger () {
      if (isDigit(this.char)) {
        this.consume()
      } else if (this.char === CHAR_LOWBAR) {
        return this.call(this.parseNoUnder)
      } else if (this.char === CHAR_E || this.char === CHAR_e) {
        this.consume()
        return this.next(this.parseNumberExponentSign)
      } else if (this.char === CHAR_PERIOD) {
        this.consume()
        return this.call(this.parseNoUnder, this.parseNumberFloat)
      } else {
        const result = Integer(this.state.buf)
        /* istanbul ignore if */
        if (result.isNaN()) {
          throw this.error(new TomlError('Invalid number'))
        } else {
          return this.returnNow(result)
        }
      }
    }
    parseNoUnder () {
      if (this.char === CHAR_LOWBAR || this.char === CHAR_PERIOD || this.char === CHAR_E || this.char === CHAR_e) {
        throw this.error(new TomlError('Unexpected character, expected digit'))
      } else if (this.atEndOfWord()) {
        throw this.error(new TomlError('Incomplete number'))
      }
      return this.returnNow()
    }
    parseNoUnderHexOctBinLiteral () {
      if (this.char === CHAR_LOWBAR || this.char === CHAR_PERIOD) {
        throw this.error(new TomlError('Unexpected character, expected digit'))
      } else if (this.atEndOfWord()) {
        throw this.error(new TomlError('Incomplete number'))
      }
      return this.returnNow()
    }
    parseNumberFloat () {
      if (this.char === CHAR_LOWBAR) {
        return this.call(this.parseNoUnder, this.parseNumberFloat)
      } else if (isDigit(this.char)) {
        this.consume()
      } else if (this.char === CHAR_E || this.char === CHAR_e) {
        this.consume()
        return this.next(this.parseNumberExponentSign)
      } else {
        return this.returnNow(Float(this.state.buf))
      }
    }
    parseNumberExponentSign () {
      if (isDigit(this.char)) {
        return this.goto(this.parseNumberExponent)
      } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
        this.consume()
        this.call(this.parseNoUnder, this.parseNumberExponent)
      } else {
        throw this.error(new TomlError('Unexpected character, expected -, + or digit'))
      }
    }
    parseNumberExponent () {
      if (isDigit(this.char)) {
        this.consume()
      } else if (this.char === CHAR_LOWBAR) {
        return this.call(this.parseNoUnder)
      } else {
        return this.returnNow(Float(this.state.buf))
      }
    }

    /* NUMBERS or DATETIMES  */
    parseNumberOrDateTime () {
      if (this.char === CHAR_0) {
        this.consume()
        return this.next(this.parseNumberBaseOrDateTime)
      } else {
        return this.goto(this.parseNumberOrDateTimeOnly)
      }
    }
    parseNumberOrDateTimeOnly () {
      // note, if two zeros are in a row then it MUST be a date
      if (this.char === CHAR_LOWBAR) {
        return this.call(this.parseNoUnder, this.parseNumberInteger)
      } else if (isDigit(this.char)) {
        this.consume()
        if (this.state.buf.length > 4) this.next(this.parseNumberInteger)
      } else if (this.char === CHAR_E || this.char === CHAR_e) {
        this.consume()
        return this.next(this.parseNumberExponentSign)
      } else if (this.char === CHAR_PERIOD) {
        this.consume()
        return this.call(this.parseNoUnder, this.parseNumberFloat)
      } else if (this.char === CHAR_HYPHEN) {
        return this.goto(this.parseDateTime)
      } else if (this.char === CHAR_COLON) {
        return this.goto(this.parseOnlyTimeHour)
      } else {
        return this.returnNow(Integer(this.state.buf))
      }
    }
    parseDateTimeOnly () {
      if (this.state.buf.length < 4) {
        if (isDigit(this.char)) {
          return this.consume()
        } else if (this.char === CHAR_COLON) {
          return this.goto(this.parseOnlyTimeHour)
        } else {
          throw this.error(new TomlError('Expected digit while parsing year part of a date'))
        }
      } else {
        if (this.char === CHAR_HYPHEN) {
          return this.goto(this.parseDateTime)
        } else {
          throw this.error(new TomlError('Expected hyphen (-) while parsing year part of date'))
        }
      }
    }
    parseNumberBaseOrDateTime () {
      if (this.char === CHAR_b) {
        this.consume()
        return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerBin)
      } else if (this.char === CHAR_o) {
        this.consume()
        return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerOct)
      } else if (this.char === CHAR_x) {
        this.consume()
        return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerHex)
      } else if (this.char === CHAR_PERIOD) {
        return this.goto(this.parseNumberInteger)
      } else if (isDigit(this.char)) {
        return this.goto(this.parseDateTimeOnly)
      } else {
        return this.returnNow(Integer(this.state.buf))
      }
    }
    parseIntegerHex () {
      if (isHexit(this.char)) {
        this.consume()
      } else if (this.char === CHAR_LOWBAR) {
        return this.call(this.parseNoUnderHexOctBinLiteral)
      } else {
        const result = Integer(this.state.buf)
        /* istanbul ignore if */
        if (result.isNaN()) {
          throw this.error(new TomlError('Invalid number'))
        } else {
          return this.returnNow(result)
        }
      }
    }
    parseIntegerOct () {
      if (isOctit(this.char)) {
        this.consume()
      } else if (this.char === CHAR_LOWBAR) {
        return this.call(this.parseNoUnderHexOctBinLiteral)
      } else {
        const result = Integer(this.state.buf)
        /* istanbul ignore if */
        if (result.isNaN()) {
          throw this.error(new TomlError('Invalid number'))
        } else {
          return this.returnNow(result)
        }
      }
    }
    parseIntegerBin () {
      if (isBit(this.char)) {
        this.consume()
      } else if (this.char === CHAR_LOWBAR) {
        return this.call(this.parseNoUnderHexOctBinLiteral)
      } else {
        const result = Integer(this.state.buf)
        /* istanbul ignore if */
        if (result.isNaN()) {
          throw this.error(new TomlError('Invalid number'))
        } else {
          return this.returnNow(result)
        }
      }
    }

    /* DATETIME */
    parseDateTime () {
      // we enter here having just consumed the year and about to consume the hyphen
      if (this.state.buf.length < 4) {
        throw this.error(new TomlError('Years less than 1000 must be zero padded to four characters'))
      }
      this.state.result = this.state.buf
      this.state.buf = ''
      return this.next(this.parseDateMonth)
    }
    parseDateMonth () {
      if (this.char === CHAR_HYPHEN) {
        if (this.state.buf.length < 2) {
          throw this.error(new TomlError('Months less than 10 must be zero padded to two characters'))
        }
        this.state.result += '-' + this.state.buf
        this.state.buf = ''
        return this.next(this.parseDateDay)
      } else if (isDigit(this.char)) {
        this.consume()
      } else {
        throw this.error(new TomlError('Incomplete datetime'))
      }
    }
    parseDateDay () {
      if (this.char === CHAR_T || this.char === CHAR_SP) {
        if (this.state.buf.length < 2) {
          throw this.error(new TomlError('Days less than 10 must be zero padded to two characters'))
        }
        this.state.result += '-' + this.state.buf
        this.state.buf = ''
        return this.next(this.parseStartTimeHour)
      } else if (this.atEndOfWord()) {
        return this.returnNow(createDate(this.state.result + '-' + this.state.buf))
      } else if (isDigit(this.char)) {
        this.consume()
      } else {
        throw this.error(new TomlError('Incomplete datetime'))
      }
    }
    parseStartTimeHour () {
      if (this.atEndOfWord()) {
        return this.returnNow(createDate(this.state.result))
      } else {
        return this.goto(this.parseTimeHour)
      }
    }
    parseTimeHour () {
      if (this.char === CHAR_COLON) {
        if (this.state.buf.length < 2) {
          throw this.error(new TomlError('Hours less than 10 must be zero padded to two characters'))
        }
        this.state.result += 'T' + this.state.buf
        this.state.buf = ''
        return this.next(this.parseTimeMin)
      } else if (isDigit(this.char)) {
        this.consume()
      } else {
        throw this.error(new TomlError('Incomplete datetime'))
      }
    }
    parseTimeMin () {
      if (this.state.buf.length < 2 && isDigit(this.char)) {
        this.consume()
      } else if (this.state.buf.length === 2 && this.char === CHAR_COLON) {
        this.state.result += ':' + this.state.buf
        this.state.buf = ''
        return this.next(this.parseTimeSec)
      } else {
        throw this.error(new TomlError('Incomplete datetime'))
      }
    }
    parseTimeSec () {
      if (isDigit(this.char)) {
        this.consume()
        if (this.state.buf.length === 2) {
          this.state.result += ':' + this.state.buf
          this.state.buf = ''
          return this.next(this.parseTimeZoneOrFraction)
        }
      } else {
        throw this.error(new TomlError('Incomplete datetime'))
      }
    }

    parseOnlyTimeHour () {
      /* istanbul ignore else */
      if (this.char === CHAR_COLON) {
        if (this.state.buf.length < 2) {
          throw this.error(new TomlError('Hours less than 10 must be zero padded to two characters'))
        }
        this.state.result = this.state.buf
        this.state.buf = ''
        return this.next(this.parseOnlyTimeMin)
      } else {
        throw this.error(new TomlError('Incomplete time'))
      }
    }
    parseOnlyTimeMin () {
      if (this.state.buf.length < 2 && isDigit(this.char)) {
        this.consume()
      } else if (this.state.buf.length === 2 && this.char === CHAR_COLON) {
        this.state.result += ':' + this.state.buf
        this.state.buf = ''
        return this.next(this.parseOnlyTimeSec)
      } else {
        throw this.error(new TomlError('Incomplete time'))
      }
    }
    parseOnlyTimeSec () {
      if (isDigit(this.char)) {
        this.consume()
        if (this.state.buf.length === 2) {
          return this.next(this.parseOnlyTimeFractionMaybe)
        }
      } else {
        throw this.error(new TomlError('Incomplete time'))
      }
    }
    parseOnlyTimeFractionMaybe () {
      this.state.result += ':' + this.state.buf
      if (this.char === CHAR_PERIOD) {
        this.state.buf = ''
        this.next(this.parseOnlyTimeFraction)
      } else {
        return this.return(createTime(this.state.result))
      }
    }
    parseOnlyTimeFraction () {
      if (isDigit(this.char)) {
        this.consume()
      } else if (this.atEndOfWord()) {
        if (this.state.buf.length === 0) throw this.error(new TomlError('Expected digit in milliseconds'))
        return this.returnNow(createTime(this.state.result + '.' + this.state.buf))
      } else {
        throw this.error(new TomlError('Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z'))
      }
    }

    parseTimeZoneOrFraction () {
      if (this.char === CHAR_PERIOD) {
        this.consume()
        this.next(this.parseDateTimeFraction)
      } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
        this.consume()
        this.next(this.parseTimeZoneHour)
      } else if (this.char === CHAR_Z) {
        this.consume()
        return this.return(createDateTime(this.state.result + this.state.buf))
      } else if (this.atEndOfWord()) {
        return this.returnNow(createDateTimeFloat(this.state.result + this.state.buf))
      } else {
        throw this.error(new TomlError('Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z'))
      }
    }
    parseDateTimeFraction () {
      if (isDigit(this.char)) {
        this.consume()
      } else if (this.state.buf.length === 1) {
        throw this.error(new TomlError('Expected digit in milliseconds'))
      } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
        this.consume()
        this.next(this.parseTimeZoneHour)
      } else if (this.char === CHAR_Z) {
        this.consume()
        return this.return(createDateTime(this.state.result + this.state.buf))
      } else if (this.atEndOfWord()) {
        return this.returnNow(createDateTimeFloat(this.state.result + this.state.buf))
      } else {
        throw this.error(new TomlError('Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z'))
      }
    }
    parseTimeZoneHour () {
      if (isDigit(this.char)) {
        this.consume()
        // FIXME: No more regexps
        if (/\d\d$/.test(this.state.buf)) return this.next(this.parseTimeZoneSep)
      } else {
        throw this.error(new TomlError('Unexpected character in datetime, expected digit'))
      }
    }
    parseTimeZoneSep () {
      if (this.char === CHAR_COLON) {
        this.consume()
        this.next(this.parseTimeZoneMin)
      } else {
        throw this.error(new TomlError('Unexpected character in datetime, expected colon'))
      }
    }
    parseTimeZoneMin () {
      if (isDigit(this.char)) {
        this.consume()
        if (/\d\d$/.test(this.state.buf)) return this.return(createDateTime(this.state.result + this.state.buf))
      } else {
        throw this.error(new TomlError('Unexpected character in datetime, expected digit'))
      }
    }

    /* BOOLEAN */
    parseBoolean () {
      /* istanbul ignore else */
      if (this.char === CHAR_t) {
        this.consume()
        return this.next(this.parseTrue_r)
      } else if (this.char === CHAR_f) {
        this.consume()
        return this.next(this.parseFalse_a)
      }
    }
    parseTrue_r () {
      if (this.char === CHAR_r) {
        this.consume()
        return this.next(this.parseTrue_u)
      } else {
        throw this.error(new TomlError('Invalid boolean, expected true or false'))
      }
    }
    parseTrue_u () {
      if (this.char === CHAR_u) {
        this.consume()
        return this.next(this.parseTrue_e)
      } else {
        throw this.error(new TomlError('Invalid boolean, expected true or false'))
      }
    }
    parseTrue_e () {
      if (this.char === CHAR_e) {
        return this.return(true)
      } else {
        throw this.error(new TomlError('Invalid boolean, expected true or false'))
      }
    }

    parseFalse_a () {
      if (this.char === CHAR_a) {
        this.consume()
        return this.next(this.parseFalse_l)
      } else {
        throw this.error(new TomlError('Invalid boolean, expected true or false'))
      }
    }

    parseFalse_l () {
      if (this.char === CHAR_l) {
        this.consume()
        return this.next(this.parseFalse_s)
      } else {
        throw this.error(new TomlError('Invalid boolean, expected true or false'))
      }
    }

    parseFalse_s () {
      if (this.char === CHAR_s) {
        this.consume()
        return this.next(this.parseFalse_e)
      } else {
        throw this.error(new TomlError('Invalid boolean, expected true or false'))
      }
    }

    parseFalse_e () {
      if (this.char === CHAR_e) {
        return this.return(false)
      } else {
        throw this.error(new TomlError('Invalid boolean, expected true or false'))
      }
    }

    /* INLINE LISTS */
    parseInlineList () {
      if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M || this.char === CTRL_J) {
        return null
      } else if (this.char === Parser.END) {
        throw this.error(new TomlError('Unterminated inline array'))
      } else if (this.char === CHAR_NUM) {
        return this.call(this.parseComment)
      } else if (this.char === CHAR_RSQB) {
        return this.return(this.state.resultArr || InlineList())
      } else {
        return this.callNow(this.parseValue, this.recordInlineListValue)
      }
    }
    recordInlineListValue (value) {
      if (this.state.resultArr) {
        const listType = this.state.resultArr[_contentType]
        const valueType = tomlType(value)
        if (listType !== valueType) {
          throw this.error(new TomlError(`Inline lists must be a single type, not a mix of ${listType} and ${valueType}`))
        }
      } else {
        this.state.resultArr = InlineList(tomlType(value))
      }
      if (isFloat(value) || isInteger(value)) {
        // unbox now that we've verified they're ok
        this.state.resultArr.push(value.valueOf())
      } else {
        this.state.resultArr.push(value)
      }
      return this.goto(this.parseInlineListNext)
    }
    parseInlineListNext () {
      if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M || this.char === CTRL_J) {
        return null
      } else if (this.char === CHAR_NUM) {
        return this.call(this.parseComment)
      } else if (this.char === CHAR_COMMA) {
        return this.next(this.parseInlineList)
      } else if (this.char === CHAR_RSQB) {
        return this.goto(this.parseInlineList)
      } else {
        throw this.error(new TomlError('Invalid character, expected whitespace, comma (,) or close bracket (])'))
      }
    }

    /* INLINE TABLE */
    parseInlineTable () {
      if (this.char === CHAR_SP || this.char === CTRL_I) {
        return null
      } else if (this.char === Parser.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
        throw this.error(new TomlError('Unterminated inline array'))
      } else if (this.char === CHAR_RCUB) {
        return this.return(this.state.resultTable || InlineTable())
      } else {
        if (!this.state.resultTable) this.state.resultTable = InlineTable()
        return this.callNow(this.parseAssign, this.recordInlineTableValue)
      }
    }
    recordInlineTableValue (kv) {
      let target = this.state.resultTable
      let finalKey = kv.key.pop()
      for (let kw of kv.key) {
        if (hasKey(target, kw) && (!isTable(target[kw]) || target[kw][_declared])) {
          throw this.error(new TomlError("Can't redefine existing key"))
        }
        target = target[kw] = target[kw] || Table()
      }
      if (hasKey(target, finalKey)) {
        throw this.error(new TomlError("Can't redefine existing key"))
      }
      if (isInteger(kv.value) || isFloat(kv.value)) {
        target[finalKey] = kv.value.valueOf()
      } else {
        target[finalKey] = kv.value
      }
      return this.goto(this.parseInlineTableNext)
    }
    parseInlineTableNext () {
      if (this.char === CHAR_SP || this.char === CTRL_I) {
        return null
      } else if (this.char === Parser.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
        throw this.error(new TomlError('Unterminated inline array'))
      } else if (this.char === CHAR_COMMA) {
        return this.next(this.parseInlineTable)
      } else if (this.char === CHAR_RCUB) {
        return this.goto(this.parseInlineTable)
      } else {
        throw this.error(new TomlError('Invalid character, expected whitespace, comma (,) or close bracket (])'))
      }
    }
  }
  return TOMLParser
}
