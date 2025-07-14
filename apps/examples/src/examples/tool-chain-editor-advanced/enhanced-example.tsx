import { useEffect, useState } from 'react'
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
			// Workflow execution logic can be implemented here
			console.log('Executing workflow:', workflow)
			alert('Workflow execution completed!')
		} catch (error) {
			console.error('Workflow execution failed:', error)
			alert('Workflow execution failed')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div
			style={{
				position: 'relative',
				width: '100vw',
				height: '100vh',
				background: '#f8f9fa',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
			}}
		>
			{/* Compact Header */}
			<div
				style={{
					padding: '12px 20px',
					borderBottom: '1px solid #e0e0e0',
					background: '#fff',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					zIndex: 100,
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<div>
						<h1
							style={{
								margin: '0 0 4px 0',
								fontSize: 20,
								fontWeight: 'bold',
								color: '#333',
							}}
						>
							🚀 Enhanced Tool Chain Editor
						</h1>
						<p
							style={{
								margin: 0,
								color: '#666',
								fontSize: 12,
							}}
						>
							Advanced workflow editor with toolset management
						</p>
					</div>

					{/* Statistics */}
					{statistics && (
						<div
							style={{
								display: 'flex',
								gap: 12,
								marginRight: 20,
							}}
						>
							<div
								style={{
									padding: '4px 8px',
									background: '#e3f2fd',
									borderRadius: 4,
									fontSize: 11,
									color: '#1976d2',
								}}
							>
								📦 {statistics.totalToolSets} Sets
							</div>
							<div
								style={{
									padding: '4px 8px',
									background: '#e8f5e8',
									borderRadius: 4,
									fontSize: 11,
									color: '#2e7d32',
								}}
							>
								🛠️ {statistics.totalTools} Tools
							</div>
							<div
								style={{
									padding: '4px 8px',
									background: '#fff3cd',
									borderRadius: 4,
									fontSize: 11,
									color: '#856404',
								}}
							>
								📂 {statistics.categories} Categories
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div style={{ display: 'flex', gap: 8 }}>
						<button
							onClick={() => setShowToolSets(!showToolSets)}
							style={{
								padding: '6px 12px',
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
									padding: '6px 12px',
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

						<button
							onClick={loadToolSetsFromBackend}
							disabled={loading}
							title="Load ToolSets"
							style={{
								padding: '6px 12px',
								background: loading ? '#ccc' : '#6c757d',
								color: 'white',
								border: 'none',
								borderRadius: 4,
								cursor: loading ? 'not-allowed' : 'pointer',
								fontSize: 12,
								fontWeight: '500',
							}}
						>
							{loading ? '⏳' : '📥'}
						</button>

						<button
							onClick={saveWorkflowToBackend}
							disabled={!workflow}
							title="Save Workflow"
							style={{
								padding: '6px 12px',
								background: !workflow ? '#ccc' : '#28a745',
								color: 'white',
								border: 'none',
								borderRadius: 4,
								cursor: !workflow ? 'not-allowed' : 'pointer',
								fontSize: 12,
								fontWeight: '500',
							}}
						>
							💾
						</button>

						<button
							onClick={executeWorkflow}
							disabled={!workflow || loading}
							title="Run Workflow"
							style={{
								padding: '6px 12px',
								background: !workflow || loading ? '#ccc' : '#ffc107',
								color: 'white',
								border: 'none',
								borderRadius: 4,
								cursor: !workflow || loading ? 'not-allowed' : 'pointer',
								fontSize: 12,
								fontWeight: '500',
							}}
						>
							{loading ? '⏳' : '▶️'}
						</button>
					</div>
				</div>
			</div>

			{/* Collapsible Tool Sets Info */}
			{showToolSets && (
				<div
					style={{
						padding: '12px 20px',
						background: '#fff',
						borderBottom: '1px solid #e0e0e0',
						maxHeight: 200,
						overflow: 'auto',
					}}
				>
					<h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 'bold' }}>
						📋 Available Tool Sets
					</h3>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
						{toolSets.map((toolSet) => (
							<div
								key={toolSet.id}
								style={{
									padding: '8px 12px',
									background: '#f8f9fa',
									border: '1px solid #e9ecef',
									borderRadius: 4,
									minWidth: 180,
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

			{/* Collapsible Workflow Info */}
			{showWorkflowInfo && workflow && (
				<div
					style={{
						padding: '12px 20px',
						background: '#fff',
						borderBottom: '1px solid #e0e0e0',
						maxHeight: 120,
						overflow: 'auto',
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

			{/* Main Tool Chain Editor - occupies remaining space */}
			<div
				style={{
					flex: 1,
					minHeight: 0,
					position: 'relative',
					background: '#f8f9fa',
				}}
			>
				<EnhancedToolChainEditor
					toolSets={toolSets}
					onWorkflowChange={handleWorkflowChange}
					onToolSetLoad={handleToolSetLoad}
				/>
			</div>
		</div>
	)
}

// ==================== Tool Set Manager Component ====================

interface ToolSetManagerProps {
	toolRegistry: EnhancedToolRegistry
	onToolSetLoad: (toolSetId: string) => void
}

export function ToolSetManager({ toolRegistry, onToolSetLoad }: ToolSetManagerProps) {
	const [selectedCategory, setSelectedCategory] = useState<string>('all')
	const [searchQuery, setSearchQuery] = useState<string>('')

	const categories = ['all', ...toolRegistry.getAllCategories()]
	const toolSets =
		selectedCategory === 'all'
			? toolRegistry.getAllToolSets()
			: toolRegistry.getToolSetsByCategory(selectedCategory)

	const filteredToolSets = searchQuery
		? toolSets.filter(
				(toolSet) =>
					toolSet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					toolSet.description.toLowerCase().includes(searchQuery.toLowerCase())
			)
		: toolSets

	return (
		<div
			style={{
				padding: 20,
				background: '#fff',
				border: '1px solid #e0e0e0',
				borderRadius: 8,
				marginBottom: 20,
			}}
		>
			<h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>📦 Tool Set Manager</h3>

			{/* Search and Filter */}
			<div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
				<input
					type="text"
					placeholder="Search tool sets..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					style={{
						flex: 1,
						padding: '8px 12px',
						border: '1px solid #ddd',
						borderRadius: 4,
						fontSize: 14,
					}}
				/>
				<select
					value={selectedCategory}
					onChange={(e) => setSelectedCategory(e.target.value)}
					style={{
						padding: '8px 12px',
						border: '1px solid #ddd',
						borderRadius: 4,
						fontSize: 14,
					}}
				>
					{categories.map((category) => (
						<option key={category} value={category}>
							{category === 'all' ? 'All Categories' : category}
						</option>
					))}
				</select>
			</div>

			{/* Tool Set List */}
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
				{filteredToolSets.map((toolSet) => (
					<div
						key={toolSet.id}
						style={{
							padding: '16px',
							background: '#f8f9fa',
							border: '1px solid #e9ecef',
							borderRadius: 6,
							minWidth: 250,
							flex: 1,
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
							<span style={{ fontSize: 24 }}>{toolSet.icon}</span>
							<div>
								<h4 style={{ margin: 0, fontSize: 16, fontWeight: 'bold' }}>{toolSet.name}</h4>
								<div style={{ fontSize: 12, color: '#666' }}>{toolSet.category}</div>
							</div>
						</div>

						<p
							style={{
								margin: '0 0 12px 0',
								fontSize: 13,
								color: '#666',
								lineHeight: 1.4,
							}}
						>
							{toolSet.description}
						</p>

						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								fontSize: 12,
								color: '#888',
							}}
						>
							<span>🛠️ {toolSet.tools.length} tools</span>
							<span>📅 {new Date(toolSet.metadata?.lastUpdated || '').toLocaleDateString()}</span>
						</div>

						{toolSet.metadata?.tags && (
							<div style={{ marginTop: 8 }}>
								{toolSet.metadata.tags.map((tag: string) => (
									<span
										key={tag}
										style={{
											display: 'inline-block',
											padding: '2px 6px',
											background: '#e3f2fd',
											color: '#1976d2',
											borderRadius: 3,
											fontSize: 10,
											marginRight: 4,
										}}
									>
										{tag}
									</span>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}
