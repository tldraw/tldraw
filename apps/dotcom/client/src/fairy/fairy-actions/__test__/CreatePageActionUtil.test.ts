import { createAgentAction } from '@tldraw/fairy-shared'
import { Editor, PageRecordType } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { CreatePageActionUtil } from '../CreatePageActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('CreatePageActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let createPageUtil: CreatePageActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		createPageUtil = new CreatePageActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'New Page',
				switchToPage: false,
				intent: 'test',
				complete: false,
				time: 0,
			})

			const createPageSpy = vi.spyOn(editor, 'createPage')
			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			expect(createPageSpy).not.toHaveBeenCalled()
		})

		it('should create a new page with the given name', () => {
			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'New Page',
				switchToPage: false,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const initialPageCount = editor.getPages().length
			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			const pages = editor.getPages()
			expect(pages.length).toBe(initialPageCount + 1)
			expect(pages.some((p) => p.name === 'New Page')).toBe(true)
		})

		it('should not switch to new page when switchToPage is false', () => {
			const currentPageId = editor.getCurrentPageId()

			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'New Page',
				switchToPage: false,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			// Current page should not change
			expect(editor.getCurrentPageId()).toBe(currentPageId)
		})

		it('should switch to new page when switchToPage is true', () => {
			const initialPageId = editor.getCurrentPageId()

			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'New Page',
				switchToPage: true,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			// Should be on the new page
			const currentPage = editor.getCurrentPage()
			expect(currentPage.name).toBe('New Page')
			expect(editor.getCurrentPageId()).not.toBe(initialPageId)
		})

		it('should update fairy entity current page ID when switching', () => {
			const initialFairyPageId = agent.getEntity().currentPageId

			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'New Page',
				switchToPage: true,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			// Verify the fairy entity's current page ID actually changed
			const newFairyPageId = agent.getEntity().currentPageId
			expect(newFairyPageId).not.toBe(initialFairyPageId)
			expect(newFairyPageId).toBe(editor.getCurrentPageId())
		})

		it('should move fairy to center of viewport when switching', () => {
			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'New Page',
				switchToPage: true,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should not move fairy when not switching pages', () => {
			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'New Page',
				switchToPage: false,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})

		it('should not create page if one with same name exists', () => {
			const page2Id = PageRecordType.createId()
			editor.createPage({ name: 'Existing Page', id: page2Id })

			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'Existing Page',
				switchToPage: false,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const initialPageCount = editor.getPages().length
			const scheduleSpy = vi.spyOn(agent, 'schedule')
			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			expect(editor.getPages().length).toBe(initialPageCount)
			expect(scheduleSpy).toHaveBeenCalled()
			const scheduleCall = scheduleSpy.mock.calls[0][0]
			if (
				typeof scheduleCall === 'object' &&
				scheduleCall !== null &&
				!Array.isArray(scheduleCall) &&
				'data' in scheduleCall &&
				Array.isArray(scheduleCall.data)
			) {
				expect(scheduleCall.data[0]).toContain('already exists')
			}
		})

		it('should not create page in readonly mode', () => {
			vi.spyOn(editor, 'getIsReadonly').mockReturnValue(true)

			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'New Page',
				switchToPage: false,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const initialPageCount = editor.getPages().length
			const scheduleSpy = vi.spyOn(agent, 'schedule')
			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			expect(editor.getPages().length).toBe(initialPageCount)
			expect(scheduleSpy).toHaveBeenCalled()
			const scheduleCall = scheduleSpy.mock.calls[0][0]
			if (
				typeof scheduleCall === 'object' &&
				scheduleCall !== null &&
				!Array.isArray(scheduleCall) &&
				'data' in scheduleCall &&
				Array.isArray(scheduleCall.data)
			) {
				expect(scheduleCall.data[0]).toContain('readonly mode')
			}
		})

		it('should not create page if max pages limit reached', () => {
			// Mock the maxPages option
			vi.spyOn(editor.options, 'maxPages', 'get').mockReturnValue(2)

			// Create pages up to the limit
			const page2Id = PageRecordType.createId()
			editor.createPage({ name: 'Page 2', id: page2Id })

			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'Page 3',
				switchToPage: false,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const scheduleSpy = vi.spyOn(agent, 'schedule')
			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			expect(scheduleSpy).toHaveBeenCalled()
			const scheduleCall = scheduleSpy.mock.calls[0][0]
			if (
				typeof scheduleCall === 'object' &&
				scheduleCall !== null &&
				!Array.isArray(scheduleCall) &&
				'data' in scheduleCall &&
				Array.isArray(scheduleCall.data)
			) {
				expect(scheduleCall.data[0]).toContain('maximum number of pages')
			}
		})

		it('should mark history stopping point when creating page', () => {
			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'New Page',
				switchToPage: false,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const markHistorySpy = vi.spyOn(editor, 'markHistoryStoppingPoint')
			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			expect(markHistorySpy).toHaveBeenCalledWith('creating page')
		})

		it('should handle page names with special characters', () => {
			const action = createAgentAction({
				_type: 'create-page',
				pageName: 'Page-With-Dashes & Symbols!',
				switchToPage: false,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			const pages = editor.getPages()
			expect(pages.some((p) => p.name === 'Page-With-Dashes & Symbols!')).toBe(true)
		})

		it('should handle empty page name', () => {
			const action = createAgentAction({
				_type: 'create-page',
				pageName: '',
				switchToPage: false,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			const pages = editor.getPages()
			expect(pages.some((p) => p.name === '')).toBe(true)
		})

		it('should handle very long page names', () => {
			const longName = 'A'.repeat(500)

			const action = createAgentAction({
				_type: 'create-page',
				pageName: longName,
				switchToPage: false,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			createPageUtil.applyAction(action, helpers)

			const pages = editor.getPages()
			expect(pages.some((p) => p.name === longName)).toBe(true)
		})
	})
})
