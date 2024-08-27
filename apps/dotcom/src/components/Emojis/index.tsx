import { Suspense, lazy } from 'react'

const EmojiDialog = lazy(() => import('./EmojiDialog'))

// We have this wrapper around EmojiDialog because the import is heavier and we want
// to load it on demand.
export default function EmojiDialogLazy(props: any) {
	return (
		<Suspense fallback={<div />}>
			<EmojiDialog {...props} />
		</Suspense>
	)
}
