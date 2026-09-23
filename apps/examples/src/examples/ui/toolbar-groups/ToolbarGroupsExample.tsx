import { useMemo, useState } from 'react'
import {
	ArrowDownToolbarItem,
	ArrowLeftToolbarItem,
	ArrowRightToolbarItem,
	ArrowUpToolbarItem,
	CloudToolbarItem,
	DefaultToolbar,
	DiamondToolbarItem,
	DrawToolbarItem,
	EllipseToolbarItem,
	EraserToolbarItem,
	HandToolbarItem,
	HexagonToolbarItem,
	HighlightToolbarItem,
	LaserToolbarItem,
	OvalToolbarItem,
	RectangleToolbarItem,
	RhombusToolbarItem,
	SelectToolbarItem,
	StarToolbarItem,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TriangleToolbarItem,
} from 'tldraw'
import 'tldraw/tldraw.css'

export default function ToolbarGroupsExample() {
	const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal')

	// [1]
	const components = useMemo((): TLComponents => {
		return {
			Toolbar: () => (
				<DefaultToolbar orientation={orientation}>
					{/* [2] */}
					<TldrawUiMenuGroup id="orientation">
						<TldrawUiMenuItem
							id="orientation"
							onSelect={() =>
								setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')
							}
							label="Toggle orientation"
							icon={<span style={{ fontSize: '2em' }}>🔄</span>}
						/>
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="controls">
						<SelectToolbarItem />
						<HandToolbarItem />
						<EraserToolbarItem />
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="pens">
						<DrawToolbarItem />
						<HighlightToolbarItem />
						<LaserToolbarItem />
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="shapes">
						<RectangleToolbarItem />
						<EllipseToolbarItem />
						<TriangleToolbarItem />
						<DiamondToolbarItem />
						<HexagonToolbarItem />
						<OvalToolbarItem />
						<RhombusToolbarItem />
						<StarToolbarItem />
						<CloudToolbarItem />
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="arrows">
						<ArrowLeftToolbarItem />
						<ArrowUpToolbarItem />
						<ArrowDownToolbarItem />
						<ArrowRightToolbarItem />
					</TldrawUiMenuGroup>
				</DefaultToolbar>
			),
		}
	}, [orientation])

	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
[1]
The toolbar component closes over `orientation`, so we rebuild the components
object with `useMemo` when it changes. Everything else in the toolbar comes from
the built-in `*ToolbarItem` components, which read the tools from context.

[2]
`TldrawUiMenuGroup` draws a divider between groups of items. Any menu item works
inside the toolbar, not just tool items; here the first group is a plain
`TldrawUiMenuItem` that flips the toolbar's orientation. Try it: the groups
stack vertically and the overflow menu moves with them.
*/
