import { useCallback } from 'react'
import { useEditor, useToasts } from 'tldraw'
import { makeReal } from '@/lib/makeReal'

export function MakeRealButton() {
	const editor = useEditor()
	const { addToast } = useToasts()

	const handleClick = useCallback(async () => {
		try {
			await makeReal(editor)
		} catch (e) {
			console.error(e)
			addToast({
				icon: 'info-circle',
				title: 'Something went wrong',
				description: (e as Error).message.slice(0, 200),
			})
		}
	}, [editor, addToast])

	return (
		<button className="makeRealButton" onClick={handleClick}>
			Make real
		</button>
	)
}
