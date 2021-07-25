import { BaseSession } from './sessions'

/**
 * # Session Manager
 *
 * Sessions are instances that manage data mutations for activities such as
 * dragging, transforming, drawing, etc. The session manager singleton provides
 * an API with which the state's actions can begin a session and interact it.
 *
 * A session has a lifecycle:
 *
 * - it `begin`s when the session instance is created
 * - it receives `update`s during the session
 * - it ends either when it is `complete`d or `cancel`led
 *
 * Each session may produce different effects during these life cycles, according
 * to its implementation. Most sessions call a command when completed.
 *
 * It's intended that only a single session occurs at once. This pattern helps
 * ensure that we don't accidentally begin a new session before the current one
 * is cancelled or completes.
 */

export class SessionManager {
  private current?: BaseSession

  /**
   * Begin a new session.
   * @param session A Session instance.
   * @example
   * ```ts
   * session.begin(new Sessions.EditSession(data))
   * ```
   */
  begin(session: BaseSession) {
    if (this.current) {
      throw Error(
        'Cannot begin a session until the current session is complete. This error indicates a problem with the state chart.'
      )
    }

    this.current = session
    return this
  }

  /**
   * Update the current session. Include the session type as a generic in order to properly type the arguments.
   * @param args The arguments of the current session's `update` method.
   * @example
   * ```ts
   * session.update<Sessions.EditSession>(data, payload.change)
   * ```
   */
  update<T extends BaseSession>(...args: Parameters<T['update']>) {
    const session = this.current

    if (session === undefined) {
      throw Error('No current session.')
    }

    session.update.call(this.current, ...args)
    return this
  }

  /**
   * Complete the current session. Include the session type as a generic in order to properly type the arguments.
   * @param args The arguments of the current session's `complete` method.
   * @example
   * ```ts
   * session.update<Sessions.EditSession>(data, payload.change)
   * ```
   */
  complete<T extends BaseSession>(...args: Parameters<T['complete']>) {
    this.current?.complete.call(this.current, ...args)
    this.current = undefined
    return this
  }

  /**
   * Cancel the current session.
   * @param args The arguments of the current session's `cancel` method.
   * @example
   * ```ts
   * session.cancel(data)
   * ```
   */
  cancel<T extends BaseSession>(...args: Parameters<T['cancel']>) {
    this.current?.cancel.call(this.current, ...args)
    this.current = undefined
    return this
  }

  get isInSession() {
    return this.current !== undefined
  }
}
