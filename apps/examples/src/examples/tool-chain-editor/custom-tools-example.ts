import { ToolDefinition } from './ToolChainEditor'

// ==================== 自定义工具定义示例 ====================

// 1. API工具示例 - 文本翻译工具
export const translationTool: ToolDefinition = {
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
}

// 2. 本地处理工具示例 - 文本分析工具（不依赖API）
export const textAnalyzerTool: ToolDefinition = {
	id: 'text-analyzer',
	name: 'Text Analyzer',
	type: 'process',
	description: 'Analyze text locally without API calls',
	config: {
		// 没有apiEndpoint，表示这是本地处理工具
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
}

// 3. 数据转换工具示例 - JSON格式化工具
export const jsonFormatterTool: ToolDefinition = {
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
}

// 4. 文件处理工具示例 - 图片压缩工具
export const imageCompressorTool: ToolDefinition = {
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
		image_data: { type: 'string', required: true }, // base64 encoded image
		filename: { type: 'string', required: true },
	},
	outputSchema: {
		compressed_image: { type: 'string' }, // base64 encoded compressed image
		original_size: { type: 'number' },
		compressed_size: { type: 'number' },
		compression_ratio: { type: 'number' },
	},
}

// ==================== 本地工具处理器 ====================

export class LocalToolProcessor {
	// 文本分析处理
	static async processTextAnalyzer(input: any, config: any): Promise<any> {
		const { text } = input
		const { enable_sentiment, enable_keywords, max_keywords } = config.parameters

		// 基本文本统计
		const words = text.split(/\s+/).filter((word: string) => word.length > 0)
		const sentences = text.split(/[.!?]+/).filter((sentence: string) => sentence.trim().length > 0)
		const characters = text.replace(/\s/g, '').length

		const result: any = {
			word_count: words.length,
			character_count: characters,
			sentence_count: sentences.length,
			average_word_length:
				words.length > 0
					? words.reduce((sum: number, word: string) => sum + word.length, 0) / words.length
					: 0,
		}

		// 关键词提取（简单实现）
		if (enable_keywords) {
			const wordFreq: Record<string, number> = {}
			words.forEach((word: string) => {
				const cleanWord = word.toLowerCase().replace(/[^\w]/g, '')
				if (cleanWord.length > 2) {
					wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1
				}
			})

			result.keywords = Object.entries(wordFreq)
				.sort(([, a], [, b]) => b - a)
				.slice(0, max_keywords)
				.map(([word]) => word)
		}

		// 简单情感分析（基于关键词）
		if (enable_sentiment) {
			const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like']
			const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible']

			const positiveCount = words.filter((word: string) =>
				positiveWords.includes(word.toLowerCase())
			).length
			const negativeCount = words.filter((word: string) =>
				negativeWords.includes(word.toLowerCase())
			).length

			result.sentiment_score = positiveCount - negativeCount
		}

		return result
	}

	// JSON格式化处理
	static async processJsonFormatter(input: any, config: any): Promise<any> {
		const { json_data } = input
		const { indent_size, sort_keys } = config.parameters

		try {
			const parsed = JSON.parse(json_data)
			let formattedJson: string

			if (sort_keys) {
				const sorted = this.sortObjectKeys(parsed)
				formattedJson = JSON.stringify(sorted, null, indent_size)
			} else {
				formattedJson = JSON.stringify(parsed, null, indent_size)
			}

			return {
				formatted_json: formattedJson,
				is_valid: true,
				error_message: '',
			}
		} catch (error) {
			return {
				formatted_json: '',
				is_valid: false,
				error_message: error instanceof Error ? error.message : 'Invalid JSON',
			}
		}
	}

	// 图片压缩处理（模拟实现）
	static async processImageCompressor(input: any, config: any): Promise<any> {
		const { image_data, filename } = input
		const { quality, max_width, max_height, format } = config.parameters

		// 这里只是模拟，实际实现需要图片处理库
		// 在实际项目中，你可能需要使用 Canvas API 或图片处理库

		return {
			compressed_image: image_data, // 实际应该是压缩后的base64
			original_size: image_data.length,
			compressed_size: Math.floor(image_data.length * quality),
			compression_ratio: quality,
		}
	}

	// 辅助方法：递归排序对象键
	private static sortObjectKeys(obj: any): any {
		if (Array.isArray(obj)) {
			return obj.map((item) => this.sortObjectKeys(item))
		}

		if (obj !== null && typeof obj === 'object') {
			const sorted: any = {}
			Object.keys(obj)
				.sort()
				.forEach((key) => {
					sorted[key] = this.sortObjectKeys(obj[key])
				})
			return sorted
		}

		return obj
	}
}

// ==================== 扩展的API服务 ====================

export class ExtendedToolAPIService {
	constructor(private toolRegistry: any) {}

	async executeTool(toolId: string, input: any): Promise<any> {
		const tool = this.toolRegistry.getTool(toolId)
		if (!tool) {
			throw new Error(`Tool ${toolId} not found`)
		}

		// 检查是否是本地处理工具
		if (!tool.config.apiEndpoint) {
			return this.executeLocalTool(toolId, input, tool)
		}

		// 执行API工具
		return this.executeAPITool(toolId, input, tool)
	}

	private async executeLocalTool(toolId: string, input: any, tool: ToolDefinition): Promise<any> {
		switch (toolId) {
			case 'text-analyzer':
				return LocalToolProcessor.processTextAnalyzer(input, tool)
			case 'json-formatter':
				return LocalToolProcessor.processJsonFormatter(input, tool)
			case 'image-compressor':
				return LocalToolProcessor.processImageCompressor(input, tool)
			default:
				throw new Error(`Local tool ${toolId} not implemented`)
		}
	}

	private async executeAPITool(toolId: string, input: any, tool: ToolDefinition): Promise<any> {
		const requestBody = {
			...tool.config.parameters,
			...input,
		}

		const response = await fetch(tool.config.apiEndpoint!, {
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
}

// ==================== 使用示例 ====================

export const customTools: ToolDefinition[] = [
	translationTool,
	textAnalyzerTool,
	jsonFormatterTool,
	imageCompressorTool,
]

// 使用示例
export async function exampleUsage() {
	// 1. 创建工具注册表
	const toolRegistry = new (await import('./ToolChainEditor')).ToolRegistry(customTools)

	// 2. 创建扩展的API服务
	const apiService = new ExtendedToolAPIService(toolRegistry)

	// 3. 执行本地文本分析工具
	const textAnalysisResult = await apiService.executeTool('text-analyzer', {
		text: 'This is a great example of text analysis. I love this tool!',
	})

	console.log('Text Analysis Result:', textAnalysisResult)

	// 4. 执行JSON格式化工具
	const jsonResult = await apiService.executeTool('json-formatter', {
		json_data: '{"b":2,"a":1,"c":3}',
	})

	console.log('JSON Format Result:', jsonResult)
}
