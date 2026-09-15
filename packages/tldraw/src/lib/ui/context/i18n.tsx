import { TLI18n, TLI18nAdapter } from '@tldraw/editor'
import { useCallback, useRef } from 'react'
import { useCurrentTranslation, useTranslation } from '../hooks/useTranslation/useTranslation'

/**
 * Builds the `TLI18nAdapter` the editor hands to code that has no access to React context,
 * such as a `ShapeUtil`. `<Tldraw />` wires this up for you; call it yourself only when composing
 * `<TldrawEditor />` by hand, and from inside a `<TldrawUiTranslationProvider />`.
 *
 * @example
 *
 * ```tsx
 * function MyEditor(props: TldrawEditorProps) {
 * 	const i18n = useTldrawI18n()
 * 	return <TldrawEditor {...props} i18n={i18n} />
 * }
 * ```
 *
 * @public
 */
export function useTldrawI18n(): TLI18nAdapter {
	const translation = useCurrentTranslation()
	const msg = useTranslation()

	// The adapter identity has to stay stable: it's a constructor option, so a new one on every
	// locale change would tear down and rebuild the editor. Reading through a ref keeps the
	// returned function fixed while still resolving against the current translation. Assigned
	// during render, so it is always set before the editor can call the adapter.
	const i18nRef = useRef<TLI18n | null>(null)
	i18nRef.current = {
		locale: translation.locale,
		dir: translation.dir,
		translate: msg,
	}

	return useCallback(() => i18nRef.current!, [])
}
