import React, { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
	addEdge,
	Background,
	Connection,
	Controls,
	Edge,
	Handle,
	Node,
	Position,
	useEdgesState,
	useNodesState,
} from 'react-flow-renderer'
import 'react-flow-renderer/dist/style.css'

import { ToolDefinition } from '../tool-chain-editor/ToolChainEditor'
import { defaultToolSets, EnhancedToolRegistry } from './enhanced-tool-registry'
import EnhancedToolbar from './enhanced-toolbar'

// ==================== Enhanced Node Components ====================

interface EnhancedNodeProps {
	data: any
	id: string
}

function EnhancedInputNode({ data, id }: EnhancedNodeProps) {
	return (
		<div
			style={{
				padding: 12,
				background: '#fff',
				border: '2px solid #007bff',
				borderRadius: 10,
				minWidth: 180,
				maxWidth: 280,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<strong style={{ fontSize: 16 }}>📥 Input</strong>
				<button
					onClick={() => data.onDeleteNode(id)}
					style={{
						background: '#ff4444',
						color: 'white',
						border: 'none',
						borderRadius: '50%',
						width: 20,
						height: 20,
						cursor: 'pointer',
						fontSize: 10,
					}}
				>
					×
				</button>
			</div>
			<input
				style={{
					width: '100%',
					marginTop: 8,
					fontSize: 14,
					padding: 6,
					borderRadius: 4,
					border: '1px solid #ccc',
				}}
				value={data.value}
				onChange={(e) => data.onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						data.onSubmit()
					}
				}}
				placeholder="Enter input data..."
			/>
			<Handle type="source" position={Position.Right} />
		</div>
	)
}

function EnhancedAgentNode({ data, id }: EnhancedNodeProps) {
	const tool = data.tool
	const isLocal = !tool?.config?.apiEndpoint

	return (
		<div
			style={{
				padding: 12,
				background: isLocal ? '#e8f5e8' : '#f6f6ff',
				border: `2px solid ${isLocal ? '#28a745' : '#888'}`,
				borderRadius: 10,
				minWidth: 180,
				maxWidth: 280,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<strong style={{ fontSize: 16 }}>
						{isLocal ? '🔧' : '🤖'} {tool?.name || 'Agent'}
					</strong>
					{tool?.metadata?.toolSetName && (
						<div style={{ fontSize: 10, color: '#666' }}>{tool.metadata.toolSetName}</div>
					)}
				</div>
				<button
					onClick={() => data.onDeleteNode(id)}
					style={{
						background: '#ff4444',
						color: 'white',
						border: 'none',
						borderRadius: '50%',
						width: 20,
						height: 20,
						cursor: 'pointer',
						fontSize: 10,
					}}
				>
					×
				</button>
			</div>
			<div
				style={{
					fontSize: 12,
					marginTop: 8,
					minHeight: 40,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					background: '#fff',
					padding: 8,
					borderRadius: 4,
					border: '1px solid #ddd',
				}}
			>
				{data.loading ? '⏳ Processing...' : data.result || 'Waiting for input'}
			</div>
			<Handle type="target" position={Position.Left} />
			<Handle type="source" position={Position.Right} />
		</div>
	)
}

function EnhancedProcessNode({ data, id }: EnhancedNodeProps) {
	const tool = data.tool
	const isLocal = !tool?.config?.apiEndpoint

	return (
		<div
			style={{
				padding: 12,
				background: isLocal ? '#fff3cd' : '#fff',
				border: `2px solid ${isLocal ? '#ffc107' : '#ddd'}`,
				borderRadius: 10,
				minWidth: 180,
				maxWidth: 280,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<strong style={{ fontSize: 16 }}>
						{isLocal ? '⚙️' : '🔄'} {tool?.name || 'Process'}
					</strong>
					{tool?.metadata?.toolSetName && (
						<div style={{ fontSize: 10, color: '#666' }}>{tool.metadata.toolSetName}</div>
					)}
				</div>
				<button
					onClick={() => data.onDeleteNode(id)}
					style={{
						background: '#ff4444',
						color: 'white',
						border: 'none',
						borderRadius: '50%',
						width: 20,
						height: 20,
						cursor: 'pointer',
						fontSize: 10,
					}}
				>
					×
				</button>
			</div>
			<div
				style={{
					fontSize: 12,
					marginTop: 8,
					minHeight: 40,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					background: '#fff',
					padding: 8,
					borderRadius: 4,
					border: '1px solid #ddd',
				}}
			>
				{data.loading ? '⏳ Processing...' : data.result || 'Waiting for input'}
			</div>
			<Handle type="target" position={Position.Left} />
			<Handle type="source" position={Position.Right} />
		</div>
	)
}

function EnhancedOutputNode({ data, id }: EnhancedNodeProps) {
	return (
		<div
			style={{
				padding: 12,
				background: '#eaffea',
				border: '2px solid #28a745',
				borderRadius: 10,
				minWidth: 180,
				maxWidth: 280,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<strong style={{ fontSize: 16 }}>📤 Output</strong>
				<button
					onClick={() => data.onDeleteNode(id)}
					style={{
						background: '#ff4444',
						color: 'white',
						border: 'none',
						borderRadius: '50%',
						width: 20,
						height: 20,
						cursor: 'pointer',
						fontSize: 10,
					}}
				>
					×
				</button>
			</div>
			<div
				style={{
					fontSize: 12,
					marginTop: 8,
					minHeight: 40,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					background: '#fff',
					padding: 8,
					borderRadius: 4,
					border: '1px solid #ddd',
					maxHeight: 120,
					overflow: 'auto',
				}}
			>
				{data.value || 'Waiting for result...'}
			</div>
			<Handle type="target" position={Position.Left} />
		</div>
	)
}

// ==================== Node Type Definitions ====================

const enhancedNodeTypes = {
	inputNode: EnhancedInputNode,
	agentNode: EnhancedAgentNode,
	processNode: EnhancedProcessNode,
	outputNode: EnhancedOutputNode,
}

// ==================== Main Component ====================

interface EnhancedToolChainEditorProps {
	toolSets?: any[]
	onWorkflowChange?: (workflow: { nodes: Node[]; edges: Edge[] }) => void
	onToolSetLoad?: (toolSetId: string) => void
	generatedNodes?: Node[]
	generatedEdges?: Edge[]
}

export default function EnhancedToolChainEditor({
	toolSets = defaultToolSets,
	onWorkflowChange,
	onToolSetLoad,
	generatedNodes,
	generatedEdges,
}: EnhancedToolChainEditorProps) {
	// Initialize tool registry
	const [toolRegistry] = useState(() => new EnhancedToolRegistry(toolSets))

	// Node counter
	const [nodeCounter, setNodeCounter] = useState(1)

	// Delete node
	function handleDeleteNode(nodeId: string) {
		setNodes((nds) => nds.filter((node) => node.id !== nodeId))
		setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
	}

	// Initial nodes
	const initialNodes: Node[] = [
		{
			id: 'input-1',
			type: 'inputNode',
			data: {
				value: '',
				onChange: (val: string) => {},
				onSubmit: () => {},
				onDeleteNode: handleDeleteNode,
			},
			position: { x: 100, y: 200 },
		},
		{
			id: 'output-1',
			type: 'outputNode',
			data: { value: '', onDeleteNode: handleDeleteNode },
			position: { x: 600, y: 200 },
		},
	]

	const initialEdges: Edge[] = []

	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

	// Add node
	function handleAddNode(type: string, toolId?: string) {
		const newNodeId = `${type}-${nodeCounter}`
		const tool = toolId ? toolRegistry.getTool(toolId) : null

		const newNode: Node = {
			id: newNodeId,
			type: type as any,
			data: {
				value: '',
				result: '',
				loading: false,
				tool: tool,
				onChange: (val: string) => handleInputChange(newNodeId, val),
				onSubmit: () => handleSubmit(newNodeId),
				onDeleteNode: handleDeleteNode,
			},
			position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 100 },
		}

		setNodes((nds) => [...nds, newNode])
		setNodeCounter((counter) => counter + 1)
	}

	// Handle connections
	const onConnect = useCallback(
		(params: Edge | Connection) => {
			setEdges((eds) =>
				addEdge(
					{
						...params,
						animated: true,
					},
					eds
				)
			)
		},
		[setEdges]
	)

	// Delete edge
	const onEdgeClick = useCallback(
		(event: React.MouseEvent, edge: Edge) => {
			event.stopPropagation()
			if (window.confirm('Are you sure you want to delete this connection?')) {
				setEdges((eds) => eds.filter((e) => e.id !== edge.id))
			}
		},
		[setEdges]
	)

	// Handle input changes
	function handleInputChange(nodeId: string, val: string) {
		setNodes((nds) =>
			nds.map((node) =>
				node.id === nodeId ? { ...node, data: { ...node.data, value: val } } : node
			)
		)
	}

	// Handle submit
	async function handleSubmit(inputId: string) {
		const inputNode = nodes.find((n) => n.id === inputId)
		if (!inputNode) return

		const val = inputNode.data.value
		if (!val.trim()) return

		// Find connected nodes
		const connectedNodeIds = edges.filter((e) => e.source === inputId).map((e) => e.target)

		// Set loading state
		setNodes((nds) =>
			nds.map((node) =>
				connectedNodeIds.includes(node.id)
					? { ...node, data: { ...node.data, loading: true } }
					: node
			)
		)

		// Execute workflow
		try {
			for (const nodeId of connectedNodeIds) {
				const node = nodes.find((n) => n.id === nodeId)
				if (!node) continue

				let result

				if (node.data.tool) {
					// Use tool for processing
					result = await executeTool(node.data.tool, { text: val })
				} else {
					// Default processing
					result = await handleDefaultNodeExecution(node, val)
				}

				setNodes((nds) =>
					nds.map((n) =>
						n.id === nodeId
							? {
									...n,
									data: { ...n.data, result: JSON.stringify(result, null, 2), loading: false },
								}
							: n
					)
				)
			}
		} catch (error) {
			console.error('Workflow execution error:', error)
			setNodes((nds) =>
				nds.map((node) =>
					connectedNodeIds.includes(node.id)
						? { ...node, data: { ...node.data, result: `Error: ${error}`, loading: false } }
						: node
				)
			)
		}
	}

	// Execute tool
	async function executeTool(tool: ToolDefinition, input: any) {
		if (tool.config.apiEndpoint) {
			// API tool
			try {
				console.log(`🔧 Executing tool ${tool.id} with input:`, input)

				// Prepare request body
				const requestBody = {
					...(tool.config.parameters || {}),
					...input,
				}

				const response = await fetch(tool.config.apiEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...tool.config.headers,
					},
					body: JSON.stringify(requestBody),
				})

				if (!response.ok) {
					const errorText = await response.text()
					console.error(`API call failed for ${tool.id}:`, response.status, errorText)
					throw new Error(`API call failed: ${response.statusText} (${response.status})`)
				}

				const result = await response.json()
				console.log(`✅ Tool ${tool.id} executed successfully:`, result)

				// Handle backend response format: {success: true, result: {...}}
				if (result.success && result.result) {
					return result.result
				}

				// If it's already in the expected format, return as is
				return result
			} catch (error) {
				console.error(`❌ Error executing tool ${tool.id}:`, error)
				return { error: error instanceof Error ? error.message : 'Unknown error' }
			}
		} else {
			// Local processing tool
			return await handleLocalToolExecution(tool, input)
		}
	}

	// Local tool execution
	async function handleLocalToolExecution(tool: ToolDefinition, input: any) {
		// Simple local processing logic
		if (tool.type === 'process') {
			return {
				processed_text: input.text?.toUpperCase() || input.toString().toUpperCase(),
				length: input.text?.length || input.toString().length,
				word_count: input.text?.split(/\s+/).length || input.toString().split(/\s+/).length,
			}
		}

		if (tool.type === 'agent') {
			return {
				response: `Processed by ${tool.name}: ${JSON.stringify(input)}`,
				timestamp: new Date().toISOString(),
			}
		}

		return input
	}

	// Default node execution
	async function handleDefaultNodeExecution(node: Node, input: any) {
		if (node.type === 'processNode') {
			return {
				processed_text: input.toUpperCase(),
				length: input.length,
				word_count: input.split(/\s+/).length,
			}
		}

		if (node.type === 'agentNode') {
			return {
				response: `Processed: ${JSON.stringify(input)}`,
				timestamp: new Date().toISOString(),
			}
		}

		return input
	}

	// Handle toolset loading
	const handleToolSetLoad = (toolSetId: string) => {
		console.log(`ToolSet ${toolSetId} loaded successfully`)
		onToolSetLoad?.(toolSetId)
	}

	// Handle search
	const handleSearch = (query: string) => {
		console.log('Search query:', query)
	}

	// Update nodes with proper callbacks
	const updateNodesWithCallbacks = (nodes: Node[]) => {
		return nodes.map((node) => {
			// If the node has a tool with only id and name, get the full tool definition
			let updatedData = { ...node.data }
			if (node.data.tool && node.data.tool.id && !node.data.tool.type) {
				const fullTool = toolRegistry.getTool(node.data.tool.id)
				if (fullTool) {
					updatedData.tool = fullTool
				}
			}

			return {
				...node,
				data: {
					...updatedData,
					onChange: (val: string) => handleInputChange(node.id, val),
					onSubmit: () => handleSubmit(node.id),
					onDeleteNode: handleDeleteNode,
				},
			}
		})
	}

	// Handle generated nodes and edges - apply when they change from empty to non-empty
	const [hasAppliedGenerated, setHasAppliedGenerated] = useState(false)

	useEffect(() => {
		if (
			generatedNodes &&
			generatedEdges &&
			generatedNodes.length > 0 &&
			generatedEdges.length > 0 &&
			!hasAppliedGenerated
		) {
			console.log('🎯 Applying generated nodes and edges:', { generatedNodes, generatedEdges })
			const updatedNodes = updateNodesWithCallbacks(generatedNodes)
			setNodes(updatedNodes)
			setEdges(generatedEdges)
			setHasAppliedGenerated(true)

			// Update workflow
			onWorkflowChange?.({ nodes: updatedNodes, edges: generatedEdges })
		} else if ((!generatedNodes || generatedNodes.length === 0) && hasAppliedGenerated) {
			// Reset the flag when generated nodes are cleared
			setHasAppliedGenerated(false)
		}
	}, [generatedNodes, generatedEdges, hasAppliedGenerated])

	// Update node event handlers
	useEffect(() => {
		setNodes((nds) =>
			nds.map((node) => {
				if (node.type === 'inputNode') {
					return {
						...node,
						data: {
							...node.data,
							onChange: (val: string) => handleInputChange(node.id, val),
							onSubmit: () => handleSubmit(node.id),
							onDeleteNode: handleDeleteNode,
						},
					}
				}
				return { ...node, data: { ...node.data, onDeleteNode: handleDeleteNode } }
			})
		)
	}, [nodes, setNodes])

	// Notify parent component of workflow changes
	useEffect(() => {
		onWorkflowChange?.({ nodes, edges })
	}, [nodes, edges, onWorkflowChange])

	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				background: '#f8f9fa',
				position: 'relative',
			}}
		>
			<EnhancedToolbar
				onAddNode={handleAddNode}
				toolRegistry={toolRegistry}
				onToolSetLoad={handleToolSetLoad}
				onSearch={handleSearch}
			/>

			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onEdgeClick={onEdgeClick}
				nodeTypes={enhancedNodeTypes}
				fitView
				nodesDraggable={true}
				nodesConnectable={true}
				elementsSelectable={true}
			>
				<Controls />
				<Background />
			</ReactFlow>
		</div>
	)
}
