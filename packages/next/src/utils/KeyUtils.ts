import hotkeys, { HotkeysEvent } from 'hotkeys-js'

type AvailableTags = 'INPUT' | 'TEXTAREA' | 'SELECT'

const tagFilter = ({ target }: KeyboardEvent, enableOnTags?: AvailableTags[]) => {
  const targetTagName = target && (target as HTMLElement).tagName
  return Boolean(
    targetTagName && enableOnTags && enableOnTags.includes(targetTagName as AvailableTags)
  )
}

export class KeyUtils {
  static registerShortcut(
    key: string,
    callback: (keyboardEvent: KeyboardEvent, hotkeysEvent: HotkeysEvent) => void
  ) {
    const fn = (keyboardEvent: KeyboardEvent, hotkeysEvent: HotkeysEvent): void => {
      keyboardEvent.preventDefault()

      if (
        tagFilter(keyboardEvent, ['INPUT', 'TEXTAREA', 'SELECT']) ||
        (keyboardEvent.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      callback(keyboardEvent, hotkeysEvent)
    }

    hotkeys(key, fn)
    return () => hotkeys.unbind(key, fn)
  }
}
