import { createAgentAction, Streaming, ThinkAction } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { ThinkActionUtil } from '../ThinkActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('ThinkActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let thinkUtil: ThinkActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		thinkUtil = new ThinkActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('getInfo', () => {
		it('should return correct info for action with text and 0ms time', () => {
			const action = createAgentAction({
				_type: 'think',
				text: 'I need to think about this',
				complete: true,
				time: 0,
			})

			const info = thinkUtil.getInfo(action)

			expect(info).toEqual({
				icon: 'brain',
				description: 'I need to think about this',
				summary: 'Thought for less than a second',
				pose: 'thinking',
			})
		})

		it('should return correct info for action with text and 1000ms time', () => {
			const action = createAgentAction({
				_type: 'think',
				text: 'This requires careful thought',
				complete: true,
				time: 1000,
			})

			const info = thinkUtil.getInfo(action)

			expect(info).toEqual({
				icon: 'brain',
				description: 'This requires careful thought',
				summary: 'Thought for 1 second',
				pose: 'thinking',
			})
		})

		it('should return correct info for action with text and 5000ms time', () => {
			const action = createAgentAction({
				_type: 'think',
				text: 'This is complex',
				complete: true,
				time: 5000,
			})

			const info = thinkUtil.getInfo(action)

			expect(info).toEqual({
				icon: 'brain',
				description: 'This is complex',
				summary: 'Thought for 5 seconds',
				pose: 'thinking',
			})
		})

		it('should return correct info for action with text and 1500ms time (rounds down)', () => {
			const action = createAgentAction({
				_type: 'think',
				text: 'Almost 2 seconds',
				complete: true,
				time: 1500,
			})

			const info = thinkUtil.getInfo(action)

			expect(info).toEqual({
				icon: 'brain',
				description: 'Almost 2 seconds',
				summary: 'Thought for 1 second',
				pose: 'thinking',
			})
		})

		it('should return "Thinking..." description when text is missing and complete is false', () => {
			const action = {
				_type: 'think' as const,
				complete: false as const,
				time: 1000,
			} as Streaming<ThinkAction>

			const info = thinkUtil.getInfo(action)

			expect(info).toEqual({
				icon: 'brain',
				description: 'Thinking...',
				summary: 'Thought for 1 second',
				pose: 'thinking',
			})
		})

		it('should return null description when text is missing and complete is true', () => {
			const action = {
				_type: 'think' as const,
				complete: true as const,
				time: 1000,
			} as Streaming<ThinkAction>

			const info = thinkUtil.getInfo(action)

			expect(info).toEqual({
				icon: 'brain',
				description: null,
				summary: 'Thought for 1 second',
				pose: 'thinking',
			})
		})
	})

	describe('static type', () => {
		it('should have correct static type', () => {
			expect(ThinkActionUtil.type).toBe('think')
		})
	})
})
