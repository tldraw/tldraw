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

// ==================== Tool Definitions ====================

export interface ToolDefinition {
	id: string
	name: string
	type: 'input' | 'agent' | 'process' | 'output'
	description: string
	config: {
		apiEndpoint?: string
		parameters?: Record<string, any>
		headers?: Record<string, string>
		apiKey?: string
	}
	inputSchema?: Record<string, any>
	outputSchema?: Record<string, any>
	metadata?: {
		//metadata: Not sure if this is needed
		toolSetId?: string
		toolSetName?: string
		category?: string
		version?: string
		author?: string
		lastUpdated?: string
		tags?: string[]
		[key: string]: any
	}
}

// Default tool definitions - can be loaded from backend
export const defaultTools: ToolDefinition[] = [
	{
		id: 'deepseek-agent',
		name: 'DeepSeek AI Agent',
		type: 'agent',
		description: 'AI-powered content generation using DeepSeek API',
		config: {
			apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
			apiKey: 'sk-26d1dcdacd4148b0a27b724af6f8daf7', // substitute your DeepSeek API Key
			parameters: {
				model: 'deepseek-chat',
				max_tokens: 256,
				temperature: 0.7,
			},
			headers: {
				'Content-Type': 'application/json',
			},
		},
		inputSchema: {
			question: { type: 'string', required: true },
		},
		outputSchema: {
			response: { type: 'string' },
		},
	},
	{
		id: 'text-processor',
		name: 'Text Processor',
		type: 'process',
		description: 'Process and analyze text content',
		config: {
			apiEndpoint: '/api/tools/text-processor',
			parameters: {
				maxLength: 1000,
				language: 'en',
			},
		},
		inputSchema: {
			text: { type: 'string', required: true },
		},
		outputSchema: {
			processedText: { type: 'string' },
			analysis: { type: 'object' },
		},
	},
]

// ==================== Tool Registry ====================

export class ToolRegistry {
	private tools: Map<string, ToolDefinition> = new Map()

	constructor(tools: ToolDefinition[] = []) {
		tools.forEach((tool) => this.registerTool(tool))
	}

	registerTool(tool: ToolDefinition) {
		this.tools.set(tool.id, tool)
	}

	getTool(id: string): ToolDefinition | undefined {
		return this.tools.get(id)
	}

	getAllTools(): ToolDefinition[] {
		return Array.from(this.tools.values())
	}

	getToolsByType(type: ToolDefinition['type']): ToolDefinition[] {
		return this.getAllTools().filter((tool) => tool.type === type)
	}
}

// ==================== API Service ====================

export class ToolAPIService {
	constructor(private toolRegistry: ToolRegistry) {}

	async executeTool(toolId: string, input: any): Promise<any> {
		const tool = this.toolRegistry.getTool(toolId)
		if (!tool) {
			throw new Error(`Tool ${toolId} not found`)
		}

		if (!tool.config.apiEndpoint) {
			throw new Error(`Tool ${toolId} has no API endpoint`)
		}

		const requestBody = {
			...tool.config.parameters,
			...input,
		}

		const response = await fetch(tool.config.apiEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(tool.config.apiKey && { Authorization: `Bearer ${tool.config.apiKey}` }),
				...tool.config.headers,
			},
			body: JSON.stringify(requestBody),
		})

		if (!response.ok) {
			throw new Error(`API call failed: ${response.statusText}`)
		}

		return await response.json()
	}

	// Special handling for DeepSeek API
	async callDeepSeekAPI(question: string): Promise<string> {
		const tool = this.toolRegistry.getTool('deepseek-agent')
		if (!tool) {
			throw new Error('DeepSeek tool not found')
		}

		const systemPrompt = `You are a helpful AI assistant. Please provide clear, concise, and accurate answers to user questions. 
If the question is about coding or technical topics, provide practical examples when possible.
If the question is unclear, ask for clarification.`

		const response = await fetch(tool.config.apiEndpoint!, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${tool.config.apiKey}`,
			},
			body: JSON.stringify({
				model: tool.config.parameters?.model || 'deepseek-chat',
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: question },
				],
				max_tokens: tool.config.parameters?.max_tokens || 256,
				temperature: tool.config.parameters?.temperature || 0.7,
			}),
		})

		if (!response.ok) {
			throw new Error('DeepSeek API error')
		}

		const data = await response.json()
		return data.choices?.[0]?.message?.content || '无回答'
	}
}

// ==================== Node Components ====================

interface NodeProps {
	data: any
	id: string
}

function InputNode({ data, id }: NodeProps) {
	return (
		<div
			style={{
				padding: 10,
				background: '#fff',
				border: '2px solid #bbb',
				borderRadius: 10,
				minWidth: 160,
				maxWidth: 250,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<strong style={{ fontSize: 28 }}>Input</strong>
				<button
					onClick={() => data.onDeleteNode(id)}
					style={{
						background: '#ff4444',
						color: 'white',
						border: 'none',
						borderRadius: '50%',
						width: 24,
						height: 24,
						cursor: 'pointer',
						fontSize: 12,
					}}
				>
					×
				</button>
			</div>
			<input
				style={{
					width: '100%',
					marginTop: 12,
					fontSize: 16,
					padding: 6,
					borderRadius: 6,
					border: '1px solid #ccc',
				}}
				value={data.value}
				onChange={(e) => data.onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						data.onSubmit()
					}
				}}
				placeholder="Enter Query (Press Enter to submit)"
			/>
			<Handle type="source" position={Position.Right} />
		</div>
	)
}

function AgentNode({ data, id }: NodeProps) {
	return (
		<div
			style={{
				padding: 10,
				background: '#f6f6ff',
				border: '2px solid #888',
				borderRadius: 10,
				minWidth: 160,
				maxWidth: 250,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<strong style={{ fontSize: 28 }}>Agent(API)</strong>
				<button
					onClick={() => data.onDeleteNode(id)}
					style={{
						background: '#ff4444',
						color: 'white',
						border: 'none',
						borderRadius: '50%',
						width: 24,
						height: 24,
						cursor: 'pointer',
						fontSize: 12,
					}}
				>
					×
				</button>
			</div>
			<div
				style={{
					fontSize: 16,
					marginTop: 12,
					minHeight: 32,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
				}}
			>
				{data.loading ? 'Processing...' : data.result || 'Waiting for input'}
			</div>
			<Handle type="target" position={Position.Left} />
			<Handle type="source" position={Position.Right} />
		</div>
	)
}

function OutputNode({ data, id }: NodeProps) {
	return (
		<div
			style={{
				padding: 10,
				background: '#eaffea',
				border: '2px solid #6b6',
				borderRadius: 10,
				minWidth: 160,
				maxWidth: 250,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<strong style={{ fontSize: 28 }}>Output</strong>
				<button
					onClick={() => data.onDeleteNode(id)}
					style={{
						background: '#ff4444',
						color: 'white',
						border: 'none',
						borderRadius: '50%',
						width: 24,
						height: 24,
						cursor: 'pointer',
						fontSize: 12,
					}}
				>
					×
				</button>
			</div>
			<div
				style={{
					fontSize: 16,
					marginTop: 12,
					minHeight: 32,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
				}}
			>
				{data.value || 'Waiting for result'}
			</div>
			<Handle type="target" position={Position.Left} />
		</div>
	)
}

function ProcessNode({ data, id }: NodeProps) {
	return (
		<div
			style={{
				padding: 10,
				background: '#fff3cd',
				border: '2px solid #ffc107',
				borderRadius: 10,
				minWidth: 160,
				maxWidth: 250,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<strong style={{ fontSize: 28 }}>Process</strong>
				<button
					onClick={() => data.onDeleteNode(id)}
					style={{
						background: '#ff4444',
						color: 'white',
						border: 'none',
						borderRadius: '50%',
						width: 24,
						height: 24,
						cursor: 'pointer',
						fontSize: 12,
					}}
				>
					×
				</button>
			</div>
			<div
				style={{
					fontSize: 16,
					marginTop: 12,
					minHeight: 32,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
				}}
			>
				{data.result || 'Processing data...'}
			</div>
			<Handle type="target" position={Position.Left} />
			<Handle type="source" position={Position.Right} />
		</div>
	)
}

const nodeTypes = {
	inputNode: InputNode,
	agentNode: AgentNode,
	outputNode: OutputNode,
	processNode: ProcessNode,
}

// ==================== Toolbar Component ====================

interface ToolbarProps {
	onAddNode: (type: string) => void
	toolRegistry: ToolRegistry
}

function Toolbar({ onAddNode, toolRegistry }: ToolbarProps) {
	const toolsByType = {
		input: toolRegistry.getToolsByType('input'),
		agent: toolRegistry.getToolsByType('agent'),
		process: toolRegistry.getToolsByType('process'),
		output: toolRegistry.getToolsByType('output'),
	}

	return (
		<div
			style={{
				position: 'absolute',
				top: 10,
				left: 10,
				zIndex: 10,
				background: 'white',
				padding: 10,
				borderRadius: 8,
				boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
				display: 'flex',
				gap: 10,
			}}
		>
			<button
				onClick={() => onAddNode('inputNode')}
				style={{
					padding: '8px 12px',
					background: '#007bff',
					color: 'white',
					border: 'none',
					borderRadius: 4,
					cursor: 'pointer',
				}}
			>
				Add Input
			</button>
			{toolsByType.agent.length > 0 && (
				<button
					onClick={() => onAddNode('agentNode')}
					style={{
						padding: '8px 12px',
						background: '#28a745',
						color: 'white',
						border: 'none',
						borderRadius: 4,
						cursor: 'pointer',
					}}
				>
					Add Agent
				</button>
			)}
			{toolsByType.process.length > 0 && (
				<button
					onClick={() => onAddNode('processNode')}
					style={{
						padding: '8px 12px',
						background: '#ffc107',
						color: 'black',
						border: 'none',
						borderRadius: 4,
						cursor: 'pointer',
					}}
				>
					Add Process
				</button>
			)}
			<button
				onClick={() => onAddNode('outputNode')}
				style={{
					padding: '8px 12px',
					background: '#6f42c1',
					color: 'white',
					border: 'none',
					borderRadius: 4,
					cursor: 'pointer',
				}}
			>
				Add Output
			</button>
		</div>
	)
}

// ==================== Main Component ====================

interface ToolChainEditorProps {
	tools?: ToolDefinition[]
	onWorkflowChange?: (workflow: { nodes: Node[]; edges: Edge[] }) => void
}

export default function ToolChainEditor({
	tools = defaultTools,
	onWorkflowChange,
}: ToolChainEditorProps) {
	// Initialize tool registry and API service
	const toolRegistry = new ToolRegistry(tools)
	const apiService = new ToolAPIService(toolRegistry)

	// Node counter
	const [nodeCounter, setNodeCounter] = useState(3)

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
			id: 'agent-1',
			type: 'agentNode',
			data: { result: '', loading: false, onDeleteNode: handleDeleteNode },
			position: { x: 450, y: 200 },
		},
		{
			id: 'output-1',
			type: 'outputNode',
			data: { value: '', onDeleteNode: handleDeleteNode },
			position: { x: 900, y: 200 },
		},
	]

	const initialEdges: Edge[] = [
		{ id: 'e1', source: 'input-1', target: 'agent-1', animated: true },
		{ id: 'e2', source: 'agent-1', target: 'output-1', animated: true },
	]

	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

	// Add node
	function handleAddNode(type: string) {
		const newNodeId = `${type}-${nodeCounter}`
		const newNode: Node = {
			id: newNodeId,
			type: type as any,
			data: {
				value: '',
				result: '',
				loading: false,
				onChange: (val: string) => handleInputChange(newNodeId, val),
				onSubmit: () => handleSubmit(newNodeId),
				onDeleteNode: handleDeleteNode,
			},
			position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
		}
		setNodes((nds) => [...nds, newNode])
		setNodeCounter((counter) => counter + 1)
	}

	// Delete node
	function handleDeleteNode(nodeId: string) {
		setNodes((nds) => nds.filter((node) => node.id !== nodeId))
		setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
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
			if (window.confirm('确定要删除这条连线吗？')) {
				setEdges((eds) => eds.filter((e) => e.id !== edge.id))
			}
		},
		[setEdges]
	)

	// Handle input change
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

		// Find connected agent nodes
		const connectedAgentIds = edges
			.filter((e) => e.source === inputId)
			.map((e) => e.target)
			.filter((targetId) => nodes.find((n) => n.id === targetId && n.type === 'agentNode'))

		// Set loading state
		setNodes((nds) =>
			nds.map((node) =>
				connectedAgentIds.includes(node.id)
					? { ...node, data: { ...node.data, loading: true } }
					: node
			)
		)

		// Call API and update results
		try {
			const result = await apiService.callDeepSeekAPI(val)
			setNodes((nds) =>
				nds.map((node) =>
					connectedAgentIds.includes(node.id)
						? { ...node, data: { ...node.data, result, loading: false } }
						: node
				)
			)
		} catch {
			setNodes((nds) =>
				nds.map((node) =>
					connectedAgentIds.includes(node.id)
						? { ...node, data: { ...node.data, result: 'API 调用失败', loading: false } }
						: node
				)
			)
		}
	}

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
				if (node.type === 'agentNode') {
					return { ...node, data: { ...node.data, onDeleteNode: handleDeleteNode } }
				}
				if (node.type === 'outputNode') {
					return { ...node, data: { ...node.data, onDeleteNode: handleDeleteNode } }
				}
				if (node.type === 'processNode') {
					return { ...node, data: { ...node.data, onDeleteNode: handleDeleteNode } }
				}
				return node
			})
		)
	}, [nodes, setNodes])

	// Notify parent of workflow changes
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
			<Toolbar onAddNode={handleAddNode} toolRegistry={toolRegistry} />
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onEdgeClick={onEdgeClick}
				nodeTypes={nodeTypes}
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
