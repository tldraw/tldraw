import { ToolDefinition } from '../tool-chain-editor/ToolChainEditor'

// ==================== Toolset Definition ====================

export interface ToolSet {
	id: string
	name: string
	description: string
	category: string
	icon?: string
	tools: ToolDefinition[]
	metadata?: {
		version: string
		author: string
		lastUpdated: string
		tags: string[]
	}
}

// ==================== Enhanced Tool Registry ====================

export class EnhancedToolRegistry {
	private toolSets: Map<string, ToolSet> = new Map()
	private tools: Map<string, ToolDefinition> = new Map()
	private categories: Set<string> = new Set()

	constructor(toolSets: ToolSet[] = []) {
		toolSets.forEach((toolSet) => this.registerToolSet(toolSet))
	}

	// Register toolset
	registerToolSet(toolSet: ToolSet) {
		this.toolSets.set(toolSet.id, toolSet)
		this.categories.add(toolSet.category)

		// Register all tools in the toolset
		toolSet.tools.forEach((tool) => {
			this.tools.set(tool.id, {
				...tool,
				metadata: {
					...tool.metadata,
					toolSetId: toolSet.id,
					toolSetName: toolSet.name,
					category: toolSet.category,
				},
			})
		})
	}

	// Dynamically load toolset from backend
	async loadToolSetFromBackend(toolSetId: string, endpoint?: string): Promise<ToolSet> {
		const apiEndpoint = endpoint || `/api/toolsets/${toolSetId}`

		try {
			const response = await fetch(apiEndpoint)
			if (!response.ok) {
				throw new Error(`Failed to load toolset: ${response.statusText}`)
			}

			const toolSet: ToolSet = await response.json()
			this.registerToolSet(toolSet)
			return toolSet
		} catch (error) {
			console.error(`Error loading toolset ${toolSetId}:`, error)
			throw error
		}
	}

	// Batch load toolsets
	async loadToolSetsFromBackend(toolSetIds: string[], endpoint?: string): Promise<ToolSet[]> {
		const apiEndpoint = endpoint || '/api/toolsets/batch'

		try {
			const response = await fetch(apiEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ toolSetIds }),
			})

			if (!response.ok) {
				throw new Error(`Failed to load toolsets: ${response.statusText}`)
			}

			const toolSets: ToolSet[] = await response.json()
			toolSets.forEach((toolSet) => this.registerToolSet(toolSet))
			return toolSets
		} catch (error) {
			console.error('Error loading toolsets:', error)
			throw error
		}
	}

	// Get all toolsets
	getAllToolSets(): ToolSet[] {
		return Array.from(this.toolSets.values())
	}

	// Get toolsets by category
	getToolSetsByCategory(category: string): ToolSet[] {
		return Array.from(this.toolSets.values()).filter((toolSet) => toolSet.category === category)
	}

	// Get toolset
	getToolSet(toolSetId: string): ToolSet | undefined {
		return this.toolSets.get(toolSetId)
	}

	// Get tool
	getTool(toolId: string): ToolDefinition | undefined {
		return this.tools.get(toolId)
	}

	// Get all tools
	getAllTools(): ToolDefinition[] {
		return Array.from(this.tools.values())
	}

	// Get tools by type
	getToolsByType(type: ToolDefinition['type']): ToolDefinition[] {
		return this.getAllTools().filter((tool) => tool.type === type)
	}

	// Get tools by toolset
	getToolsByToolSet(toolSetId: string): ToolDefinition[] {
		return this.getAllTools().filter((tool) => tool.metadata?.toolSetId === toolSetId)
	}

	// Get tools by category
	getToolsByCategory(category: string): ToolDefinition[] {
		return this.getAllTools().filter((tool) => tool.metadata?.category === category)
	}

	// Search tools
	searchTools(query: string): ToolDefinition[] {
		const lowerQuery = query.toLowerCase()
		return this.getAllTools().filter(
			(tool) =>
				tool.name.toLowerCase().includes(lowerQuery) ||
				tool.description.toLowerCase().includes(lowerQuery) ||
				tool.metadata?.toolSetName?.toLowerCase().includes(lowerQuery) ||
				tool.metadata?.category?.toLowerCase().includes(lowerQuery)
		)
	}

	// Get all categories
	getAllCategories(): string[] {
		return Array.from(this.categories)
	}

	// Remove toolset
	removeToolSet(toolSetId: string) {
		const toolSet = this.toolSets.get(toolSetId)
		if (toolSet) {
			// Remove all tools in the toolset
			toolSet.tools.forEach((tool) => {
				this.tools.delete(tool.id)
			})

			this.toolSets.delete(toolSetId)

			// Check if there are other toolsets in the category
			const remainingToolSetsInCategory = Array.from(this.toolSets.values()).filter(
				(ts) => ts.category === toolSet.category
			)

			if (remainingToolSetsInCategory.length === 0) {
				this.categories.delete(toolSet.category)
			}
		}
	}

	// Update toolset
	updateToolSet(toolSetId: string, updatedToolSet: ToolSet) {
		this.removeToolSet(toolSetId)
		this.registerToolSet(updatedToolSet)
	}

	// Get tool statistics
	getStatistics() {
		return {
			totalToolSets: this.toolSets.size,
			totalTools: this.tools.size,
			categories: this.categories.size,
			toolsByType: {
				input: this.getToolsByType('input').length,
				agent: this.getToolsByType('agent').length,
				process: this.getToolsByType('process').length,
				output: this.getToolsByType('output').length,
			},
			toolsByCategory: Array.from(this.categories).reduce(
				(acc, category) => {
					acc[category] = this.getToolsByCategory(category).length
					return acc
				},
				{} as Record<string, number>
			),
		}
	}
}

// ==================== Predefined Toolsets ====================
//Where to add new toolsets

// Text Processing Toolset
export const textProcessingToolSet: ToolSet = {
	id: 'text-processing',
	name: 'Text Processing',
	description: 'Tools for text analysis, transformation, and processing',
	category: 'Text Analysis',
	icon: '📝',
	metadata: {
		version: '1.0.0',
		author: 'System',
		lastUpdated: new Date().toISOString(),
		tags: ['text', 'analysis', 'processing'],
	},
	tools: [
		{
			id: 'text-analyzer',
			name: 'Text Analyzer',
			type: 'process',
			description: 'Analyze text locally without API calls',
			config: {
				parameters: {
					enable_sentiment: true,
					enable_keywords: true,
					max_keywords: 10,
				},
			},
			inputSchema: {
				text: { type: 'string', required: true },
			},
			outputSchema: {
				word_count: { type: 'number' },
				character_count: { type: 'number' },
				sentence_count: { type: 'number' },
				average_word_length: { type: 'number' },
				keywords: { type: 'array' },
				sentiment_score: { type: 'number' },
			},
		},
		{
			id: 'text-translator',
			name: 'Text Translator',
			type: 'agent',
			description: 'Translate text between different languages',
			config: {
				apiEndpoint: 'https://api.translate.com/v1/translate',
				apiKey: 'your-translation-api-key',
				parameters: {
					source_lang: 'en',
					target_lang: 'zh',
				},
				headers: {
					'Content-Type': 'application/json',
				},
			},
			inputSchema: {
				text: { type: 'string', required: true },
				target_language: { type: 'string', required: false },
			},
			outputSchema: {
				translated_text: { type: 'string' },
				source_language: { type: 'string' },
				target_language: { type: 'string' },
			},
		},
	],
}

// Data Processing Toolset
export const dataProcessingToolSet: ToolSet = {
	id: 'data-processing',
	name: 'Data Processing',
	description: 'Tools for data transformation, validation, and analysis',
	category: 'Data Analysis',
	icon: '📊',
	metadata: {
		version: '1.0.0',
		author: 'System',
		lastUpdated: new Date().toISOString(),
		tags: ['data', 'processing', 'transformation'],
	},
	tools: [
		{
			id: 'json-formatter',
			name: 'JSON Formatter',
			type: 'process',
			description: 'Format and validate JSON data',
			config: {
				parameters: {
					indent_size: 2,
					sort_keys: true,
				},
			},
			inputSchema: {
				json_data: { type: 'string', required: true },
			},
			outputSchema: {
				formatted_json: { type: 'string' },
				is_valid: { type: 'boolean' },
				error_message: { type: 'string' },
			},
		},
		{
			id: 'data-transformer',
			name: 'Data Transformer',
			type: 'process',
			description: 'Transform data between different formats',
			config: {
				parameters: {
					outputFormat: 'json',
					includeMetadata: true,
				},
			},
			inputSchema: {
				data: { type: 'object', required: true },
				transformType: { type: 'string', required: false },
			},
			outputSchema: {
				transformedData: { type: 'object' },
				metadata: { type: 'object' },
			},
		},
	],
}

// AI/ML Toolset
export const aiMlToolSet: ToolSet = {
	id: 'ai-ml',
	name: 'AI & Machine Learning',
	description: 'AI-powered tools for content generation and analysis',
	category: 'Artificial Intelligence',
	icon: '🤖',
	metadata: {
		version: '1.0.0',
		author: 'System',
		lastUpdated: new Date().toISOString(),
		tags: ['ai', 'ml', 'generation'],
	},
	tools: [
		{
			id: 'deepseek-agent',
			name: 'DeepSeek AI Agent',
			type: 'agent',
			description: 'AI-powered content generation using DeepSeek API',
			config: {
				apiEndpoint: '/api/tools/deepseek-agent',
				apiKey: 'sk-26d1dcdacd4148b0a27b724af6f8daf7',
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
			id: 'sentiment-analyzer',
			name: 'Sentiment Analyzer',
			type: 'process',
			description: 'Analyze text sentiment using local processing',
			config: {
				parameters: {
					algorithm: 'keyword-based',
					threshold: 0.5,
				},
			},
			inputSchema: {
				text: { type: 'string', required: true },
			},
			outputSchema: {
				sentiment: { type: 'string' },
				score: { type: 'number' },
				confidence: { type: 'number' },
			},
		},
	],
}

// File Processing Toolset
export const fileProcessingToolSet: ToolSet = {
	id: 'file-processing',
	name: 'File Processing',
	description: 'Tools for file handling, compression, and conversion',
	category: 'File Management',
	icon: '📁',
	metadata: {
		version: '1.0.0',
		author: 'System',
		lastUpdated: new Date().toISOString(),
		tags: ['file', 'processing', 'compression'],
	},
	tools: [
		{
			id: 'image-compressor',
			name: 'Image Compressor',
			type: 'process',
			description: 'Compress images using local processing',
			config: {
				parameters: {
					quality: 0.8,
					max_width: 1920,
					max_height: 1080,
					format: 'jpeg',
				},
			},
			inputSchema: {
				image_data: { type: 'string', required: true },
				filename: { type: 'string', required: true },
			},
			outputSchema: {
				compressed_image: { type: 'string' },
				original_size: { type: 'number' },
				compressed_size: { type: 'number' },
				compression_ratio: { type: 'number' },
			},
		},
		{
			id: 'file-processor',
			name: 'File Processor',
			type: 'process',
			description: 'Process files (text, images, etc.)',
			config: {
				parameters: {
					maxFileSize: 10485760,
					allowedTypes: ['txt', 'json', 'csv'],
				},
			},
			inputSchema: {
				fileContent: { type: 'string', required: true },
				fileType: { type: 'string', required: true },
			},
			outputSchema: {
				processedContent: { type: 'string' },
				fileInfo: { type: 'object' },
				statistics: { type: 'object' },
			},
		},
	],
}

// Default toolsets
export const defaultToolSets: ToolSet[] = [
	textProcessingToolSet,
	dataProcessingToolSet,
	aiMlToolSet,
	fileProcessingToolSet,
]
