/**
 * Comprehensive logging utilities for debugging Mermaid conversions
 */

export const logger = {
	group(label: string) {
		console.group(`🔍 ${label}`)
		console.log(`[${new Date().toISOString()}]`)
	},

	groupEnd() {
		console.groupEnd()
	},

	codeToShapes(code: string, diagramType: string) {
		this.group('Code → Shapes Conversion')
		console.log('Diagram Type:', diagramType)
		console.log('Code Length:', code.length)
		console.log('Code Preview:', code.substring(0, 200))
	},

	shapesToCode(shapeCount: number) {
		this.group('Shapes → Code Conversion')
		console.log('Shape Count:', shapeCount)
	},

	parsing(diagramType: string, input: string) {
		console.log(`📊 Parsing ${diagramType}...`)
		console.log('Input:', input)
	},

	parsed(result: any) {
		console.log('✅ Parsed result:', result)
	},

	shapeCreation(shapeType: string, count: number) {
		console.log(`🔨 Creating ${count} ${shapeType} shapes`)
	},

	shapesCreated(ids: string[]) {
		console.log(`✅ Created ${ids.length} shapes:`, ids)
	},

	geminiRequest(prompt: string, imageSize: { width: number; height: number }) {
		this.group('Gemini API Request')
		console.log('Model:', 'gemini-2.5-flash')
		console.log('Image Size:', imageSize)
		console.log('Prompt:', prompt.substring(0, 500))
	},

	geminiResponse(response: string) {
		console.log('✅ Gemini Response:', response)
		this.groupEnd()
	},

	error(context: string, error: any) {
		console.error(`❌ Error in ${context}:`, error)
		if (error.stack) {
			console.error('Stack:', error.stack)
		}
	},

	success(message: string) {
		console.log(`✅ ${message}`)
		this.groupEnd()
	},
}
