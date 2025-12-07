import { CDPSession, Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export interface ProfileMetrics {
	scriptingMs: number
	renderingMs: number
	paintingMs: number
	systemMs: number
	idleMs: number
	totalMs: number
	longTasks: number // Tasks > 50ms
	breakdown: {
		category: string
		ms: number
		percentage: number
	}[]
}

export interface TraceEvent {
	name: string
	cat: string
	ph: string
	ts: number
	dur?: number
	pid: number
	tid: number
	args?: Record<string, unknown>
}

export class PerfProfiler {
	private cdp: CDPSession | null = null
	private traceEvents: TraceEvent[] = []
	private isTracing = false

	constructor(private page: Page) {}

	async startTracing(): Promise<void> {
		if (this.isTracing) {
			throw new Error('Tracing already in progress')
		}

		this.cdp = await this.page.context().newCDPSession(this.page)
		this.traceEvents = []
		this.isTracing = true

		await this.cdp.send('Tracing.start', {
			categories: [
				'devtools.timeline',
				'disabled-by-default-devtools.timeline',
				'disabled-by-default-devtools.timeline.frame',
				'v8.execute',
				'blink.user_timing',
			].join(','),
			options: 'sampling-frequency=10000', // 10kHz sampling
		})
	}

	async stopTracing(): Promise<ProfileMetrics> {
		if (!this.isTracing || !this.cdp) {
			throw new Error('No tracing in progress')
		}

		// Collect trace events
		const events: TraceEvent[] = []

		this.cdp.on('Tracing.dataCollected', (data) => {
			events.push(...(data.value as unknown as TraceEvent[]))
		})

		await this.cdp.send('Tracing.end')

		// Wait for trace data to be collected
		await new Promise<void>((resolve) => {
			this.cdp!.once('Tracing.tracingComplete', () => resolve())
		})

		this.traceEvents = events
		this.isTracing = false

		return this.analyzeTrace()
	}

	private analyzeTrace(): ProfileMetrics {
		const categories: Record<string, number> = {
			scripting: 0,
			rendering: 0,
			painting: 0,
			system: 0,
			idle: 0,
		}

		let longTasks = 0
		let minTs = Infinity
		let maxTs = 0

		for (const event of this.traceEvents) {
			if (event.ts < minTs) minTs = event.ts
			if (event.ts > maxTs) maxTs = event.ts

			// Only process complete events (ph === 'X') or duration events
			if (event.ph !== 'X' && !event.dur) continue

			const duration = (event.dur || 0) / 1000 // Convert to ms

			// Categorize based on event name/category
			const category = this.categorizeEvent(event)
			categories[category] += duration

			// Track long tasks (> 50ms)
			if (duration > 50 && category === 'scripting') {
				longTasks++
			}
		}

		const totalMs = (maxTs - minTs) / 1000

		const breakdown = Object.entries(categories)
			.filter(([, ms]) => ms > 0)
			.map(([category, ms]) => ({
				category,
				ms: Math.round(ms * 100) / 100,
				percentage: Math.round((ms / totalMs) * 10000) / 100,
			}))
			.sort((a, b) => b.ms - a.ms)

		return {
			scriptingMs: Math.round(categories.scripting * 100) / 100,
			renderingMs: Math.round(categories.rendering * 100) / 100,
			paintingMs: Math.round(categories.painting * 100) / 100,
			systemMs: Math.round(categories.system * 100) / 100,
			idleMs: Math.round(categories.idle * 100) / 100,
			totalMs: Math.round(totalMs * 100) / 100,
			longTasks,
			breakdown,
		}
	}

	private categorizeEvent(event: TraceEvent): string {
		const name = event.name.toLowerCase()
		const cat = event.cat.toLowerCase()

		// Scripting
		if (
			name.includes('function') ||
			name.includes('evaluate') ||
			name.includes('compile') ||
			name.includes('v8') ||
			cat.includes('v8') ||
			name === 'eventdispatch' ||
			name === 'timerfired' ||
			name === 'xhreadystatechange' ||
			name === 'functioncall'
		) {
			return 'scripting'
		}

		// Rendering (layout, style)
		if (
			name.includes('layout') ||
			name.includes('recalculate') ||
			name.includes('style') ||
			name === 'updatelayertree' ||
			name === 'hittest'
		) {
			return 'rendering'
		}

		// Painting
		if (
			name.includes('paint') ||
			name.includes('composite') ||
			name.includes('raster') ||
			name === 'decodedimage' ||
			name === 'resizeimage'
		) {
			return 'painting'
		}

		// System/other
		if (name.includes('gc') || name.includes('idle') || name === 'program') {
			return 'system'
		}

		return 'system'
	}

	async saveTrace(filename: string): Promise<void> {
		const dir = path.join(process.cwd(), 'e2e', 'traces')
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true })
		}

		const tracePath = path.join(dir, `${filename}.json`)
		fs.writeFileSync(tracePath, JSON.stringify({ traceEvents: this.traceEvents }, null, 2))
		// eslint-disable-next-line no-console
		console.log(`📊 Trace saved to: ${tracePath}`)
	}

	formatMetrics(metrics: ProfileMetrics): string {
		let output = '\n📊 Performance Profile:\n'
		output += `   Total: ${metrics.totalMs}ms\n`
		output += `   Scripting: ${metrics.scriptingMs}ms (${((metrics.scriptingMs / metrics.totalMs) * 100).toFixed(1)}%)\n`
		output += `   Rendering: ${metrics.renderingMs}ms (${((metrics.renderingMs / metrics.totalMs) * 100).toFixed(1)}%)\n`
		output += `   Painting: ${metrics.paintingMs}ms (${((metrics.paintingMs / metrics.totalMs) * 100).toFixed(1)}%)\n`
		output += `   System: ${metrics.systemMs}ms\n`
		output += `   Long tasks (>50ms): ${metrics.longTasks}\n`
		return output
	}
}
