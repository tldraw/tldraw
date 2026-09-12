import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { toRichText } from 'tldraw'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { CommentComposer } from './comment-composer'

// TipTap detects Next.js at import time, including in client-only components.
vi.hoisted(() => {
	Object.defineProperty(window, 'next', { value: {}, configurable: true })
})

afterAll(() => {
	Reflect.deleteProperty(window, 'next')
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('CommentComposer in Next.js', () => {
	it('renders the server shell without constructing the editor', () => {
		const html = renderToString(
			<CommentComposer
				author={{ name: 'You' }}
				placeholder="Add a comment"
				value={toRichText('Saved draft')}
				onChange={() => {}}
			/>
		)

		expect(html).toContain('tlui-cmt-composer')
		expect(html).not.toContain('contenteditable')
	})

	it('mounts an editable composer and applies controlled resets after the deferred mount', async () => {
		vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
		const container = document.createElement('div')
		document.body.appendChild(container)
		const root = createRoot(container)
		const onSubmit = vi.fn()
		const onChange = vi.fn()
		const renderComposer = (text: string) => (
			<CommentComposer
				author={{ name: 'You' }}
				placeholder="Add a comment"
				value={toRichText(text)}
				onChange={onChange}
				onSubmit={onSubmit}
			/>
		)

		try {
			await act(async () => root.render(renderComposer('Saved draft')))
			const input = container.querySelector<HTMLElement>('[role="textbox"]')
			expect(input?.getAttribute('contenteditable')).toBe('true')
			expect(input?.textContent).toBe('Saved draft')

			await act(async () => root.render(renderComposer('Updated draft')))
			expect(input?.textContent).toBe('Updated draft')

			await act(async () => {
				input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
			})
			expect(onSubmit).toHaveBeenCalledOnce()
		} finally {
			await act(async () => root.unmount())
			container.remove()
		}
	})
})
