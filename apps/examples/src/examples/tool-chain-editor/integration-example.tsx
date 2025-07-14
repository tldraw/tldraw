import { useState } from 'react'
import ToolChainEditor, { ToolDefinition, ToolRegistry } from './ToolChainEditor'
import { customTools, ExtendedToolAPIService } from './custom-tools-example'

// ==================== 扩展的Tool Chain Editor ====================

interface ExtendedToolChainEditorProps {
	tools?: ToolDefinition[]
	onWorkflowChange?: (workflow: { nodes: any[]; edges: any[] }) => void
}

export default function ExtendedToolChainEditor({
	tools = customTools,
	onWorkflowChange,
}: ExtendedToolChainEditorProps) {
	const [workflow, setWorkflow] = useState<any>(null)
	const [results, setResults] = useState<Record<string, any>>({})

	// 初始化工具注册表和API服务
	const toolRegistry = new ToolRegistry(tools)
	const apiService = new ExtendedToolAPIService(toolRegistry)

	// 处理工作流变化
	const handleWorkflowChange = (newWorkflow: any) => {
		setWorkflow(newWorkflow)
		onWorkflowChange?.(newWorkflow)
	}

	// 执行工作流
	const executeWorkflow = async () => {
		if (!workflow) return

		const newResults: Record<string, any> = {}

		// 按拓扑排序执行节点
		const sortedNodes = topologicalSort(workflow.nodes, workflow.edges)

		for (const node of sortedNodes) {
			try {
				let result

				switch (node.type) {
					case 'inputNode':
						// 输入节点不需要处理
						break

					case 'agentNode':
					case 'processNode':
						// 获取输入数据
						const input = getNodeInput(node.id, workflow, newResults)

						// 执行工具
						if (node.data.toolId) {
							result = await apiService.executeTool(node.data.toolId, input)
						} else {
							// 默认处理逻辑
							result = await handleDefaultNodeExecution(node, input)
						}

						newResults[node.id] = result
						break

					case 'outputNode':
						// 输出节点显示结果
						const outputInput = getNodeInput(node.id, workflow, newResults)
						newResults[node.id] = { value: JSON.stringify(outputInput, null, 2) }
						break
				}
			} catch (error) {
				console.error(`Error executing node ${node.id}:`, error)
				newResults[node.id] = { error: error instanceof Error ? error.message : 'Unknown error' }
			}
		}

		setResults(newResults)
	}

	// 默认节点执行逻辑
	const handleDefaultNodeExecution = async (node: any, input: any) => {
		if (node.type === 'processNode') {
			// 默认的本地处理逻辑
			if (typeof input === 'string') {
				return {
					processed_text: input.toUpperCase(),
					length: input.length,
					word_count: input.split(/\s+/).length,
				}
			}
			return input
		}

		if (node.type === 'agentNode') {
			// 默认的AI处理逻辑（这里可以调用默认的AI服务）
			return {
				response: `Processed: ${JSON.stringify(input)}`,
				timestamp: new Date().toISOString(),
			}
		}

		return input
	}

	return (
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
			{/* Header */}
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
						fontSize: 24,
						fontWeight: 'bold',
						color: '#333',
					}}
				>
					Extended Tool Chain Editor
				</h1>
				<p
					style={{
						margin: '0 0 16px 0',
						color: '#666',
						fontSize: 14,
					}}
				>
					Drag and drop tools to create workflows. Supports both API and local processing tools.
				</p>

				{/* Execute Button */}
				<button
					onClick={executeWorkflow}
					style={{
						padding: '12px 24px',
						background: '#28a745',
						color: 'white',
						border: 'none',
						borderRadius: 6,
						cursor: 'pointer',
						fontSize: 16,
						fontWeight: 'bold',
						marginRight: 12,
					}}
				>
					🚀 Execute Workflow
				</button>

				{/* Available Tools Info */}
				<div style={{ marginTop: 16 }}>
					<strong style={{ color: '#333' }}>Available Tools:</strong>
					<div
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: '8px',
							marginTop: 8,
						}}
					>
						{tools.map((tool) => (
							<span
								key={tool.id}
								style={{
									padding: '4px 8px',
									background: getToolTypeColor(tool.type),
									color: 'white',
									borderRadius: 4,
									fontSize: 12,
									fontWeight: '500',
								}}
							>
								{tool.name} {!tool.config.apiEndpoint && '(Local)'}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* Results Panel */}
			{Object.keys(results).length > 0 && (
				<div
					style={{
						padding: 16,
						background: '#fff',
						border: '1px solid #e0e0e0',
						borderRadius: 8,
						marginBottom: 20,
						maxHeight: 200,
						overflow: 'auto',
					}}
				>
					<h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Execution Results:</h3>
					{Object.entries(results).map(([nodeId, result]) => (
						<div key={nodeId} style={{ marginBottom: 8 }}>
							<strong>{nodeId}:</strong>
							<pre
								style={{
									background: '#f8f9fa',
									padding: 8,
									borderRadius: 4,
									fontSize: 12,
									margin: '4px 0 0 0',
									overflow: 'auto',
								}}
							>
								{JSON.stringify(result, null, 2)}
							</pre>
						</div>
					))}
				</div>
			)}

			{/* ToolChainEditor */}
			<div style={{ flex: 1, minHeight: 0 }}>
				<ToolChainEditor tools={tools} onWorkflowChange={handleWorkflowChange} />
			</div>
		</div>
	)
}

// ==================== 辅助函数 ====================

// 获取节点的输入数据
function getNodeInput(nodeId: string, workflow: any, results: Record<string, any>): any {
	const incomingEdges = workflow.edges.filter((edge: any) => edge.target === nodeId)

	if (incomingEdges.length === 0) {
		return null
	}

	if (incomingEdges.length === 1) {
		const sourceNode = workflow.nodes.find((node: any) => node.id === incomingEdges[0].source)
		return results[sourceNode.id] || sourceNode.data.value || ''
	}

	// 多个输入的情况
	const inputs = incomingEdges.map((edge: any) => {
		const sourceNode = workflow.nodes.find((node: any) => node.id === edge.source)
		return results[sourceNode.id] || sourceNode.data.value || ''
	})

	return inputs
}

// 拓扑排序（确保依赖关系正确）
function topologicalSort(nodes: any[], edges: any[]): any[] {
	const graph: Record<string, string[]> = {}
	const inDegree: Record<string, number> = {}

	// 初始化
	nodes.forEach((node) => {
		graph[node.id] = []
		inDegree[node.id] = 0
	})

	// 构建图
	edges.forEach((edge) => {
		graph[edge.source].push(edge.target)
		inDegree[edge.target]++
	})

	// 拓扑排序
	const queue: string[] = []
	const result: any[] = []

	// 找到入度为0的节点
	Object.keys(inDegree).forEach((nodeId) => {
		if (inDegree[nodeId] === 0) {
			queue.push(nodeId)
		}
	})

	while (queue.length > 0) {
		const current = queue.shift()!
		result.push(nodes.find((node) => node.id === current))

		graph[current].forEach((neighbor) => {
			inDegree[neighbor]--
			if (inDegree[neighbor] === 0) {
				queue.push(neighbor)
			}
		})
	}

	return result
}

// 获取工具类型颜色
function getToolTypeColor(type: string): string {
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

// ==================== 使用示例 ====================

export function ExtendedToolChainEditorExample() {
	return <ExtendedToolChainEditor tools={customTools} />
}

// ==================== 后端集成示例 ====================

// 如果你有后端API，可以这样加载工具
export async function loadToolsFromBackend(): Promise<ToolDefinition[]> {
	try {
		// 从后端加载工具定义
		const response = await fetch('/api/tools')
		const backendTools = await response.json()

		// 合并本地工具和后端工具
		return [...customTools, ...backendTools]
	} catch (error) {
		console.error('Failed to load tools from backend:', error)
		return customTools
	}
}

// 保存工作流到后端
export async function saveWorkflowToBackend(workflow: any): Promise<void> {
	try {
		await fetch('/api/workflows', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(workflow),
		})
	} catch (error) {
		console.error('Failed to save workflow:', error)
	}
}
