import {
	combineTransactionSteps,
	findChildrenInRange,
	getChangedRanges,
	mergeAttributes,
	Node,
} from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion'

// See `addAttributes` below
interface EmojiNodeAttrs {
	emoji: string
}

interface EmojiOptions<SuggestionItem = any, Attrs extends Record<string, any> = EmojiNodeAttrs> {
	/**
	 * The HTML attributes for an emoji node.
	 * @default {}
	 * @example { class: 'foo' }
	 */
	HTMLAttributes: Record<string, any>

	/**
	 * The suggestion options.
	 * @default {}
	 * @example { char: '@', pluginKey: EmojiPluginKey, command: ({ editor, range, props }) => { ... } }
	 */
	suggestion: Omit<SuggestionOptions<SuggestionItem, Attrs>, 'editor'>
}

/** @internal */
export const Emoji = Node.create<EmojiOptions>({
	name: 'emoji',
	inline: true,
	group: 'inline',
	selectable: false,

	addOptions() {
		return {
			HTMLAttributes: {},
			suggestion: {
				char: ':',
				pluginKey: new PluginKey('emojiSuggestion'),

				command: ({ editor, range, props }) => {
					const nodeAfter = editor.view.state.selection.$to.nodeAfter
					if (nodeAfter?.text?.startsWith(' ')) {
						range.to += 1
					}
					editor
						.chain()
						.focus()
						.insertContentAt(range, [
							{ type: this.name, attrs: props },
							{ type: 'text', text: ' ' },
						])
						.command(({ tr, state }) => {
							tr.setStoredMarks(state.doc.resolve(state.selection.to - 2).marks())
							return true
						})
						.run()
				},

				allow: ({ state, range }) => {
					const resolvedPos = state.doc.resolve(range.from)
					const emojiNodeType = state.schema.nodes[this.name]
					return !!resolvedPos.parent.type.contentMatch.matchType(emojiNodeType)
				},
			},
		}
	},

	addAttributes() {
		return {
			emoji: {
				default: null,
				parseHTML: (element) => element.dataset.emoji,
				renderHTML: (attributes) => ({
					'data-emoji': attributes.emoji,
				}),
			},
		}
	},

	parseHTML() {
		return [
			{
				tag: `span[data-type="${this.name}"]`,
			},
		]
	},

	renderHTML({ HTMLAttributes, node }) {
		const attributes = mergeAttributes(HTMLAttributes, this.options.HTMLAttributes, {
			'data-type': this.name,
		})

		return ['span', attributes, node.attrs.emoji]
	},

	renderText({ node }) {
		return node.attrs.emoji
	},

	addProseMirrorPlugins() {
		return [
			Suggestion({
				editor: this.editor,
				...this.options.suggestion,
			}),

			new Plugin({
				key: new PluginKey('emoji'),
				props: {
					handleDoubleClickOn: (view, pos, node) => {
						if (node.type !== this.type) return false
						const from = pos
						const to = from + node.nodeSize
						this.editor.commands.setTextSelection({ from, to })
						return true
					},
				},

				appendTransaction: (transactions, oldState, newState) => {
					if (!transactions.some((tr) => tr.docChanged) || oldState.doc.eq(newState.doc)) return

					const { tr } = newState
					const changes = combineTransactionSteps(oldState.doc, transactions.slice(0))

					getChangedRanges(changes).forEach(({ newRange }) => {
						if (newState.doc.resolve(newRange.from).parent.type.spec.code) return

						findChildrenInRange(newState.doc, newRange, (node) => node.type.isText).forEach(
							({ node, pos }) => {
								if (!node.text) return
								;[...node.text.matchAll(/\p{Emoji_Presentation}/gu)].forEach((match) => {
									if (match.index === undefined) return

									const emojiText = match[0]

									const start = tr.mapping.map(pos + match.index)
									if (newState.doc.resolve(start).parent.type.spec.code) return

									const end = start + emojiText.length
									const emojiNode = this.type.create({ emoji: emojiText })
									tr.replaceRangeWith(start, end, emojiNode)
									tr.setStoredMarks(newState.doc.resolve(start).marks())
								})
							}
						)
					})

					return tr.steps.length ? tr : undefined
				},
			}),
		]
	},
})
