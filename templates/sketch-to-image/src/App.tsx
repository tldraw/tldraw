import { useState } from 'react'
import { Editor, TLComponents, Tldraw, TldrawOptions } from 'tldraw'
import { GenerationPanel } from './components/GenerationPanel'
import { SketchToolbar } from './components/SketchToolbar'
import { useRealtimeGeneration } from './realtime/useRealtimeGeneration'

const components: TLComponents = {
	Toolbar: SketchToolbar,
}

const options: Partial<TldrawOptions> = {
	maxPages: 1,
}

function App() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const { resultUrl, status, error, controls, setControls } = useRealtimeGeneration(editor)

	return (
		<div className="sketch-layout">
			<div className="sketch-canvas">
				<Tldraw
					persistenceKey="sketch-to-image"
					options={options}
					components={components}
					onMount={(editor) => {
						;(window as any).editor = editor
						setEditor(editor)
						// Start on the draw tool — this template is about sketching.
						editor.setCurrentTool('draw')
					}}
				/>
			</div>
			<div className="sketch-sidebar">
				<GenerationPanel
					resultUrl={resultUrl}
					status={status}
					error={error}
					controls={controls}
					setControls={setControls}
				/>
			</div>
		</div>
	)
}

export default App
