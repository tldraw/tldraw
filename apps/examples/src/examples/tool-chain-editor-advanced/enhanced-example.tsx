import { useEffect, useState } from 'react'
import ChatbotToolchainParser from './chatbot-toolchain-parser'
import EnhancedToolChainEditor from './enhanced-tool-chain-editor'
import { EnhancedToolRegistry, defaultToolSets } from './enhanced-tool-registry'

// ==================== Enhanced Example Component ====================

export default function EnhancedToolChainEditorExample() {
	const [toolSets, setToolSets] = useState(defaultToolSets)
	const [workflow, setWorkflow] = useState<any>(null)
	const [results, setResults] = useState<Record<string, any>>({})
	const [loading, setLoading] = useState(false)
	const [statistics, setStatistics] = useState<any>(null)
	const [showToolSets, setShowToolSets] = useState(false)
	const [showWorkflowInfo, setShowWorkflowInfo] = useState(false)
	const [showChatbot, setShowChatbot] = useState(false)
	const [generatedNodes, setGeneratedNodes] = useState<any[]>([])
	const [generatedEdges, setGeneratedEdges] = useState<any[]>([])

	// Initialize tool registry
	const [toolRegistry] = useState(() => new EnhancedToolRegistry(toolSets))

	// Update statistics
	useEffect(() => {
		setStatistics(toolRegistry.getStatistics())
	}, [toolRegistry])

	// Handle workflow change
	const handleWorkflowChange = (newWorkflow: any) => {
		setWorkflow(newWorkflow)
		console.log('Workflow updated:', newWorkflow)
	}

	// Handle tool set load
	const handleToolSetLoad = (toolSetId: string) => {
		console.log(`ToolSet ${toolSetId} loaded successfully`)
		// Update statistics
		setStatistics(toolRegistry.getStatistics())
	}

	// Load tool sets from backend
	const loadToolSetsFromBackend = async () => {
		setLoading(true)
		try {
			const response = await fetch('/api/toolsets')
			if (response.ok) {
				const data = await response.json()
				if (data.success) {
					// Register new tool sets
					data.toolsets.forEach((toolSet: any) => {
						toolRegistry.registerToolSet(toolSet)
					})
					setToolSets(toolRegistry.getAllToolSets())
					setStatistics(toolRegistry.getStatistics())
					console.log('ToolSets loaded from backend:', data.toolsets)
				}
			}
		} catch (error) {
			console.error('Failed to load toolsets from backend:', error)
		} finally {
			setLoading(false)
		}
	}

	// Save workflow to backend
	const saveWorkflowToBackend = async () => {
		if (!workflow) {
			alert('No workflow to save')
			return
		}

		try {
			const response = await fetch('/api/workflows', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(workflow),
			})

			if (response.ok) {
				const data = await response.json()
				if (data.success) {
					alert(`Workflow saved successfully! ID: ${data.workflowId}`)
				}
			}
		} catch (error) {
			console.error('Failed to save workflow:', error)
			alert('Failed to save workflow')
		}
	}

	// Execute workflow
	const executeWorkflow = async () => {
		if (!workflow) {
			alert('No workflow to execute')
			return
		}

		setLoading(true)
		try {
			// Simulate workflow execution
			await new Promise((resolve) => setTimeout(resolve, 2000))
			alert('Workflow executed successfully!')
		} catch (error) {
			console.error('Failed to execute workflow:', error)
			alert('Failed to execute workflow')
		} finally {
			setLoading(false)
		}
	}

	// Handle toolchain generation
	const handleGenerateToolchain = (nodes: any[], edges: any[]) => {
		setGeneratedNodes(nodes)
		setGeneratedEdges(edges)
		console.log('Generated toolchain:', { nodes, edges })
	}

	// Reset workflow
	const resetWorkflow = () => {
		setWorkflow(null)
		setResults({})
		setGeneratedNodes([])
		setGeneratedEdges([])
	}

	return (
		<div className="tldraw__editor">
			{/* Floating Control Panel */}
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
					minWidth: 200,
				}}
			>
				<div style={{ marginBottom: 12 }}>
					<h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 'bold' }}>
						🚀 Enhanced Tool Chain Editor
					</h3>
					{statistics && (
						<div style={{ fontSize: 11, color: '#666' }}>
							📦 {statistics.totalToolSets} Sets • 🛠️ {statistics.totalTools} Tools • 📂{' '}
							{statistics.categories} Categories
						</div>
					)}
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<button
						onClick={() => setShowChatbot(true)}
						style={{
							padding: '8px 12px',
							background: '#6f42c1',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: 'pointer',
							fontSize: 12,
							fontWeight: '500',
						}}
					>
						🤖 AI Generator
					</button>

					<button
						onClick={() => setShowToolSets(!showToolSets)}
						style={{
							padding: '8px 12px',
							background: showToolSets ? '#007bff' : '#f8f9fa',
							color: showToolSets ? 'white' : '#333',
							border: '1px solid #dee2e6',
							borderRadius: 4,
							cursor: 'pointer',
							fontSize: 12,
							fontWeight: '500',
						}}
					>
						📋 Tool Sets
					</button>

					{workflow && (
						<button
							onClick={() => setShowWorkflowInfo(!showWorkflowInfo)}
							style={{
								padding: '8px 12px',
								background: showWorkflowInfo ? '#28a745' : '#f8f9fa',
								color: showWorkflowInfo ? 'white' : '#333',
								border: '1px solid #dee2e6',
								borderRadius: 4,
								cursor: 'pointer',
								fontSize: 12,
								fontWeight: '500',
							}}
						>
							🔗 Workflow
						</button>
					)}

					<div style={{ display: 'flex', gap: 4 }}>
						<button
							onClick={loadToolSetsFromBackend}
							disabled={loading}
							title="Load ToolSets"
							style={{
								padding: '6px 8px',
								background: loading ? '#ccc' : '#6c757d',
								color: 'white',
								border: 'none',
								borderRadius: 4,
								cursor: loading ? 'not-allowed' : 'pointer',
								fontSize: 11,
							}}
						>
							{loading ? '⏳' : '📥'}
						</button>

						<button
							onClick={saveWorkflowToBackend}
							disabled={!workflow}
							title="Save Workflow"
							style={{
								padding: '6px 8px',
								background: !workflow ? '#ccc' : '#28a745',
								color: 'white',
								border: 'none',
								borderRadius: 4,
								cursor: !workflow ? 'not-allowed' : 'pointer',
								fontSize: 11,
							}}
						>
							💾
						</button>

						<button
							onClick={executeWorkflow}
							disabled={!workflow || loading}
							title="Run Workflow"
							style={{
								padding: '6px 8px',
								background: !workflow || loading ? '#ccc' : '#ffc107',
								color: 'white',
								border: 'none',
								borderRadius: 4,
								cursor: !workflow || loading ? 'not-allowed' : 'pointer',
								fontSize: 11,
							}}
						>
							{loading ? '⏳' : '▶️'}
						</button>

						<button
							onClick={resetWorkflow}
							disabled={!workflow}
							title="Reset Workflow"
							style={{
								padding: '6px 8px',
								background: !workflow ? '#ccc' : '#dc3545',
								color: 'white',
								border: 'none',
								borderRadius: 4,
								cursor: !workflow ? 'not-allowed' : 'pointer',
								fontSize: 11,
							}}
						>
							🔄
						</button>
					</div>
				</div>
			</div>

			{/* Floating Tool Sets Info */}
			{showToolSets && (
				<div
					style={{
						position: 'absolute',
						top: 20,
						left: 20,
						zIndex: 1000,
						background: 'rgba(255, 255, 255, 0.95)',
						border: '1px solid #e0e0e0',
						borderRadius: 8,
						padding: 16,
						boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
						backdropFilter: 'blur(10px)',
						maxWidth: 300,
						maxHeight: 400,
						overflow: 'auto',
					}}
				>
					<h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 'bold' }}>
						📋 Available Tool Sets
					</h3>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{toolSets.map((toolSet) => (
							<div
								key={toolSet.id}
								style={{
									padding: '8px 12px',
									background: '#f8f9fa',
									border: '1px solid #e9ecef',
									borderRadius: 4,
									fontSize: 11,
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
									<span style={{ fontSize: 14 }}>{toolSet.icon}</span>
									<strong style={{ fontSize: 12 }}>{toolSet.name}</strong>
								</div>
								<p
									style={{
										margin: '0 0 4px 0',
										fontSize: 10,
										color: '#666',
										lineHeight: 1.2,
									}}
								>
									{toolSet.description}
								</p>
								<div style={{ fontSize: 9, color: '#888' }}>
									📂 {toolSet.category} • 🛠️ {toolSet.tools.length} tools
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Floating Workflow Info */}
			{showWorkflowInfo && workflow && (
				<div
					style={{
						position: 'absolute',
						bottom: 20,
						left: 20,
						zIndex: 1000,
						background: 'rgba(255, 255, 255, 0.95)',
						border: '1px solid #e0e0e0',
						borderRadius: 8,
						padding: 16,
						boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
						backdropFilter: 'blur(10px)',
					}}
				>
					<h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 'bold' }}>
						🔗 Current Workflow
					</h3>
					<div style={{ fontSize: 11, color: '#666', display: 'flex', gap: 20 }}>
						<div>📊 Nodes: {workflow.nodes.length}</div>
						<div>🔗 Connections: {workflow.edges.length}</div>
						<div>🛠️ Tools used: {workflow.nodes.filter((n: any) => n.data.tool).length}</div>
					</div>
				</div>
			)}

			{/* Main Tool Chain Editor - Full Screen */}
			<EnhancedToolChainEditor
				toolSets={toolSets}
				onWorkflowChange={handleWorkflowChange}
				onToolSetLoad={handleToolSetLoad}
				generatedNodes={generatedNodes}
				generatedEdges={generatedEdges}
			/>

			{/* Chatbot Toolchain Parser */}
			{showChatbot && (
				<ChatbotToolchainParser
					onGenerateToolchain={handleGenerateToolchain}
					onClose={() => setShowChatbot(false)}
				/>
			)}
		</div>
	)
}
