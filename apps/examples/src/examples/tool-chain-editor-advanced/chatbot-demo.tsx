// ==================== Chatbot Demo Component ====================

export default function ChatbotDemo() {
	return (
		<div
			style={{
				padding: 20,
				maxWidth: 800,
				margin: '0 auto',
				fontFamily: 'Arial, sans-serif',
			}}
		>
			<h1 style={{ color: '#333', textAlign: 'center', marginBottom: 30 }}>
				🤖 AI Tool Chain Generator Demo
			</h1>

			<div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 20 }}>
				<h2 style={{ color: '#007bff', marginBottom: 15 }}>How it works:</h2>
				<ol style={{ lineHeight: 1.6 }}>
					<li>
						<strong>Click the "🤖 AI Generator" button</strong> in the toolbar
					</li>
					<li>
						<strong>Describe your workflow</strong> in natural language
					</li>
					<li>
						<strong>AI analyzes your input</strong> and generates a tool chain
					</li>
					<li>
						<strong>Tool chain appears</strong> with connected nodes and edges
					</li>
				</ol>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
					gap: 20,
				}}
			>
				{/* Example 1 */}
				<div
					style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e0e0e0' }}
				>
					<h3 style={{ color: '#28a745', marginBottom: 10 }}>📝 Text Analysis</h3>
					<p style={{ color: '#666', marginBottom: 15 }}>
						<strong>Input:</strong> "Analyze text sentiment and extract keywords"
					</p>
					<div style={{ background: '#f8f9fa', padding: 10, borderRadius: 4, fontSize: 12 }}>
						<strong>Generated:</strong> Input → Text Analyzer → Sentiment Analyzer → Output
					</div>
				</div>

				{/* Example 2 */}
				<div
					style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e0e0e0' }}
				>
					<h3 style={{ color: '#007bff', marginBottom: 10 }}>🌐 Translation</h3>
					<p style={{ color: '#666', marginBottom: 15 }}>
						<strong>Input:</strong> "Translate text from English to Chinese"
					</p>
					<div style={{ background: '#f8f9fa', padding: 10, borderRadius: 4, fontSize: 12 }}>
						<strong>Generated:</strong> Input → Text Translator → Output
					</div>
				</div>

				{/* Example 3 */}
				<div
					style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e0e0e0' }}
				>
					<h3 style={{ color: '#ffc107', marginBottom: 10 }}>📊 Data Processing</h3>
					<p style={{ color: '#666', marginBottom: 15 }}>
						<strong>Input:</strong> "Format JSON data and transform it"
					</p>
					<div style={{ background: '#f8f9fa', padding: 10, borderRadius: 4, fontSize: 12 }}>
						<strong>Generated:</strong> Input → JSON Formatter → Data Transformer → Output
					</div>
				</div>

				{/* Example 4 */}
				<div
					style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e0e0e0' }}
				>
					<h3 style={{ color: '#6f42c1', marginBottom: 10 }}>🤖 AI Integration</h3>
					<p style={{ color: '#666', marginBottom: 15 }}>
						<strong>Input:</strong> "Process text through AI agent for analysis"
					</p>
					<div style={{ background: '#f8f9fa', padding: 10, borderRadius: 4, fontSize: 12 }}>
						<strong>Generated:</strong> Input → DeepSeek AI Agent → Output
					</div>
				</div>
			</div>

			<div style={{ background: '#e8f5e8', padding: 20, borderRadius: 8, marginTop: 20 }}>
				<h3 style={{ color: '#2e7d32', marginBottom: 10 }}>✨ Features:</h3>
				<ul style={{ lineHeight: 1.6, color: '#2e7d32' }}>
					<li>Natural language input processing</li>
					<li>Automatic tool chain generation</li>
					<li>Smart node positioning and connections</li>
					<li>Integration with existing tool registry</li>
					<li>Real-time workflow updates</li>
				</ul>
			</div>

			<div style={{ background: '#fff3cd', padding: 20, borderRadius: 8, marginTop: 20 }}>
				<h3 style={{ color: '#856404', marginBottom: 10 }}>💡 Tips:</h3>
				<ul style={{ lineHeight: 1.6, color: '#856404' }}>
					<li>Be specific about the workflow steps you want</li>
					<li>Mention the type of data processing needed</li>
					<li>Include any specific tools or operations</li>
					<li>Use Ctrl+Enter for quick generation</li>
					<li>Try the suggested examples to get started</li>
				</ul>
			</div>
		</div>
	)
}
