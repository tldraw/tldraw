'use strict'
const f = require('./format-num.js')
const DateTime = global.Date

class Date extends DateTime {
  constructor (value) {
    super(value)
    this.isDate = true
  }
  toISOString () {
    return `${this.getUTCFullYear()}-${f(2, this.getUTCMonth() + 1)}-${f(2, this.getUTCDate())}`
  }
}

module.exports = value => {
  const date = new Date(value)
  /* istanbul ignore if */
  if (isNaN(date)) {
    throw new TypeError('Invalid Datetime')
  } else {
    return date
  }
}
