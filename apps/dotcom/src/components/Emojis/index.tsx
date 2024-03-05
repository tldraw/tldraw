import { Suspense, lazy } from 'react'

const EmojiDialog = lazy(() => import('./EmojiDialog'))

export default function EmojiDialogLazy(props: any) {
	return (
		<Suspense fallback={<div />}>
			<EmojiDialog {...props} />
		</Suspense>
	)
}
