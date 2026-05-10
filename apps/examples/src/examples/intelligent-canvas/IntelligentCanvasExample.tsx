import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Editor, TLComponents, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { AgentStatus, IntelligentCanvasAgent } from './agent/IntelligentCanvasAgent'
import { CompositionProvider } from './composition/CompositionContext'
import { CompositionOverlay } from './composition/CompositionOverlay'
import { CompositionPanel } from './composition/CompositionPanel'
import { TierBordersOverlay } from './composition/TierBordersOverlay'
import './intelligent-canvas.css'
import { USE_GEMINI_LIVE } from './lib/constants'
import { CodeShapeUtil } from './shapes/CodeShapeUtil'
import { AgentStatusIndicator } from './ui/AgentStatusIndicator'
import { MicrophoneButton } from './ui/MicrophoneButton'
import { LiveVoiceController } from './voice/LiveVoiceController'

type CanvasMode = 'assistant' | 'composition'

interface AgentState {
	mode: CanvasMode
	setMode: (mode: CanvasMode) => void
	agentStatus: AgentStatus
	agentMessage?: string
	agentRef: React.MutableRefObject<IntelligentCanvasAgent | null>
	agentAvailable: boolean
}

const AgentContext = createContext<AgentState>({
	mode: 'assistant',
	setMode: () => {},
	agentStatus: 'idle',
	agentMessage: undefined,
	agentRef: { current: null },
	agentAvailable: false,
})

function InFrontOfTheCanvasContent() {
	const { mode, setMode, agentStatus, agentMessage, agentRef, agentAvailable } =
		useContext(AgentContext)
	const [recording, setRecording] = useState(false)

	const handleTranscript = useCallback(
		(text: string) => {
			agentRef.current?.handleVoiceCommand(text)
		},
		[agentRef]
	)

	return (
		<>
			<div className="ic-mode-toggle">
				<button
					className={`ic-mode-button ${mode === 'assistant' ? 'active' : ''}`}
					onClick={() => setMode('assistant')}
				>
					Assistant mode
				</button>
				<button
					className={`ic-mode-button ${mode === 'composition' ? 'active' : ''}`}
					onClick={() => setMode('composition')}
				>
					Composition mode
				</button>
			</div>

			{mode === 'assistant' ? (
				<>
					<KeyboardHandler />
					{USE_GEMINI_LIVE ? (
						<LiveVoiceController
							agentRef={agentRef}
							disabled={!agentAvailable}
							onRecordingChange={setRecording}
						/>
					) : (
						<MicrophoneButton
							onTranscript={handleTranscript}
							disabled={agentStatus === 'thinking' || !agentAvailable}
							onRecordingChange={setRecording}
						/>
					)}
					<AgentStatusIndicator status={agentStatus} message={agentMessage} recording={recording} />
				</>
			) : (
				<>
					<CompositionPanel />
					<CompositionOverlay />
				</>
			)}
		</>
	)
}

function OnTheCanvasContent() {
	const { mode } = useContext(AgentContext)
	if (mode !== 'composition') return null
	return <TierBordersOverlay />
}

const shapeUtils = [CodeShapeUtil]

const components: TLComponents = {
	InFrontOfTheCanvas: InFrontOfTheCanvasContent,
	OnTheCanvas: OnTheCanvasContent,
}

function KeyboardHandler() {
	const editor = useEditor()

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			// Enter without Shift confirms text editing
			if (e.key === 'Enter' && !e.shiftKey && editor.getEditingShapeId()) {
				e.preventDefault()
				editor.complete()
				return
			}
		},
		[editor]
	)

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown, true)
		return () => window.removeEventListener('keydown', handleKeyDown, true)
	}, [handleKeyDown])

	return null
}

export default function IntelligentCanvasExample() {
	const [mode, setMode] = useState<CanvasMode>('assistant')
	const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle')
	const [agentMessage, setAgentMessage] = useState<string | undefined>()
	const [agentAvailable, setAgentAvailable] = useState(false)
	const agentRef = useRef<IntelligentCanvasAgent | null>(null)

	useEffect(() => {
		fetch('/api/gemini/status')
			.then((r) => r.json())
			.then((data: { available: boolean }) => setAgentAvailable(data.available))
			.catch(() => setAgentAvailable(false))
	}, [])

	const handleMount = useCallback(
		(editor: Editor) => {
			const agent = new IntelligentCanvasAgent(editor, {
				onStatusChange: (status, message) => {
					setAgentStatus(status)
					setAgentMessage(message)
				},
			})
			agentRef.current = agent
			agent.start()

			return () => {
				agent.stop()
				agentRef.current = null
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	)

	useEffect(() => {
		const agent = agentRef.current
		if (!agent) return
		if (mode === 'assistant') {
			agent.start()
		} else {
			agent.stop()
			setAgentStatus('idle')
			setAgentMessage(undefined)
		}
	}, [mode])

	return (
		<AgentContext.Provider
			value={{ mode, setMode, agentStatus, agentMessage, agentRef, agentAvailable }}
		>
			<CompositionProvider agentAvailable={agentAvailable}>
				<div className="tldraw__editor intelligent-canvas">
					<Tldraw
						persistenceKey="intelligent-canvas"
						shapeUtils={shapeUtils}
						components={components}
						onMount={handleMount}
					/>
				</div>
			</CompositionProvider>
		</AgentContext.Provider>
	)
}
