const cursorSvgs = {
  default: 'pointer',
  resize: 'resize',
  grab: 'grab',
}

class Cursor {
  setCursor(cursor: keyof typeof cursorSvgs, rotation = 0) {
    document.body.style.setProperty('cursor', `url(${cursorSvgs[cursor]}.svg)`)
  }

  resetCursor() {
    this.setCursor('default')
  }
}

export default new Cursor()
