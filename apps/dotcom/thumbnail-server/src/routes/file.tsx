import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TLEditorSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'
import { ThumbnailEditor } from '../components/ThumbnailEditor'

export function Component() {
	const { fileId } = useParams<{ fileId: string }>()

	const [snapshot, setSnapshot] = useState<TLEditorSnapshot | null>(null)

	useEffect(() => {
		console.log('posting snapshot')

		fetch(`http://localhost:5002/snapshot`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ fileId }),
		}).then(
			async (res) => {
				const data = await res.json()
				setSnapshot(JSON.parse(data.snapshot))
			},
			(err) => {
				console.error(err)
			}
		)
	}, [fileId])

	if (!snapshot) return null

	return <ThumbnailEditor snapshot={snapshot} />
}
