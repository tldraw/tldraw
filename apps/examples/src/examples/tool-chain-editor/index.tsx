import React from 'react'
import { createRoot } from 'react-dom/client'
import ToolChainEditor from './ToolChainEditor'

const container = document.getElementById('root')
const root = createRoot(container!)

root.render(
	<React.StrictMode>
		<div
			style={{
				position: 'relative',
				width: '100vw',
				height: '100vh',
				background: '#f4f4f4',
				display: 'flex',
				flexDirection: 'column',
				padding: '20px',
			}}
		>
			{/* Header with version info */}
			<div
				style={{
					padding: 24,
					borderBottom: '1px solid #e0e0e0',
					background: '#f8f9fa',
					marginBottom: 20,
				}}
			>
				<h1
					style={{
						margin: '0 0 8px 0',
						fontSize: 28,
						fontWeight: 'bold',
						color: '#333',
					}}
				>
					🔗 Tool Chain Editor (Original Version)
				</h1>
				<p
					style={{
						margin: '0 0 16px 0',
						color: '#666',
						fontSize: 16,
					}}
				>
					Basic workflow editor with drag-and-drop tool connections
				</p>

				{/* Version comparison */}
				<div
					style={{
						display: 'flex',
						gap: 12,
						flexWrap: 'wrap',
						marginBottom: 16,
					}}
				>
					<div
						style={{
							padding: '8px 16px',
							background: '#e3f2fd',
							borderRadius: 6,
							fontSize: 14,
							border: '2px solid #1976d2',
						}}
					>
						📋 <strong>Original Version</strong> - Basic functionality
					</div>
					<div
						style={{
							padding: '8px 16px',
							background: '#fff3cd',
							borderRadius: 6,
							fontSize: 14,
							border: '2px solid #ffc107',
						}}
					>
						🚀 <strong>Advanced Version</strong> - Enhanced with toolset management
					</div>
				</div>

				{/* Info about advanced version */}
				<div
					style={{
						padding: 16,
						background: '#fff3cd',
						border: '1px solid #ffc107',
						borderRadius: 8,
						marginBottom: 16,
					}}
				>
					<h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#856404' }}>
						💡 Want more features?
					</h3>
					<p
						style={{
							margin: '0 0 12px 0',
							fontSize: 14,
							color: '#856404',
							lineHeight: 1.4,
						}}
					>
						Check out the <strong>Advanced Version</strong> which includes:
					</p>
					<ul
						style={{
							margin: '0 0 12px 0',
							paddingLeft: 20,
							fontSize: 14,
							color: '#856404',
							lineHeight: 1.4,
						}}
					>
						<li>📦 Toolset management with categories</li>
						<li>🔍 Advanced search and filtering</li>
						<li>📥 Dynamic loading from backend</li>
						<li>📊 Detailed statistics and metadata</li>
						<li>🎨 Enhanced UI with better visual feedback</li>
					</ul>
					<div style={{ fontSize: 14, color: '#856404' }}>
						<strong>Location:</strong> <code>tool-chain-editor-advanced/</code>
					</div>
				</div>
			</div>

			{/* Original Tool Chain Editor */}
			<div style={{ flex: 1, minHeight: 0 }}>
				<ToolChainEditor />
			</div>
		</div>
	</React.StrictMode>
)
