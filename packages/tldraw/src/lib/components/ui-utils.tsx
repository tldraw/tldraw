import { Utils } from '@tldraw/core'

export class UIUtils {
  /**
   * Get a command
   *
   */
  static commandKey(): string {
    return Utils.isDarwin() ? '⌘' : 'Ctrl'
  }
}
