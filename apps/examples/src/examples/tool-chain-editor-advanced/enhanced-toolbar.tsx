import { useState } from 'react'
import { ToolDefinition } from '../tool-chain-editor/ToolChainEditor'
import { EnhancedToolRegistry, ToolSet } from './enhanced-tool-registry'

// ==================== Enhanced Toolbar Component ====================

interface EnhancedToolbarProps {
	onAddNode: (type: string, toolId?: string) => void
	toolRegistry: EnhancedToolRegistry
	onToolSetLoad?: (toolSetId: string) => void
	onSearch?: (query: string) => void
}

export default function EnhancedToolbar({
	onAddNode,
	toolRegistry,
	onToolSetLoad,
	onSearch,
}: EnhancedToolbarProps) {
	const [selectedCategory, setSelectedCategory] = useState<string>('all')
	const [searchQuery, setSearchQuery] = useState<string>('')
	const [showToolDetails, setShowToolDetails] = useState<string | null>(null)
	const [loadingToolSets, setLoadingToolSets] = useState<string[]>([])

	const categories = ['all', ...toolRegistry.getAllCategories()]
	const toolSets =
		selectedCategory === 'all'
			? toolRegistry.getAllToolSets()
			: toolRegistry.getToolSetsByCategory(selectedCategory)

	// Search tools
	const searchResults = searchQuery ? toolRegistry.searchTools(searchQuery) : []

	// Load tool set
	const loadToolSet = async (toolSetId: string) => {
		setLoadingToolSets((prev) => [...prev, toolSetId])
		try {
			await toolRegistry.loadToolSetFromBackend(toolSetId)
			onToolSetLoad?.(toolSetId)
		} catch (error) {
			console.error(`Failed to load toolset ${toolSetId}:`, error)
		} finally {
			setLoadingToolSets((prev) => prev.filter((id) => id !== toolSetId))
		}
	}

	// Handle search
	const handleSearch = (query: string) => {
		setSearchQuery(query)
		onSearch?.(query)
	}

	return (
		<div
			style={{
				position: 'absolute',
				top: 10,
				left: 10,
				zIndex: 10,
				background: 'white',
				padding: 12,
				borderRadius: 8,
				boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
				minWidth: 280,
				maxWidth: 350,
				maxHeight: '85vh',
				overflow: 'auto',
				border: '1px solid #e0e0e0',
			}}
		>
			{/* Title */}
			<div style={{ marginBottom: 12 }}>
				<h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 'bold' }}>🛠️ Tool Library</h3>
				<p style={{ margin: 0, fontSize: 11, color: '#666' }}>
					{toolRegistry.getStatistics().totalTools} tools available
				</p>
			</div>

			{/* Search box */}
			<div style={{ marginBottom: 12 }}>
				<input
					type="text"
					placeholder="Search tools..."
					value={searchQuery}
					onChange={(e) => handleSearch(e.target.value)}
					style={{
						width: '100%',
						padding: '6px 10px',
						border: '1px solid #ddd',
						borderRadius: 4,
						fontSize: 12,
					}}
				/>
			</div>

			{/* Category selector */}
			<div style={{ marginBottom: 12 }}>
				<select
					value={selectedCategory}
					onChange={(e) => setSelectedCategory(e.target.value)}
					style={{
						width: '100%',
						padding: '6px 10px',
						border: '1px solid #ddd',
						borderRadius: 4,
						fontSize: 12,
					}}
				>
					{categories.map((category) => (
						<option key={category} value={category}>
							{category === 'all' ? 'All Categories' : category}
						</option>
					))}
				</select>
			</div>

			{/* Search results display */}
			{searchQuery && searchResults.length > 0 && (
				<div style={{ marginBottom: 12 }}>
					<h4 style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 'bold' }}>
						Search Results ({searchResults.length})
					</h4>
					{searchResults.map((tool) => (
						<ToolItem
							key={tool.id}
							tool={tool}
							onAddNode={onAddNode}
							onShowDetails={(toolId) => setShowToolDetails(toolId)}
							showDetails={showToolDetails === tool.id}
						/>
					))}
				</div>
			)}

			{/* Tool set list */}
			{!searchQuery && (
				<div>
					{toolSets.map((toolSet) => (
						<ToolSetSection
							key={toolSet.id}
							toolSet={toolSet}
							onAddNode={onAddNode}
							onLoadToolSet={loadToolSet}
							isLoading={loadingToolSets.includes(toolSet.id)}
							onShowDetails={(toolId) => setShowToolDetails(toolId)}
							showDetails={showToolDetails}
						/>
					))}
				</div>
			)}

			{/* Basic node types */}
			{!searchQuery && (
				<div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
					<h4 style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 'bold' }}>Basic Nodes</h4>
					<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
						<button
							onClick={() => onAddNode('inputNode')}
							style={{
								padding: '4px 8px',
								background: '#007bff',
								color: 'white',
								border: 'none',
								borderRadius: 3,
								cursor: 'pointer',
								fontSize: 11,
							}}
						>
							Add Input
						</button>
						<button
							onClick={() => onAddNode('outputNode')}
							style={{
								padding: '4px 8px',
								background: '#6f42c1',
								color: 'white',
								border: 'none',
								borderRadius: 3,
								cursor: 'pointer',
								fontSize: 11,
							}}
						>
							Add Output
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

// ==================== Tool Set Component ====================

interface ToolSetSectionProps {
	toolSet: ToolSet
	onAddNode: (type: string, toolId?: string) => void
	onLoadToolSet: (toolSetId: string) => void
	isLoading: boolean
	onShowDetails: (toolId: string) => void
	showDetails: string | null
}

function ToolSetSection({
	toolSet,
	onAddNode,
	onLoadToolSet,
	isLoading,
	onShowDetails,
	showDetails,
}: ToolSetSectionProps) {
	const [isExpanded, setIsExpanded] = useState(false) // Default collapsed

	return (
		<div style={{ marginBottom: 12 }}>
			{/* Tool set header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					cursor: 'pointer',
					padding: '6px 0',
				}}
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					<span style={{ fontSize: 14 }}>{toolSet.icon}</span>
					<div>
						<h4 style={{ margin: 0, fontSize: 14, fontWeight: 'bold' }}>{toolSet.name}</h4>
						<p style={{ margin: 0, fontSize: 11, color: '#666' }}>{toolSet.tools.length} tools</p>
					</div>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					{isLoading && <span style={{ fontSize: 12, color: '#666' }}>Loading...</span>}
					<button
						onClick={(e) => {
							e.stopPropagation()
							onLoadToolSet(toolSet.id)
						}}
						disabled={isLoading}
						style={{
							padding: '4px 8px',
							background: isLoading ? '#ccc' : '#28a745',
							color: 'white',
							border: 'none',
							borderRadius: 4,
							cursor: isLoading ? 'not-allowed' : 'pointer',
							fontSize: 10,
						}}
					>
						{isLoading ? 'Loading' : 'Load'}
					</button>
					<span style={{ fontSize: 12 }}>{isExpanded ? '▼' : '▶'}</span>
				</div>
			</div>

			{/* Tool set description */}
			<p
				style={{
					margin: '0 0 6px 0',
					fontSize: 11,
					color: '#666',
					paddingLeft: 20,
				}}
			>
				{toolSet.description}
			</p>

			{/* Tool list */}
			{isExpanded && (
				<div style={{ paddingLeft: 20 }}>
					{toolSet.tools.map((tool) => (
						<ToolItem
							key={tool.id}
							tool={tool}
							onAddNode={onAddNode}
							onShowDetails={onShowDetails}
							showDetails={showDetails === tool.id}
						/>
					))}
				</div>
			)}
		</div>
	)
}

// ==================== Tool Item Component ====================

interface ToolItemProps {
	tool: ToolDefinition
	onAddNode: (type: string, toolId?: string) => void
	onShowDetails: (toolId: string) => void
	showDetails: boolean
}

function ToolItem({ tool, onAddNode, onShowDetails, showDetails }: ToolItemProps) {
	const getToolTypeColor = (type: string): string => {
		switch (type) {
			case 'input':
				return '#007bff'
			case 'agent':
				return '#28a745'
			case 'process':
				return '#ffc107'
			case 'output':
				return '#6f42c1'
			default:
				return '#6c757d'
		}
	}

	const getToolTypeLabel = (type: string): string => {
		switch (type) {
			case 'input':
				return 'Input'
			case 'agent':
				return 'Agent'
			case 'process':
				return 'Process'
			case 'output':
				return 'Output'
			default:
				return type
		}
	}

	return (
		<div style={{ marginBottom: 6 }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '6px 10px',
					background: '#f8f9fa',
					borderRadius: 4,
					border: '1px solid #e9ecef',
				}}
			>
				<div style={{ flex: 1 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						<span
							style={{
								padding: '1px 4px',
								background: getToolTypeColor(tool.type),
								color: 'white',
								borderRadius: 2,
								fontSize: 9,
								fontWeight: 'bold',
							}}
						>
							{getToolTypeLabel(tool.type)}
						</span>
						<span style={{ fontSize: 12, fontWeight: '500' }}>{tool.name}</span>
					</div>
					<p
						style={{
							margin: '2px 0 0 0',
							fontSize: 10,
							color: '#666',
							lineHeight: 1.2,
						}}
					>
						{tool.description}
					</p>
				</div>

				<div style={{ display: 'flex', gap: 3 }}>
					<button
						onClick={() => onShowDetails(tool.id)}
						style={{
							padding: '3px 6px',
							background: '#6c757d',
							color: 'white',
							border: 'none',
							borderRadius: 3,
							cursor: 'pointer',
							fontSize: 9,
						}}
					>
						{showDetails ? 'Hide' : 'Info'}
					</button>
					<button
						onClick={() => onAddNode(`${tool.type}Node`, tool.id)}
						style={{
							padding: '3px 6px',
							background: getToolTypeColor(tool.type),
							color: 'white',
							border: 'none',
							borderRadius: 3,
							cursor: 'pointer',
							fontSize: 9,
						}}
					>
						Add
					</button>
				</div>
			</div>

			{/* Tool details */}
			{showDetails && (
				<div
					style={{
						marginTop: 6,
						padding: 8,
						background: '#f8f9fa',
						borderRadius: 4,
						border: '1px solid #e9ecef',
						fontSize: 10,
					}}
				>
					<div style={{ marginBottom: 6 }}>
						<strong>Input Schema:</strong>
						<pre
							style={{
								margin: '2px 0 0 0',
								fontSize: 9,
								background: '#fff',
								padding: 3,
								borderRadius: 2,
								overflow: 'auto',
							}}
						>
							{JSON.stringify(tool.inputSchema, null, 2)}
						</pre>
					</div>

					<div style={{ marginBottom: 6 }}>
						<strong>Output Schema:</strong>
						<pre
							style={{
								margin: '2px 0 0 0',
								fontSize: 9,
								background: '#fff',
								padding: 3,
								borderRadius: 2,
								overflow: 'auto',
							}}
						>
							{JSON.stringify(tool.outputSchema, null, 2)}
						</pre>
					</div>

					{tool.metadata && (
						<div>
							<strong>Metadata:</strong>
							<div style={{ fontSize: 9, color: '#666' }}>
								{tool.metadata.toolSetName && <div>Tool Set: {tool.metadata.toolSetName}</div>}
								{tool.metadata.category && <div>Category: {tool.metadata.category}</div>}
								{tool.metadata.version && <div>Version: {tool.metadata.version}</div>}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
