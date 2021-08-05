'use strict'
const f = require('./format-num.js')

class FloatingDateTime extends Date {
  constructor (value) {
    super(value + 'Z')
    this.isFloating = true
  }
  toISOString () {
    const date = `${this.getUTCFullYear()}-${f(2, this.getUTCMonth() + 1)}-${f(2, this.getUTCDate())}`
    const time = `${f(2, this.getUTCHours())}:${f(2, this.getUTCMinutes())}:${f(2, this.getUTCSeconds())}.${f(3, this.getUTCMilliseconds())}`
    return `${date}T${time}`
  }
}

module.exports = value => {
  const date = new FloatingDateTime(value)
  /* istanbul ignore if */
  if (isNaN(date)) {
    throw new TypeError('Invalid Datetime')
  } else {
    return date
  }
}
