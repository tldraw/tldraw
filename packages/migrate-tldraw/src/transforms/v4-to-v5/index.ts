import type { Transform } from '../../lib/types'
import { v4ToV5AutoFixes } from './autoFixes'
import { v4ToV5CssFlags } from './cssFlags'
import { v4ToV5TsFlags } from './tsFlags'

export const v4ToV5: Transform = {
	id: 'v4-to-v5',
	title: 'tldraw 4.x → 5.0',
	summary: 'Migrate a tldraw v4 project to v5.0',
	expectedFromRange: '4.x',
	producesRange: '5.0',
	sectionsDir: 'sections',
	autoFixes: v4ToV5AutoFixes,
	tsFlags: v4ToV5TsFlags,
	cssFlags: v4ToV5CssFlags,
}
