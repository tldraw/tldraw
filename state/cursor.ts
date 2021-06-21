const cursorSvgs = {
  default: 'pointer',
  resize: 'resize',
  grab: 'grab',
}

class Cursor {
  setCursor(cursor: keyof typeof cursorSvgs) {
    document.body.style.setProperty('cursor', `url(${cursorSvgs[cursor]}.svg)`)
  }

  resetCursor() {
    this.setCursor('default')
  }
}

export default new Cursor()
