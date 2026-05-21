'use client'

import dynamic from 'next/dynamic'
import 'tldraw/tldraw.css'
import { Editor } from 'tldraw'
import { Instructions } from '@/components/Instructions'
import { MakeRealButton } from '@/components/MakeRealButton'
import { MakeRealOverlay } from '@/components/MakeRealOverlay'
import { PreviewShapeUtil } from '@/components/PreviewShape'
import { cleanupStaleMakeReal } from '@/lib/makeReal'

const Tldraw = dynamic(async () => (await import('tldraw')).Tldraw, {
	ssr: false,
})

const shapeUtils = [PreviewShapeUtil]

const components = {
	InFrontOfTheCanvas: MakeRealOverlay,
}

function handleMount(editor: Editor) {
	cleanupStaleMakeReal(editor)
}

export default function Home() {
	return (
		<div className="editor">
			<Tldraw
				persistenceKey="make-real"
				components={components}
				shapeUtils={shapeUtils}
				onMount={handleMount}
			>
				<Instructions />
				<MakeRealButton />
			</Tldraw>
		</div>
	)
}
