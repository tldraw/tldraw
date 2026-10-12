import { TLComponents, useEditor, useValue } from 'tldraw'
import { PageMetaV2 } from './MetaMigrations'

function usePageBackgroundTheme() {
	const editor = useEditor()
	return useValue(
		'background theme',
		() => (editor.getCurrentPage().meta as PageMetaV2).backgroundTheme,
		[editor]
	)
}

// [1]
function ThemedBackground() {
	const backgroundTheme = usePageBackgroundTheme()
	return <div className="tl-background" style={{ backgroundColor: backgroundTheme }} />
}

function BackgroundThemeSelect() {
	const editor = useEditor()
	const backgroundTheme = usePageBackgroundTheme()

	return (
		<span style={{ pointerEvents: 'all', padding: '5px 15px', margin: 10, fontSize: 18 }}>
			bg: &nbsp;
			<select
				value={backgroundTheme ?? 'none'}
				onChange={(e) => {
					const value = e.currentTarget.value
					editor.updatePage({
						id: editor.getCurrentPageId(),
						meta: value === 'none' ? {} : { backgroundTheme: value },
					})
				}}
			>
				<option value="none">None</option>
				<option value="red">Red</option>
				<option value="blue">Blue</option>
				<option value="green">Green</option>
			</select>
		</span>
	)
}

export const components: TLComponents = {
	Background: ThemedBackground,
	TopPanel: BackgroundThemeSelect,
}

/*
[1]
Rather than reaching into the DOM to recolor the default background, override the
`Background` component slot. `useValue` re-runs when the current page or its meta
changes, so switching pages updates the color too.
*/
