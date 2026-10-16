import type { TLShape, TLShapeId, TLShapePartial } from '@tldraw/editor'
import type { AppContext } from '../app/context'
import { getShapePlaintext, plaintextToRichText } from '../editor/richText'
import type { KeyEvent } from '../terminal/InputParser'
import { graphemes } from '../terminal/width'

export type EditKeyResult = 'consumed' | 'complete'

/**
 * Plain-text editing of the shape `editor.getEditingShapeId()` points at. tldraw's own editor is
 * TipTap in a contenteditable, which does not exist headlessly, so this keeps the text as grapheme
 * clusters with a caret index, writes every change back as `richText` (frames: `name`) and
 * publishes the caret through `ui.editCaret` for the renderer. Starting and ending the session is
 * the input controller's job; it follows `getEditingShapeId()`.
 */
export class TextEditSession {
	readonly shapeId: TLShapeId
	private readonly shapeType: string
	private readonly isFrame: boolean
	/** False for editable shapes without text (video, embed): keys are swallowed, nothing is written. */
	private readonly hasText: boolean
	private cells: string[]
	private caret: number

	constructor(
		private readonly ctx: AppContext,
		shape: TLShape
	) {
		this.shapeId = shape.id
		this.shapeType = shape.type
		this.isFrame = shape.type === 'frame'
		const text = getShapePlaintext(ctx.editor, shape)
		this.hasText = text !== null
		this.cells = text ? graphemes(text) : []
		// tldraw selects all text on Enter; without a selection model the caret goes to the end.
		this.caret = this.cells.length
		this.publishCaret()
	}

	getText(): string {
		return this.cells.join('')
	}

	/** Caret position as a grapheme index into `getText()`. */
	getCaret(): number {
		return this.caret
	}

	setCaret(index: number): void {
		this.caret = Math.max(0, Math.min(this.cells.length, index))
		this.publishCaret()
	}

	/** Called when the shape stops being edited; clears the published caret. */
	end(): void {
		const caret = this.ctx.ui.editCaret.get()
		if (caret && caret.shapeId === this.shapeId) this.ctx.ui.editCaret.set(null)
	}

	insert(text: string): void {
		if (text.length === 0) return
		const added = graphemes(text)
		this.cells.splice(this.caret, 0, ...added)
		this.caret += added.length
		this.commit()
	}

	/** Every key while editing is consumed; `complete` asks the caller to run `editor.complete()`. */
	handleKey(event: KeyEvent): EditKeyResult {
		switch (event.key) {
			case 'Escape':
				return 'complete'
			case 'Enter':
				// alt+Enter is `ESC CR` on every alt-as-meta terminal; ctrl+Enter needs full keys.
				if (event.alt || event.ctrl) return 'complete'
				this.insert('\n')
				return 'consumed'
			case 'Backspace':
				if (event.ctrl || event.alt) this.deleteWordBack()
				else this.deleteBack()
				return 'consumed'
			case 'Delete':
				this.deleteForward()
				return 'consumed'
			case 'ArrowLeft':
				this.setCaret(this.caret - 1)
				return 'consumed'
			case 'ArrowRight':
				this.setCaret(this.caret + 1)
				return 'consumed'
			case 'ArrowUp':
				this.moveLine(-1)
				return 'consumed'
			case 'ArrowDown':
				this.moveLine(1)
				return 'consumed'
			case 'Home':
				this.setCaret(event.ctrl ? 0 : this.lineStart(this.caret))
				return 'consumed'
			case 'End':
				this.setCaret(event.ctrl ? this.cells.length : this.lineEnd(this.caret))
				return 'consumed'
			case 'Tab':
				return 'consumed'
		}
		const text = insertableText(event)
		if (text !== null) this.insert(text)
		return 'consumed'
	}

	private deleteBack() {
		if (this.caret === 0) return
		this.cells.splice(this.caret - 1, 1)
		this.caret--
		this.commit()
	}

	private deleteForward() {
		if (this.caret >= this.cells.length) return
		this.cells.splice(this.caret, 1)
		this.commit()
	}

	private deleteWordBack() {
		if (this.caret === 0) return
		let start = this.caret
		while (start > 0 && isSpace(this.cells[start - 1])) start--
		while (start > 0 && !isSpace(this.cells[start - 1])) start--
		this.cells.splice(start, this.caret - start)
		this.caret = start
		this.commit()
	}

	private lineStart(index: number): number {
		let i = index
		while (i > 0 && this.cells[i - 1] !== '\n') i--
		return i
	}

	private lineEnd(index: number): number {
		let i = index
		while (i < this.cells.length && this.cells[i] !== '\n') i++
		return i
	}

	private moveLine(delta: number) {
		const start = this.lineStart(this.caret)
		const column = this.caret - start
		let target: number
		if (delta < 0) {
			if (start === 0) {
				this.setCaret(0)
				return
			}
			target = this.lineStart(start - 1)
		} else {
			const end = this.lineEnd(this.caret)
			if (end >= this.cells.length) {
				this.setCaret(this.cells.length)
				return
			}
			target = end + 1
		}
		this.setCaret(Math.min(target + column, this.lineEnd(target)))
	}

	private commit() {
		if (this.hasText) {
			const text = this.getText()
			const props = this.isFrame ? { name: text } : { richText: plaintextToRichText(text) }
			this.ctx.editor.updateShape({
				id: this.shapeId,
				type: this.shapeType,
				props,
			} as TLShapePartial)
		}
		this.publishCaret()
	}

	private publishCaret() {
		this.ctx.ui.editCaret.set({ shapeId: this.shapeId, caret: this.caret })
	}
}

function isSpace(cell: string): boolean {
	return cell === ' ' || cell === '\n' || cell === '\t'
}

/** The text a key press inserts, or null for chords and named keys. */
export function insertableText(event: KeyEvent): string | null {
	if (event.ctrl || event.alt || event.meta) return null
	if (event.text !== undefined && event.text.length > 0) return event.text
	if (event.key === ' ') return ' '
	// One code point: named keys (`F1`, `Home`) are longer, control characters are not printable.
	if ([...event.key].length !== 1) return null
	const code = event.key.codePointAt(0)!
	if (code < 0x20 || code === 0x7f) return null
	return event.key
}
