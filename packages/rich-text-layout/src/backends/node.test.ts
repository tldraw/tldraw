import { readFileSync } from 'fs'
import { join } from 'path'
import { beforeAll, describe, expect, it } from 'vitest'
import { layoutPlainText } from '../layout/plainText'
import { installMeasureContext } from '../measure/install'
import { createNodeMeasureContext } from './node'

const FONTS = join(__dirname, '../../../assets/fonts')

beforeAll(async () => {
	const ctx = await createNodeMeasureContext({
		fonts: [
			{ family: 'tldraw_sans', data: readFileSync(join(FONTS, 'IBMPlexSans-Medium.woff2')) },
			{ family: 'tldraw_sans', data: readFileSync(join(FONTS, 'IBMPlexSans-Bold.woff2')) },
			{ family: 'tldraw_mono', data: readFileSync(join(FONTS, 'IBMPlexMono-Medium.woff2')) },
		],
	})
	await installMeasureContext(ctx)
})

describe('node backend', () => {
	it('registers woff2 fonts and measures with them', () => {
		const style = { fontFamily: 'tldraw_sans', fontSize: 24, lineHeight: '32px' } as const
		const layout = layoutPlainText('Hello world', { style })
		expect(layout.lines).toHaveLength(1)
		expect(layout.width).toBeGreaterThan(100)
		expect(layout.width).toBeLessThan(160)
		expect(layout.height).toBe(32)

		const mono = layoutPlainText('Hello world', { style: { ...style, fontFamily: 'tldraw_mono' } })
		expect(mono.width).not.toBe(layout.width)

		const bold = layoutPlainText('Hello world', { style: { ...style, fontWeight: 'bold' } })
		expect(bold.width).toBeGreaterThan(layout.width)
	})

	it('wraps real text at a width', () => {
		const layout = layoutPlainText('The quick brown fox jumps over the lazy dog', {
			style: {
				fontFamily: 'tldraw_sans',
				fontSize: 24,
				lineHeight: '32px',
				whiteSpace: 'pre-wrap',
			},
			maxWidth: 200,
		})
		expect(layout.lines.length).toBeGreaterThan(2)
		expect(layout.width).toBe(200)
		for (const line of layout.lines) expect(line.width).toBeLessThanOrEqual(200.01)
	})
})
