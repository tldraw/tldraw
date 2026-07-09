import { useState } from 'react'
import { Editor, TLComponents, Tldraw, TldrawOptions } from 'tldraw'
import { ThreeBackground } from './background/ThreeBackground'
import { CenterPanel } from './components/CenterPanel'
import { GenerationPanel } from './components/GenerationPanel'
import { SketchToolbar } from './components/SketchToolbar'
import { PoseChannelProvider } from './pose/PoseChannel'
import { usePoseDebug } from './pose/usePoseDebug'
import { useRealtimeGeneration } from './realtime/useRealtimeGeneration'

const components: TLComponents = {
	Background: ThreeBackground,
	Toolbar: SketchToolbar,
	SharePanel: CenterPanel,
}

const options: Partial<TldrawOptions> = {
	maxPages: 1,
}

function App() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const {
		resultUrl,
		status,
		error,
		controls,
		setControls,
		isPaused,
		setPaused,
		promptIsAuto,
		resetPromptToAuto,
	} = useRealtimeGeneration(editor)
	const poseDebug = usePoseDebug(editor, resultUrl)

	return (
		<div className="sketch-layout">
			<div className="sketch-canvas">
				{/* Feed the live pose to the three.js figure (rendered as the Background). */}
				<PoseChannelProvider pose={poseDebug.pose}>
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
				</PoseChannelProvider>
			</div>
			<div className="sketch-sidebar">
				<GenerationPanel
					resultUrl={resultUrl}
					status={status}
					error={error}
					controls={controls}
					setControls={setControls}
					isPaused={isPaused}
					setPaused={setPaused}
					promptIsAuto={promptIsAuto}
					resetPromptToAuto={resetPromptToAuto}
					poseDebug={poseDebug}
				/>
			</div>
		</div>
	)
}

export default App
