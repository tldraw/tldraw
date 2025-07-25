import { Extension } from '@tiptap/core'

/**
 * @public
 */
export const TextDirection = Extension.create({
	name: 'textDirection',

	addGlobalAttributes() {
		return [
			{
				types: ['heading', 'paragraph'],
				attributes: {
					dir: {
						default: 'auto',
						parseHTML: (element) => {
							const dirAttribute = element.getAttribute('dir')
							if (dirAttribute && ['ltr', 'rtl', 'auto'].includes(dirAttribute)) {
								return dirAttribute
							} else {
								return 'auto'
							}
						},
						renderHTML: (attributes) => {
							return { dir: attributes.dir }
						},
					},
				},
			},
		]
	},
})
