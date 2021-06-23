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

  update<T extends BaseSession>(...args: Parameters<T['update']>) {
    this._current.update.call(null, ...args)
    return this
  }

  start(session: BaseSession) {
    this._current = session
    return this
  }

  compplete<T extends BaseSession>(...args: Parameters<T['complete']>) {
    this._current.complete.call(null, ...args)
    return this
  }

  cancel<T extends BaseSession>(...args: Parameters<T['cancel']>) {
    this._current.cancel.call(null, ...args)
    return this
  }

  get current() {
    return this._current
  }
}

const session = new SessionManager()

export default session
