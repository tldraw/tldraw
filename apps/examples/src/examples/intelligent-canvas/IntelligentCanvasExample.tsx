import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { TLComponents, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { AgentStatus, IntelligentCanvasAgent } from './agent/IntelligentCanvasAgent'
import './intelligent-canvas.css'
import { AgentStatusIndicator } from './ui/AgentStatusIndicator'
import { MicrophoneButton } from './ui/MicrophoneButton'

interface AgentState {
	agentStatus: AgentStatus
	agentMessage?: string
	agentRef: React.MutableRefObject<IntelligentCanvasAgent | null>
	agentAvailable: boolean
}

const AgentContext = createContext<AgentState>({
	agentStatus: 'idle',
	agentMessage: undefined,
	agentRef: { current: null },
	agentAvailable: false,
})

function InFrontOfTheCanvasContent() {
	const { agentStatus, agentMessage, agentRef, agentAvailable } = useContext(AgentContext)
	const [recording, setRecording] = useState(false)

	const handleTranscript = useCallback(
		(text: string) => {
			agentRef.current?.handleVoiceCommand(text)
		},
		[agentRef]
	)

	return (
		<>
			<KeyboardHandler />
			<MicrophoneButton
				onTranscript={handleTranscript}
				disabled={agentStatus === 'thinking' || !agentAvailable}
				onRecordingChange={setRecording}
			/>
			<AgentStatusIndicator status={agentStatus} message={agentMessage} recording={recording} />
		</>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: InFrontOfTheCanvasContent,
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
		(editor: import('tldraw').Editor) => {
			// Start the agent
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

	return (
		<AgentContext.Provider value={{ agentStatus, agentMessage, agentRef, agentAvailable }}>
			<div className="tldraw__editor intelligent-canvas">
				<Tldraw components={components} onMount={handleMount} />
			</div>
		</AgentContext.Provider>
	)
}
