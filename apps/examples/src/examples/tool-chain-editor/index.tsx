import OnlyEditorExample from '../only-editor/OnlyEditorExample'
import ToolChainEditor from './ToolChainEditor'

export default function ToolChainEditorExample() {
	return (
		<div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#f4f4f4' }}>
			{/* 原有 canvas 生态 */}
			<OnlyEditorExample />
			{/* ToolChainEditor 作为主交互 overlay */}
			<div
				style={{
					position: 'absolute',
					top: 40,
					left: 40,
					right: 40,
					zIndex: 10,
					pointerEvents: 'auto',
					boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
					borderRadius: 12,
					background: 'rgba(255,255,255,0.95)',
					padding: 24,
					maxWidth: 1200,
					margin: '0 auto',
				}}
			>
				<h2 style={{ marginBottom: 16 }}>Tool Chain Editor (Demo)</h2>
				<ToolChainEditor />
			</div>
		</div>
	)
}
