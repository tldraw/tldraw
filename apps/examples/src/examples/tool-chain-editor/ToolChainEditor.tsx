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

// DeepSeek API call function
async function callDeepSeekAPI(question: string): Promise<string> {
	const apiKey = 'sk-26d1dcdacd4148b0a27b724af6f8daf7' // substitute your DeepSeek API Key

	// Build the prompt to help the LLM better understand the task
	const systemPrompt = `You are a helpful AI assistant. Please provide clear, concise, and accurate answers to user questions. 
If the question is about coding or technical topics, provide practical examples when possible.
If the question is unclear, ask for clarification.`

	const userPrompt = `User Query: ${question}

Please provide a helpful response:`

	const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: 'deepseek-chat',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			max_tokens: 256, // 限制回复最大长度
			temperature: 0.7,
		}),
	})
	if (!response.ok) throw new Error('API error')
	const data = await response.json()
	return data.choices?.[0]?.message?.content || '无回答'
}

// 自定义节点类型
function InputNode({ data, id }: { data: any; id: string }) {
	return (
		<div
			style={{
				padding: 18,
				background: '#fff',
				border: '2px solid #bbb',
				borderRadius: 10,
				minWidth: 260,
				maxWidth: 400,
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
					fontSize: 20,
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

function AgentNode({ data, id }: { data: any; id: string }) {
	return (
		<div
			style={{
				padding: 18,
				background: '#f6f6ff',
				border: '2px solid #888',
				borderRadius: 10,
				minWidth: 260,
				maxWidth: 500,
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
					fontSize: 18,
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

function OutputNode({ data, id }: { data: any; id: string }) {
	return (
		<div
			style={{
				padding: 18,
				background: '#eaffea',
				border: '2px solid #6b6',
				borderRadius: 10,
				minWidth: 220,
				maxWidth: 500,
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
					fontSize: 18,
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

// 新增：处理节点
function ProcessNode({ data, id }: { data: any; id: string }) {
	return (
		<div
			style={{
				padding: 18,
				background: '#fff3cd',
				border: '2px solid #ffc107',
				borderRadius: 10,
				minWidth: 220,
				maxWidth: 400,
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
					fontSize: 18,
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

// 工具栏组件
function Toolbar({ onAddNode }: { onAddNode: (type: string) => void }) {
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

export default function ToolChainEditor() {
	// 节点计数器
	const [nodeCounter, setNodeCounter] = useState(3)

	// 节点/连线 state
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

	// 添加节点
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

	// 删除节点
	function handleDeleteNode(nodeId: string) {
		setNodes((nds) => nds.filter((node) => node.id !== nodeId))
		setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
	}

	// 处理连线
	const onConnect = useCallback(
		(params: Edge | Connection) => {
			setEdges((eds) =>
				addEdge(
					{
						...params,
						animated: true, // 新增连线带动画
					},
					eds
				)
			)
		},
		[setEdges]
	)

	// 删除连线
	const onEdgeClick = useCallback(
		(event: React.MouseEvent, edge: Edge) => {
			event.stopPropagation()
			if (window.confirm('确定要删除这条连线吗？')) {
				setEdges((eds) => eds.filter((e) => e.id !== edge.id))
			}
		},
		[setEdges]
	)

	// input 变化时，只更新对应 input 节点的 value
	function handleInputChange(nodeId: string, val: string) {
		setNodes((nds) =>
			nds.map((node) =>
				node.id === nodeId ? { ...node, data: { ...node.data, value: val } } : node
			)
		)
	}

	// 按回车时，找到与该 input 相连的 agent 节点，只更新该 agent 节点
	async function handleSubmit(inputId: string) {
		const inputNode = nodes.find((n) => n.id === inputId)
		if (!inputNode) return
		const val = inputNode.data.value
		if (!val.trim()) return
		// 找到所有与该 input 相连的 agent 节点
		const connectedAgentIds = edges
			.filter((e) => e.source === inputId)
			.map((e) => e.target)
			.filter((targetId) => nodes.find((n) => n.id === targetId && n.type === 'agentNode'))
		// 设置 agent 节点 loading
		setNodes((nds) =>
			nds.map((node) =>
				connectedAgentIds.includes(node.id)
					? { ...node, data: { ...node.data, loading: true } }
					: node
			)
		)
		// 调用 API 并更新 agent 节点 result
		try {
			const result = await callDeepSeekAPI(val)
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

	// 保证所有节点的 data 事件都带上 id
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

	return (
		<div
			style={{
				width: '100%',
				height: '600px',
				background: '#f8f9fa',
				borderRadius: 12,
				position: 'relative',
			}}
		>
			<Toolbar onAddNode={handleAddNode} />
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
