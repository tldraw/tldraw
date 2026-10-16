import type { TLShape, TLShapeId, TLShapePartial } from '@tldraw/editor'
import type { AppContext } from '../app/context'
import { getShapePlaintext, plaintextToRichText } from '../editor/richText'
import type { KeyEvent } from '../terminal/InputParser'
import { graphemes, stringWidth } from '../terminal/width'

export type EditKeyResult = 'consumed' | 'complete'

/**
 * Plain-text editing of the shape `editor.getEditingShapeId()` points at. tldraw's own editor is
 * TipTap in a contenteditable, which does not exist headlessly, so this keeps the text as grapheme
 * clusters with a caret index, writes every change back as `richText` (frames: `name`) and
 * publishes the caret through `ui.editCaret` for the renderer. The only selection is "everything"
 * (what tldraw asks for on Enter and the edit-text action); it collapses on the first caret move.
 * Starting and ending the session is the input controller's job; it follows `getEditingShapeId()`.
 */
export class TextEditSession {
	readonly shapeId: TLShapeId
	private readonly shapeType: string
	/** Frame names are single-line fields (FrameLabelInput is an `<input>`): Enter finishes, newlines become spaces. */
	private readonly singleLine: boolean
	/** False for editable shapes without text (video, embed): keys are swallowed, nothing is written. */
	private readonly hasText: boolean
	private cells: string[]
	private caret: number
	private allSelected = false

	constructor(
		private readonly ctx: AppContext,
		shape: TLShape
	) {
		this.shapeId = shape.id
		this.shapeType = shape.type
		this.singleLine = shape.type === 'frame'
		const text = getShapePlaintext(ctx.editor, shape)
		this.hasText = text !== null
		this.cells = text ? graphemes(text) : []
		// Double click places the caret at the end; Enter and edit-text select all (`selectAll`).
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

	/** Whether the whole text is selected, so the next insertion or deletion replaces it. */
	isAllSelected(): boolean {
		return this.allSelected
	}

	setCaret(index: number): void {
		this.allSelected = false
		this.caret = Math.max(0, Math.min(this.cells.length, index))
		this.publishCaret()
	}

	/** Selects the whole text (tldraw's `select-all-text`); a no-op on an empty text. */
	selectAll(): void {
		if (this.cells.length === 0) return
		this.allSelected = true
		this.caret = this.cells.length
		this.publishCaret()
	}

	/** Called when the shape stops being edited; clears the published caret. */
	end(): void {
		const caret = this.ctx.ui.editCaret.get()
		if (caret && caret.shapeId === this.shapeId) this.ctx.ui.editCaret.set(null)
	}

	insert(text: string): void {
		if (text.length === 0) return
		const clean = this.singleLine ? text.replace(/\r\n|\r|\n/g, ' ') : text
		const added = graphemes(clean)
		if (this.allSelected) {
			this.cells = added
			this.caret = added.length
			this.allSelected = false
		} else {
			this.cells.splice(this.caret, 0, ...added)
			this.caret += added.length
		}
		this.commit()
	}

	/** Every key while editing is consumed; `complete` asks the caller to run `editor.complete()`. */
	handleKey(event: KeyEvent): EditKeyResult {
		switch (event.key) {
			case 'Escape':
				return 'complete'
			case 'Enter':
				// alt+Enter is `ESC CR` on every alt-as-meta terminal; ctrl+Enter needs full keys.
				if (event.alt || event.ctrl || this.singleLine) return 'complete'
				this.insert('\n')
				return 'consumed'
			case 'Backspace':
				if (this.allSelected) this.deleteAll()
				else if (event.ctrl || event.alt) this.deleteWordBack()
				else this.deleteBack()
				return 'consumed'
			case 'Delete':
				if (this.allSelected) this.deleteAll()
				else this.deleteForward()
				return 'consumed'
			case 'ArrowLeft':
				this.setCaret(this.allSelected ? 0 : this.caret - 1)
				return 'consumed'
			case 'ArrowRight':
				this.setCaret(this.allSelected ? this.cells.length : this.caret + 1)
				return 'consumed'
			case 'ArrowUp':
				if (this.allSelected) this.setCaret(0)
				else this.moveLine(-1)
				return 'consumed'
			case 'ArrowDown':
				if (this.allSelected) this.setCaret(this.cells.length)
				else this.moveLine(1)
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

	private deleteAll() {
		this.cells = []
		this.caret = 0
		this.allSelected = false
		this.commit()
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

	/** Up/down keep the visual column (cell width), not the grapheme index: wide glyphs count twice. */
	private moveLine(delta: number) {
		const start = this.lineStart(this.caret)
		const column = stringWidth(this.cells.slice(start, this.caret).join(''))
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
		const targetEnd = this.lineEnd(target)
		let index = target
		let width = 0
		while (index < targetEnd) {
			const w = stringWidth(this.cells[index])
			if (width + w > column) break
			width += w
			index++
		}
		this.setCaret(index)
	}

	private commit() {
		if (this.hasText) {
			const text = this.getText()
			const props = this.singleLine ? { name: text } : { richText: plaintextToRichText(text) }
			this.ctx.editor.updateShape({
				id: this.shapeId,
				type: this.shapeType,
				props,
			} as TLShapePartial)
		}
		this.publishCaret()
	}

	private publishCaret() {
		this.ctx.ui.editCaret.set({
			shapeId: this.shapeId,
			caret: this.caret,
			selectAll: this.allSelected,
		})
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
