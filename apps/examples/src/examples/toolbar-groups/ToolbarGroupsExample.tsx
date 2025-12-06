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

export default function BasicExample() {
	const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal')

	const components = useMemo((): TLComponents => {
		return {
			Toolbar: () => (
				<DefaultToolbar orientation={orientation}>
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
