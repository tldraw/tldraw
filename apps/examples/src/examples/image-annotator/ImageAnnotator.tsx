import { useState } from 'react'
import { ImageAnnotationEditor } from './ImageAnnotationEditor'
import { ImageExport } from './ImageExport'
import { ImagePicker } from './ImagePicker'
import './image-annotator.css'
import { AnnotatorImage } from './types'

type State =
	| {
			phase: 'pick'
	  }
	| {
			phase: 'annotate'
			id: string
			image: AnnotatorImage
	  }
	| {
			phase: 'export'
			result: Blob
	  }

export default function ImageAnnotatorWrapper() {
	const [state, setState] = useState<State>({ phase: 'pick' })

	switch (state.phase) {
		case 'pick':
			return (
				<div className="ImageAnnotator">
					<ImagePicker
						onChooseImage={(image) =>
							setState({ phase: 'annotate', image, id: Math.random().toString(36) })
						}
					/>
				</div>
			)
		case 'annotate':
			return (
				<div className="ImageAnnotator">
					<ImageAnnotationEditor
						// remount tldraw if the image/id changes:
						key={state.id}
						image={state.image}
						onDone={(result) => setState({ phase: 'export', result })}
					/>
				</div>
			)
		case 'export':
			return (
				<div className="ImageAnnotator">
					<ImageExport result={state.result} onStartAgain={() => setState({ phase: 'pick' })} />
				</div>
			)
	}
}
