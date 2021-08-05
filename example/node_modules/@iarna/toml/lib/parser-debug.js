'use strict'
const Parser = require('./parser.js')
const util = require('util')

const dump = _ => util.inspect(_, {colors: true, depth: 10, breakLength: Infinity})
class DebugParser extends Parser {
  stateName (state) {
    // istanbul ignore next
    return (state.parser && state.parser.name) || state.name || ('anonymous')
  }
  runOne () {
    const callStack = this.stack.concat(this.state).map(_ => this.stateName(_)).join(' <- ')
    console.log('RUN', callStack, dump({line: this.line, col: this.col, char: this.char, ret: this.state.returned}))
    return super.runOne()
  }
  finish () {
    const obj = super.finish()
    // istanbul ignore if
    if (this.stack.length !== 0) {
      throw new Parser.Error('All states did not return by end of stream')
    }
    return obj
  }
  callStack () {
    const callStack = this.stack.map(_ => this.stateName(_)).join('    ').replace(/\S/g, ' ')
    return callStack ? callStack + '    ' : ''
  }
  next (fn) {
    console.log('  ', this.callStack(), 'NEXT', this.stateName(fn))
    return super.next(fn)
  }
  goto (fn) {
    console.log('  ', this.callStack(), 'GOTO', this.stateName(fn))
    super.next(fn)
    return false
  }
  call (fn, returnWith) {
    console.log('  ', this.callStack(), 'CALL', fn.name, returnWith ? '-> ' + returnWith.name : '')
    if (returnWith) super.next(returnWith)
    this.stack.push(this.state)
    this.state = {parser: fn, buf: '', returned: null}
  }
  callNow (fn, returnWith) {
    console.log('  ', this.callStack(), 'CALLNOW', fn.name, returnWith ? '-> ' + returnWith.name : '')
    if (returnWith) super.next(returnWith)
    this.stack.push(this.state)
    this.state = {parser: fn, buf: '', returned: null}
    return false
  }
  return (value) {
    console.log('  ', this.callStack(), 'RETURN')
    return super.return(value)
  }
  returnNow (value) {
    console.log('  ', this.callStack(), 'RETURNNOW')
    super.return(value)
    return false
  }
}
module.exports = DebugParser
