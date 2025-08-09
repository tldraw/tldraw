import { Page } from '@playwright/test'

export interface HeavyBoardOptions {
	shapeCount?: number
	includeGroups?: boolean
	includeText?: boolean
	includeArrows?: boolean
	canvasWidth?: number
	canvasHeight?: number
	seed?: number // For reproducible layouts
}

export class HeavyBoardGenerator {
	constructor(private page: Page) {}

	async generateHeavyBoard(options: HeavyBoardOptions = {}): Promise<void> {
		const {
			shapeCount = 300,
			includeGroups = true,
			includeText = true,
			includeArrows = true,
			canvasWidth = 2000,
			canvasHeight = 1500,
			seed = 12345,
		} = options

		// Clear existing shapes first
		await this.page.keyboard.press('Control+a')
		await this.page.keyboard.press('Backspace')

		// Wait for canvas to be ready
		await this.page.waitForTimeout(100)

		// Generate shapes using editor API injection
		await this.page.evaluate(
			({
				shapeCount,
				includeGroups: _includeGroups,
				includeText,
				includeArrows,
				canvasWidth,
				canvasHeight,
				seed,
			}) => {
				const editor = (window as any).editor
				if (!editor) {
					throw new Error('Editor not found on window')
				}

				// Simple seeded random number generator for reproducible tests
				class SeededRandom {
					private seed: number
					constructor(seed: number) {
						this.seed = seed
					}

					next(): number {
						this.seed = (this.seed * 9301 + 49297) % 233280
						return this.seed / 233280
					}

					range(min: number, max: number): number {
						return Math.floor(this.next() * (max - min + 1)) + min
					}

					choice<T>(array: T[]): T {
						return array[this.range(0, array.length - 1)]
					}
				}

				const random = new SeededRandom(seed)
				const shapes: any[] = []

				// Shape types and their weights
				const shapeTypes = [
					{ type: 'geo', weight: 50 }, // rectangles, ellipses, etc.
					{ type: 'text', weight: includeText ? 25 : 0 },
					{ type: 'arrow', weight: includeArrows ? 25 : 0 },
					{ type: 'note', weight: 25 },
					{ type: 'draw', weight: 25 },
				].filter((s) => s.weight > 0)

				// Generate base shapes
				for (let i = 0; i < shapeCount; i++) {
					const x = random.range(0, canvasWidth)
					const y = random.range(0, canvasHeight)
					const width = random.range(50, 200)
					const height = random.range(30, 150)

					// Pick shape type based on weights
					let weightSum = 0
					const targetWeight = random.next() * shapeTypes.reduce((sum, s) => sum + s.weight, 0)
					const shapeType =
						shapeTypes.find((s) => (weightSum += s.weight) >= targetWeight)?.type || 'geo'

					let shape: any

					switch (shapeType) {
						case 'geo': {
							const geoTypes = ['rectangle', 'ellipse', 'triangle', 'diamond', 'hexagon', 'star']
							shape = {
								id: `shape:${i}`,
								type: 'geo',
								x,
								y,
								props: {
									w: width,
									h: height,
									geo: random.choice(geoTypes),
									color: random.choice([
										'black',
										'blue',
										'green',
										'red',
										'yellow',
										'orange',
										'violet',
									]),
									fill: random.choice(['none', 'semi', 'solid']),
									size: random.choice(['s', 'm', 'l', 'xl']),
								},
							}
							break
						}

						case 'draw': {
							// Create a simple drawn shape with some points
							const numPoints = random.range(3, 8)
							const points: Array<{ x: number; y: number; z: number }> = []
							for (let p = 0; p < numPoints; p++) {
								points.push({
									x: random.range(0, width),
									y: random.range(0, height),
									z: 0.5,
								})
							}
							shape = {
								id: `shape:${i}`,
								type: 'draw',
								x,
								y,
								props: {
									segments: [
										{
											type: 'free',
											points,
										},
									],
									color: random.choice(['black', 'blue', 'green', 'red']),
									size: random.choice(['s', 'm', 'l']),
								},
							}
							break
						}

						case 'text': {
							const tldrawApi = (window as any).tldrawApi
							const textSamples = [
								'Performance Test',
								'Lorem ipsum dolor sit amet',
								'Heavy Board Test',
								'Sample Text ' + i,
								'Multi-line\nText Content',
								'Longer text content for testing purposes',
							]
							shape = {
								id: `shape:${i}`,
								type: 'text',
								x,
								y,
								props: {
									richText: tldrawApi.toRichText(random.choice(textSamples)),
									color: random.choice(['black', 'blue', 'green', 'red']),
									size: random.choice(['s', 'm', 'l', 'xl']),
									font: 'draw',
								},
							}
							break
						}

						case 'arrow': {
							const endX = x + random.range(-200, 200)
							const endY = y + random.range(-200, 200)
							shape = {
								id: `shape:${i}`,
								type: 'arrow',
								x,
								y,
								props: {
									start: { x: 0, y: 0 },
									end: { x: endX - x, y: endY - y },
									color: random.choice(['black', 'blue', 'green', 'red']),
									size: random.choice(['s', 'm', 'l']),
									arrowheadStart: random.choice(['none', 'arrow', 'triangle']),
									arrowheadEnd: random.choice(['arrow', 'triangle', 'dot']),
								},
							}
							break
						}

						case 'note': {
							const tldrawApi = (window as any).tldrawApi
							shape = {
								id: `shape:${i}`,
								type: 'note',
								x,
								y,
								props: {
									richText: tldrawApi.toRichText(`Note ${i}\nPerformance testing note`),
									color: random.choice(['black', 'blue', 'green', 'red', 'yellow']),
									size: random.choice(['s', 'm', 'l']),
								},
							}
							break
						}
					}

					if (shape) {
						shapes.push(shape)
					}
				}

				// Create all shapes at once
				editor.createShapes(shapes)

				// Skip grouping for now - will add back later when debugging shape creation issues
				// TODO: Re-enable grouping once basic shape generation is working

				// Zoom to fit all content
				editor.zoomToFit()

				// eslint-disable-next-line no-console
				console.log(`Generated heavy board with ${shapes.length} shapes`)
			},
			{ shapeCount, includeGroups, includeText, includeArrows, canvasWidth, canvasHeight, seed }
		)

		// Wait for rendering to settle
		await this.page.waitForTimeout(1000)
	}

	async setupStressTestBoard(shapeCount: number): Promise<void> {
		// Pre-configured stress test with maximum complexity
		await this.generateHeavyBoard({
			shapeCount,
			includeGroups: true,
			includeText: true,
			includeArrows: true,
			canvasWidth: 3000,
			canvasHeight: 2500,
			seed: 42, // Fixed seed for consistent tests
		})
	}

	async getShapeCount(): Promise<number> {
		return await this.page.evaluate(() => {
			const editor = (window as any).editor
			return editor ? editor.getCurrentPageShapes().length : 0
		})
	}

	async selectRandomShapes(count: number, seed: number = 12345): Promise<void> {
		await this.page.evaluate(
			({ count, seed }) => {
				const editor = (window as any).editor
				if (!editor) return

				// Simple seeded random number generator for reproducible tests
				class SeededRandom {
					private seed: number
					constructor(seed: number) {
						this.seed = seed
					}

					next(): number {
						this.seed = (this.seed * 9301 + 49297) % 233280
						return this.seed / 233280
					}

					range(min: number, max: number): number {
						return Math.floor(this.next() * (max - min + 1)) + min
					}
				}

				const random = new SeededRandom(seed)
				const allShapes = editor.getCurrentPageShapes()
				const selectedCount = Math.min(count, allShapes.length)

				// Select random shapes using seeded random
				const shuffled = allShapes.sort(() => 0.5 - random.next())
				const selected = shuffled.slice(0, selectedCount)
				const shapeIds = selected.map((shape: any) => shape.id)

				editor.setSelectedShapes(shapeIds)
			},
			{ count, seed }
		)
	}
}
