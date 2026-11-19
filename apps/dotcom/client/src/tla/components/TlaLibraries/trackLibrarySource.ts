import type { LibrarySource } from '@tldraw/libraries'
import type { TLAppUiHandler } from '../../utils/app-ui-events'

const trackedSources = new WeakMap<LibrarySource, LibrarySource>()
const untrackedSources = new WeakMap<LibrarySource, LibrarySource>()

/**
 * Wraps a source so each library change made through it is reported once it succeeds. The
 * libraries package owns the panel and menus, so dotcom reports at the source rather than in their
 * handlers. Methods run against the original source, so the composite's own copies and moves
 * between its parts aren't counted again. One wrapper per source, so the panel and the context
 * menu share it.
 */
export function trackLibrarySource(source: LibrarySource, trackEvent: TLAppUiHandler) {
	const existing = trackedSources.get(source)
	if (existing) return existing
	const events: Partial<Record<keyof LibrarySource, () => void>> = {
		createLibrary: () => trackEvent('create-library', { source: 'libraries', method: 'new' }),
		copyLibrary: () => trackEvent('create-library', { source: 'libraries', method: 'copy' }),
		deleteLibrary: () => trackEvent('delete-library', { source: 'libraries' }),
		moveLibrary: () => trackEvent('move-library', { source: 'libraries' }),
		addItem: () => trackEvent('add-to-library', { source: 'libraries' }),
		addItems: () => trackEvent('add-to-library', { source: 'libraries' }),
		moveItem: () => trackEvent('move-library-item', { source: 'libraries' }),
	}
	// A proxy keeps the source's optional methods optional: the UI offers moves only when they exist.
	const tracked = new Proxy(source, {
		get(target, prop) {
			const value = Reflect.get(target, prop, target)
			if (typeof value !== 'function') return value
			const onSuccess = events[prop as keyof LibrarySource]
			if (!onSuccess) return value.bind(target)
			return (...args: unknown[]) =>
				value.apply(target, args).then((result: unknown) => {
					onSuccess()
					return result
				})
		},
	})
	trackedSources.set(source, tracked)
	untrackedSources.set(tracked, source)
	return tracked
}

/** The source a {@link trackLibrarySource} wraps, for changes reported as something else. */
export function getUntrackedLibrarySource(source: LibrarySource) {
	return untrackedSources.get(source) ?? source
}
