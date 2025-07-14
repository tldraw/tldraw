import { useState } from 'react'
import BasicExample from './BasicExample'
// import ToolChainEditor from '../tool-chain-editor/ToolChainEditor'
import EnhancedToolChainEditorExample from '../tool-chain-editor-advanced/enhanced-example'

export default function BasicWithToolChainEditor() {
	const [showToolChainEditor, setShowToolChainEditor] = useState(false)

	return (
		<div
			style={{
				position: 'relative',
				width: '100%',
				height: '100%',
				background: '#f4f4f4',
				overflow: 'hidden',
			}}
		>
			{/* 只在未进入 ToolChainEditor 时渲染 BasicExample 和按钮 */}
			{!showToolChainEditor && (
				<>
					<BasicExample />
					<button
						onClick={() => setShowToolChainEditor(true)}
						style={{
							position: 'fixed',
							top: 32,
							left: '50%',
							transform: 'translateX(-50%)',
							zIndex: 1001,
							padding: '10px 20px',
							background: '#007bff',
							color: 'white',
							border: 'none',
							borderRadius: 12,
							cursor: 'pointer',
							fontSize: 16,
							fontWeight: 'bold',
							boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
						}}
					>
						🚀 Enter Tool Chain Editor
					</button>
				</>
			)}

			{/* ToolChainEditor Full Screen Mode*/}
			{showToolChainEditor && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						background: '#fff',
						zIndex: 2000,
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<div style={{ position: 'absolute', bottom: 24, right: 32, zIndex: 2001 }}>
						<button
							onClick={() => setShowToolChainEditor(false)}
							style={{
								padding: '12px 20px',
								background: '#dc3545',
								color: 'white',
								border: 'none',
								borderRadius: 8,
								cursor: 'pointer',
								fontSize: 16,
								fontWeight: 'bold',
								boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
							}}
						>
							← Back to Canvas
						</button>
					</div>
					<div style={{ flex: 1, minHeight: 0 }}>
						{/* <ToolChainEditor /> */}
						<EnhancedToolChainEditorExample />
					</div>
				</div>
			)}
		</div>
	)
}
