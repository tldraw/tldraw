import { Mark, Node as TiptapNodeExtension } from '@tiptap/core'
import { TLFontFace, TLRichText } from '@tldraw/tlschema'
import { TestEditor } from '../test/TestEditor'
import { getFontsFromRichText, getTipTapSchema, RichTextFontVisitor } from './richText'

const Document = TiptapNodeExtension.create({ name: 'doc', topNode: true, content: 'block+' })
const Paragraph = TiptapNodeExtension.create({
	name: 'paragraph',
	group: 'block',
	content: 'inline*',
	addAttributes() {
		return { family: { default: null } }
	},
})
const Text = TiptapNodeExtension.create({ name: 'text', group: 'inline' })
const Bold = Mark.create({ name: 'bold' })

const tipTapConfig = { extensions: [Document, Paragraph, Text, Bold] }

const fonts = {
	sansRegular: { family: 'sans', weight: '400', style: 'normal', src: { url: 'sans-400' } },
	sansBold: { family: 'sans', weight: '700', style: 'normal', src: { url: 'sans-700' } },
	monoRegular: { family: 'mono', weight: '400', style: 'normal', src: { url: 'mono-400' } },
} satisfies Record<string, TLFontFace>

// Paragraph attributes override the inherited family, bold marks bump the weight, and only text
// nodes register a font so the visitor's state threading is observable.
const addFontsFromNode: RichTextFontVisitor = (node, state, addFont) => {
	if (node.type.name === 'paragraph' && node.attrs.family) {
		state = { ...state, family: node.attrs.family }
	}
	if (node.marks.some((m) => m.type.name === 'bold')) {
		state = { ...state, weight: '700' }
	}
	if (node.isText) {
		const font = Object.values(fonts).find(
			(f) => f.family === state.family && f.weight === state.weight
		)
		if (font) addFont(font)
	}
	return state
}

const initialState = { family: 'sans', weight: '400', style: 'normal' }

describe('getTipTapSchema', () => {
	it('builds a schema from the config extensions', () => {
		const schema = getTipTapSchema(tipTapConfig)
		expect(Object.keys(schema.nodes)).toEqual(['doc', 'paragraph', 'text'])
		expect(Object.keys(schema.marks)).toEqual(['bold'])
	})

	it('caches the schema per config object', () => {
		const a = getTipTapSchema(tipTapConfig)
		expect(getTipTapSchema(tipTapConfig)).toBe(a)
		expect(getTipTapSchema({ extensions: [Document, Paragraph, Text, Bold] })).not.toBe(a)
	})
})

describe('getFontsFromRichText', () => {
	let editor: TestEditor

	afterEach(() => {
		editor?.dispose()
	})

	function richText(content: TLRichText['content']): TLRichText {
		return { type: 'doc', content }
	}

	it('throws when text options are missing', () => {
		editor = new TestEditor()
		expect(() => getFontsFromRichText(editor, richText([]), initialState)).toThrow(
			'Cannot use text without setting textOptions'
		)
	})

	it('throws when addFontsFromNode is not configured', () => {
		editor = new TestEditor({ textOptions: { tipTapConfig } })
		expect(() => getFontsFromRichText(editor, richText([]), initialState)).toThrow(
			'textOptions.addFontsFromNode must be set'
		)
	})

	describe('with a configured visitor', () => {
		beforeEach(() => {
			editor = new TestEditor({ textOptions: { tipTapConfig, addFontsFromNode } })
		})

		it('returns no fonts for an empty document', () => {
			expect(getFontsFromRichText(editor, richText([]), initialState)).toEqual([])
		})

		it('collects the font used by plain text from the initial state', () => {
			const rt = richText([{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }])
			expect(getFontsFromRichText(editor, rt, initialState)).toEqual([fonts.sansRegular])
		})

		it('dedupes fonts used by multiple text nodes', () => {
			const rt = richText([
				{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
			])
			expect(getFontsFromRichText(editor, rt, initialState)).toEqual([fonts.sansRegular])
		})

		it('threads visitor state from parents to children and resets between siblings', () => {
			const rt = richText([
				{
					type: 'paragraph',
					attrs: { family: 'mono' },
					content: [{ type: 'text', text: 'code' }],
				},
				{ type: 'paragraph', content: [{ type: 'text', text: 'prose' }] },
			])
			expect(getFontsFromRichText(editor, rt, initialState)).toEqual([
				fonts.monoRegular,
				fonts.sansRegular,
			])
		})

		it('lets marks on text nodes change the selected font', () => {
			const rt = richText([
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'regular ' },
						{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
					],
				},
			])
			expect(getFontsFromRichText(editor, rt, initialState)).toEqual([
				fonts.sansRegular,
				fonts.sansBold,
			])
		})

		it('uses the provided initial state rather than a default', () => {
			const rt = richText([{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }])
			expect(
				getFontsFromRichText(editor, rt, { family: 'mono', weight: '400', style: 'normal' })
			).toEqual([fonts.monoRegular])
		})

		it('rejects rich text that does not match the schema', () => {
			const rt = richText([{ type: 'heading', content: [{ type: 'text', text: 'x' }] }])
			expect(() => getFontsFromRichText(editor, rt, initialState)).toThrow()
		})
	})
})
