import { useLayoutEffect } from 'react'
import { TLComponents, track, useEditor } from 'tldraw'
import { PageMetaV2 } from './MetaMigrations'

export const components: TLComponents = {
	TopPanel: track(() => {
		const editor = useEditor()
		const currentPage = editor.getCurrentPage()
		const meta: PageMetaV2 = currentPage.meta

		useLayoutEffect(() => {
			const elem = document.querySelector('.tl-background') as HTMLElement
			if (!elem) return
			elem.style.backgroundColor = meta.backgroundTheme ?? 'unset'
		}, [meta.backgroundTheme])

		return (
			<span style={{ pointerEvents: 'all', padding: '5px 15px', margin: 10, fontSize: 18 }}>
				bg: &nbsp;
				<select
					value={meta.backgroundTheme ?? 'none'}
					onChange={(e) => {
						if (e.currentTarget.value === 'none') {
							editor.updatePage({ ...currentPage, meta: {} })
						} else {
							editor.updatePage({
								...currentPage,
								meta: { backgroundTheme: e.currentTarget.value },
							})
						}
					}}
				>
					<option value="none">None</option>
					<option value="red">Red</option>
					<option value="blue">Blue</option>
					<option value="green">Green</option>
				</select>
			</span>
		)
	}),
}
