import {
	BaseBoxShapeUtil,
	DefaultStylePanel,
	DefaultStylePanelContent,
	HTMLContainer,
	StyleProp,
	T,
	TLBaseShape,
	Tldraw,
	useEditor,
	useRelevantStyles,
} from 'tldraw'
import 'tldraw/tldraw.css'

const iconStyle = StyleProp.defineEnum('example:icon', {
	defaultValue: 'star',
	values: ['star', 'heart', 'check'],
})

type IconStyle = T.TypeOf<typeof iconStyle>

type IIconShape = TLBaseShape<
	'icon-shape',
	{
		w: number
		h: number
		icon: IconStyle
	}
>

class IconShapeUtil extends BaseBoxShapeUtil<IIconShape> {
	static override type = 'icon-shape' as const
	static override props = {
		w: T.number,
		h: T.number,
		icon: iconStyle,
	}

	getDefaultProps(): IIconShape['props'] {
		return {
			w: 100,
			h: 100,
			icon: 'star',
		}
	}

	component(shape: IIconShape) {
		const icons: Record<IconStyle, string> = {
			star: '⭐️',
			heart: '❤️',
			check: '✅',
		}
		return (
			<HTMLContainer
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '2em',
				}}
			>
				{icons[shape.props.icon]}
			</HTMLContainer>
		)
	}

	indicator(shape: IIconShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

function IconStylePanel() {
	const editor = useEditor()
	const styles = useRelevantStyles()
	if (!styles) return null

	const icon = styles.get(iconStyle)

	return (
		<DefaultStylePanel>
			<DefaultStylePanelContent styles={styles} />
			{icon !== undefined && (
				<div>
					<select
						style={{ width: '100%', padding: 4 }}
						value={icon.type === 'mixed' ? '' : icon.value}
						onChange={(e) => {
							editor.markHistoryStoppingPoint()
							const value = iconStyle.validate(e.currentTarget.value as IconStyle)
							editor.setStyleForSelectedShapes(iconStyle, value)
						}}
					>
						{icon.type === 'mixed' && <option value="">Mixed</option>}
						<option value="star">Star</option>
						<option value="heart">Heart</option>
						<option value="check">Check</option>
					</select>
				</div>
			)}
		</DefaultStylePanel>
	)
}

export default function IconShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={[IconShapeUtil]}
				components={{ StylePanel: IconStylePanel }}
				onMount={(editor) => {
					editor.createShape({ type: 'icon-shape', x: 100, y: 100 })
					editor.selectAll()
					editor.createShape({ type: 'icon-shape', x: 250, y: 100, props: { icon: 'heart' } })
				}}
			/>
		</div>
	)
}
