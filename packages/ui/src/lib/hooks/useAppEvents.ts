import { TLPageId, useApp } from '@tldraw/editor'
import { useEffect } from 'react'
import { useToasts } from './useToastsProvider'

/** @public */
export function useAppEvents() {
	const app = useApp()
	const { addToast } = useToasts()

	useEffect(() => {
		function handleMaxShapes({ name, count }: { name: string; pageId: string; count: number }) {
			addToast({
				title: 'Maximum Shapes Reached',
				description: `You've reached the maximum number of shapes allowed on ${name} (${count}). Please delete some shapes or move to a different page to continue.`,
			})
		}

		function handleMoveToPage({ name, fromId }: { name: string; fromId: TLPageId }) {
			addToast({
				title: 'Changed Page',
				description: `Moved to ${name}.`,
				actions: [
					{
						label: 'Go Back',
						type: 'primary',
						onClick: () => {
							app.mark('change-page')
							app.setCurrentPageId(fromId)
						},
					}, // prev page
				],
			})
		}

		app.addListener('max-shapes', handleMaxShapes)
		app.addListener('move-to-page', handleMoveToPage)
		return () => {
			app.removeListener('max-shapes', handleMaxShapes)
			app.removeListener('move-to-page', handleMoveToPage)
		}
	}, [app, addToast])
}
