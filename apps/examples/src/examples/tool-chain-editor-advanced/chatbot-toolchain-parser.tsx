import { useState } from 'react'
import { Edge, Node } from 'react-flow-renderer'

// ==================== Chatbot Toolchain Parser Component ====================

interface ChatbotToolchainParserProps {
	onGenerateToolchain: (nodes: Node[], edges: Edge[]) => void
	onClose: () => void
}

export default function ChatbotToolchainParser({
	onGenerateToolchain,
	onClose,
}: ChatbotToolchainParserProps) {
	const [input, setInput] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [suggestions] = useState([
		'Analyze text sentiment and extract keywords',
		'Translate text from English to Chinese',
		'Format JSON data and transform it',
		'Process text through AI agent for analysis',
		'Create a data processing pipeline',
	])

	const handleSubmit = async () => {
		if (!input.trim()) return

		setIsLoading(true)
		try {
			const response = await fetch('/api/parse-toolchain', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ input: input.trim() }),
			})

			if (response.ok) {
				const data = await response.json()
				if (data.success) {
					const { nodes, edges } = data.result.toolchain

					// Convert the parsed toolchain to React Flow format
					const reactFlowNodes: Node[] = nodes.map((node: any) => ({
						id: node.id,
						type: node.type,
						position: node.position,
						data: {
							...node.data,
							onDeleteNode: () => {}, // Will be set by parent component
							onChange: () => {}, // Will be set by parent component
							onSubmit: () => {}, // Will be set by parent component
						},
					}))

					const reactFlowEdges: Edge[] = edges.map((edge: any) => ({
						id: edge.id,
						source: edge.source,
						target: edge.target,
						type: 'default',
					}))

					onGenerateToolchain(reactFlowNodes, reactFlowEdges)
					onClose()
				} else {
					alert('Failed to parse toolchain: ' + data.error)
				}
			} else {
				alert('Failed to connect to backend')
			}
		} catch (error) {
			console.error('Error parsing toolchain:', error)
			alert('Error parsing toolchain')
		} finally {
			setIsLoading(false)
		}
	}

	const handleSuggestionClick = (suggestion: string) => {
		setInput(suggestion)
	}

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.5)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000,
			}}
		>
			<div
				style={{
					background: 'white',
					borderRadius: 12,
					padding: 24,
					width: '90%',
					maxWidth: 600,
					maxHeight: '80vh',
					overflow: 'auto',
					boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
				}}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: 20,
					}}
				>
					<div>
						<h2 style={{ margin: 0, fontSize: 24, fontWeight: 'bold', color: '#333' }}>
							🤖 AI Tool Chain Generator
						</h2>
						<p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 14 }}>
							Describe your workflow and let AI generate the tool chain
						</p>
					</div>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							fontSize: 24,
							cursor: 'pointer',
							color: '#999',
							padding: 4,
						}}
					>
						×
					</button>
				</div>

				{/* Input Section */}
				<div style={{ marginBottom: 20 }}>
					<label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#333' }}>
						Describe your workflow:
					</label>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="e.g., Analyze text sentiment, extract keywords, and format the results as JSON..."
						style={{
							width: '100%',
							minHeight: 120,
							padding: 12,
							border: '2px solid #e0e0e0',
							borderRadius: 8,
							fontSize: 14,
							fontFamily: 'inherit',
							resize: 'vertical',
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && e.ctrlKey) {
								handleSubmit()
							}
						}}
					/>
				</div>

				{/* Suggestions */}
				<div style={{ marginBottom: 20 }}>
					<h4 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#333' }}>
						💡 Quick Suggestions:
					</h4>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
						{suggestions.map((suggestion, index) => (
							<button
								key={index}
								onClick={() => handleSuggestionClick(suggestion)}
								style={{
									padding: '8px 12px',
									background: '#f8f9fa',
									border: '1px solid #e0e0e0',
									borderRadius: 20,
									cursor: 'pointer',
									fontSize: 12,
									color: '#666',
									transition: 'all 0.2s',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = '#e9ecef'
									e.currentTarget.style.borderColor = '#007bff'
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = '#f8f9fa'
									e.currentTarget.style.borderColor = '#e0e0e0'
								}}
							>
								{suggestion}
							</button>
						))}
					</div>
				</div>

				{/* Features */}
				<div style={{ marginBottom: 24 }}>
					<h4 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#333' }}>
						✨ What AI can generate:
					</h4>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
							gap: 12,
						}}
					>
						<div style={{ padding: 12, background: '#e8f5e8', borderRadius: 8, fontSize: 12 }}>
							<strong>📝 Text Processing</strong>
							<br />
							Text analysis, sentiment detection, keyword extraction
						</div>
						<div style={{ padding: 12, background: '#e3f2fd', borderRadius: 8, fontSize: 12 }}>
							<strong>🌐 Translation</strong>
							<br />
							Multi-language text translation workflows
						</div>
						<div style={{ padding: 12, background: '#fff3cd', borderRadius: 8, fontSize: 12 }}>
							<strong>📊 Data Processing</strong>
							<br />
							JSON formatting, data transformation, validation
						</div>
						<div style={{ padding: 12, background: '#fce4ec', borderRadius: 8, fontSize: 12 }}>
							<strong>🤖 AI Integration</strong>
							<br />
							DeepSeek AI agent integration and processing
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
					<button
						onClick={onClose}
						style={{
							padding: '10px 20px',
							background: '#f8f9fa',
							border: '1px solid #e0e0e0',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: 14,
							color: '#666',
						}}
					>
						Cancel
					</button>
					<button
						onClick={handleSubmit}
						disabled={!input.trim() || isLoading}
						style={{
							padding: '10px 20px',
							background: isLoading ? '#ccc' : '#007bff',
							border: 'none',
							borderRadius: 6,
							cursor: isLoading ? 'not-allowed' : 'pointer',
							fontSize: 14,
							color: 'white',
							display: 'flex',
							alignItems: 'center',
							gap: 8,
						}}
					>
						{isLoading ? (
							<>
								<div
									style={{
										width: 16,
										height: 16,
										border: '2px solid #fff',
										borderTop: '2px solid transparent',
										borderRadius: '50%',
										animation: 'spin 1s linear infinite',
									}}
								/>
								Generating...
							</>
						) : (
							<>🚀 Generate Tool Chain</>
						)}
					</button>
				</div>

				{/* Keyboard shortcut hint */}
				<div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: '#999' }}>
					💡 Press Ctrl+Enter to generate quickly
				</div>
			</div>

			{/* CSS for loading animation */}
			<style>
				{`
					@keyframes spin {
						0% { transform: rotate(0deg); }
						100% { transform: rotate(360deg); }
					}
				`}
			</style>
		</div>
	)
}
