import { DefaultColorThemePalette, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
export default function Example() {
	return (
		<div className="tldraw__editor">
			<Tldraw shareZone={<CustomShareZone />} topZone={<CustomTopZone />} />
		</div>
	)
}

function CustomShareZone() {
	return (
		<div
			style={{
				backgroundColor: DefaultColorThemePalette.lightMode['light-blue'].solid,
				width: '100%',
				textAlign: 'center',
				minWidth: '80px',
			}}
		>
			<p>Share Zone</p>
		</div>
	)
}

function CustomTopZone() {
	return (
		<div
			style={{
				width: '100%',
				backgroundColor: DefaultColorThemePalette.lightMode['light-green'].solid,
				textAlign: 'center',
			}}
		>
			<p>Top Zone</p>
		</div>
	)
}
