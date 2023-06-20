let fonts = new Set<FontFace>()
beforeEach(() => {
	fonts = new Set<FontFace>()
})
;(document as any).fonts = {
	add: (font: FontFace) => {
		fonts.add(font)
	},
	delete: (font: FontFace) => {
		fonts.delete(font)
	},
	forEach: (cb: (value: FontFace, key: FontFace) => void) => {
		fonts.forEach(cb)
	},
}
