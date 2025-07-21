import ToolChainEditor from './ToolChainEditor'

export default function ToolChainEditorExample() {
	return (
		<div className="tldraw__editor">
			{/* Floating Header */}
			<div
				style={{
					position: 'absolute',
					top: 20,
					right: 20,
					zIndex: 1000,
					background: 'rgba(255, 255, 255, 0.95)',
					border: '1px solid #e0e0e0',
					borderRadius: 8,
					padding: 16,
					boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
					backdropFilter: 'blur(10px)',
					maxWidth: 400,
				}}
			>
				<h1
					style={{
						margin: '0 0 8px 0',
						fontSize: 20,
						fontWeight: 'bold',
						color: '#333',
					}}
				>
					🔗 Tool Chain Editor (Original Version)
				</h1>
				<p
					style={{
						margin: '0 0 12px 0',
						color: '#666',
						fontSize: 12,
						lineHeight: 1.4,
					}}
				>
					Basic workflow editor with drag-and-drop tool connections
				</p>

				{/* Version comparison */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 8,
						marginBottom: 12,
					}}
				>
					<div
						style={{
							padding: '6px 12px',
							background: '#e3f2fd',
							borderRadius: 4,
							fontSize: 11,
							border: '1px solid #1976d2',
						}}
					>
						📋 <strong>Original Version</strong> - Basic functionality
					</div>
					<div
						style={{
							padding: '6px 12px',
							background: '#fff3cd',
							borderRadius: 4,
							fontSize: 11,
							border: '1px solid #ffc107',
						}}
					>
						🚀 <strong>Advanced Version</strong> - Enhanced with toolset management
					</div>
				</div>

				{/* Info about advanced version */}
				<div
					style={{
						padding: 12,
						background: '#fff3cd',
						border: '1px solid #ffc107',
						borderRadius: 6,
						fontSize: 11,
					}}
				>
					<h3 style={{ margin: '0 0 6px 0', fontSize: 12, color: '#856404' }}>
						💡 Want more features?
					</h3>
					<p
						style={{
							margin: '0 0 8px 0',
							fontSize: 10,
							color: '#856404',
							lineHeight: 1.3,
						}}
					>
						Check out the <strong>Advanced Version</strong> which includes:
					</p>
					<ul
						style={{
							margin: '0 0 8px 0',
							paddingLeft: 16,
							fontSize: 10,
							color: '#856404',
							lineHeight: 1.3,
						}}
					>
						<li>📦 Toolset management with categories</li>
						<li>🔍 Advanced search and filtering</li>
						<li>📥 Dynamic loading from backend</li>
						<li>📊 Detailed statistics and metadata</li>
						<li>🎨 Enhanced UI with better visual feedback</li>
					</ul>
					<div style={{ fontSize: 10, color: '#856404' }}>
						<strong>Location:</strong> <code>tool-chain-editor-advanced/</code>
					</div>
				</div>
			</div>

			{/* Main Tool Chain Editor - Full Screen */}
			<ToolChainEditor />
		</div>
	)
}
