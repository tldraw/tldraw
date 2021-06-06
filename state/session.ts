import { BaseSession } from './sessions'

class SessionManager {
  private _current?: BaseSession

  clear() {
    this._current = undefined
    return this
  }

  setCurrent(session: BaseSession) {
    this._current = session
    return this
  }

  get current() {
    return this._current
  }

  set current(session: BaseSession) {
    this._current = session
  }
}

const session = new SessionManager()

export default session
