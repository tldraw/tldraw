import { createAgentAction, MessageAction, Streaming } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { MessageActionUtil } from '../MessageActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('MessageActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let messageUtil: MessageActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		messageUtil = new MessageActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('getInfo', () => {
		it('should return correct info for action with text', () => {
			const action = createAgentAction({
				_type: 'message',
				text: 'Hello, this is a message',
				complete: true,
				time: 0,
			})

			const info = messageUtil.getInfo(action)

			expect(info.description).toBe('Hello, this is a message')
			expect(info.pose).toBe('waiting')
			expect(info.canGroup).toBeDefined()
			expect(typeof info.canGroup).toBe('function')
		})

		it('should return empty string description when text is missing', () => {
			const action = {
				_type: 'message' as const,
				complete: false as const,
				time: 1000,
			} as Streaming<MessageAction>

			const info = messageUtil.getInfo(action)

			expect(info.description).toBe('')
		})

		it('should return canGroup function that always returns false', () => {
			const action = createAgentAction({
				_type: 'message',
				text: 'Test message',
				complete: true,
				time: 0,
			})

			const info = messageUtil.getInfo(action)

			expect(info.canGroup).toBeDefined()
			expect(typeof info.canGroup).toBe('function')
			expect(info.canGroup()).toBe(false)
		})
	})

	describe('static type', () => {
		it('should have correct static type', () => {
			expect(MessageActionUtil.type).toBe('message')
		})
	})
})
