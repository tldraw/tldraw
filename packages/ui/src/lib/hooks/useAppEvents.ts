import { useApp } from '@tldraw/editor'
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

		app.addListener('max-shapes', handleMaxShapes)
		return () => {
			app.removeListener('max-shapes', handleMaxShapes)
		}
	}, [app, addToast])
}
