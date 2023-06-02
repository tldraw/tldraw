import { PI, radiansToDegrees } from '@tldraw/primitives'
import { TLCursorType } from '@tldraw/tlschema'
import { useContainer } from './useContainer'
import { useApp } from './useEditor'
import { useQuickReactor } from './useQuickReactor'

const DEFAULT_SVG = `<path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" fill="white"/><path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" fill="white"/><path d="m19.751 24.4155-1.844.774-3.1-7.374 1.841-.775z" fill="black"/><path d="m13 10.814v11.188l2.969-2.866.428-.139h4.768z" fill="black"/>`
const POINTER_SVG = `<path d="m13.3315 21.3799c-.284-.359-.629-1.093-1.243-1.984-.348-.504-1.211-1.453-1.468-1.935-.223-.426-.199-.617-.146-.97.094-.628.738-1.117 1.425-1.051.519.049.959.392 1.355.716.239.195.533.574.71.788.163.196.203.277.377.509.23.307.302.459.214.121-.071-.496-.187-1.343-.355-2.092-.128-.568-.159-.657-.281-1.093-.129-.464-.195-.789-.316-1.281-.084-.348-.235-1.059-.276-1.459-.057-.547-.087-1.439.264-1.849.275-.321.906-.418 1.297-.22.512.259.803 1.003.936 1.3.239.534.387 1.151.516 1.961.164 1.031.466 2.462.476 2.763.024-.369-.068-1.146-.004-1.5.058-.321.328-.694.666-.795.286-.085.621-.116.916-.055.313.064.643.288.766.499.362.624.369 1.899.384 1.831.086-.376.071-1.229.284-1.584.14-.234.497-.445.687-.479.294-.052.655-.068.964-.008.249.049.586.345.677.487.218.344.342 1.317.379 1.658.015.141.074-.392.293-.736.406-.639 1.843-.763 1.898.639.025.654.02.624.02 1.064 0 .517-.012.828-.04 1.202-.031.4-.117 1.304-.242 1.742-.086.301-.371.978-.652 1.384 0 0-1.074 1.25-1.191 1.813-.118.562-.079.566-.102.965-.023.398.121.922.121.922s-.802.104-1.234.035c-.391-.063-.875-.841-1-1.079-.172-.328-.539-.265-.682-.023-.225.383-.709 1.07-1.051 1.113-.668.084-2.054.031-3.139.02 0 0 .185-1.011-.227-1.358-.305-.259-.83-.784-1.144-1.06z" fill="white"/><g stroke="black" stroke-linecap="round" stroke-width=".75"><path d="m13.3315 21.3799c-.284-.359-.629-1.093-1.243-1.984-.348-.504-1.211-1.453-1.468-1.935-.223-.426-.199-.617-.146-.97.094-.628.738-1.117 1.425-1.051.519.049.959.392 1.355.716.239.195.533.574.71.788.163.196.203.277.377.509.23.307.302.459.214.121-.071-.496-.187-1.343-.355-2.092-.128-.568-.159-.657-.281-1.093-.129-.464-.195-.789-.316-1.281-.084-.348-.235-1.059-.276-1.459-.057-.547-.087-1.439.264-1.849.275-.321.906-.418 1.297-.22.512.259.803 1.003.936 1.3.239.534.387 1.151.516 1.961.164 1.031.466 2.462.476 2.763.024-.369-.068-1.146-.004-1.5.058-.321.328-.694.666-.795.286-.085.621-.116.916-.055.313.064.643.288.766.499.362.624.369 1.899.384 1.831.086-.376.071-1.229.284-1.584.14-.234.497-.445.687-.479.294-.052.655-.068.964-.008.249.049.586.345.677.487.218.344.342 1.317.379 1.658.015.141.074-.392.293-.736.406-.639 1.843-.763 1.898.639.025.654.02.624.02 1.064 0 .517-.012.828-.04 1.202-.031.4-.117 1.304-.242 1.742-.086.301-.371.978-.652 1.384 0 0-1.074 1.25-1.191 1.813-.118.562-.079.566-.102.965-.023.398.121.922.121.922s-.802.104-1.234.035c-.391-.063-.875-.841-1-1.079-.172-.328-.539-.265-.682-.023-.225.383-.709 1.07-1.051 1.113-.668.084-2.054.031-3.139.02 0 0 .185-1.011-.227-1.358-.305-.259-.83-.784-1.144-1.06z" stroke-linejoin="round"/><path d="m21.5664 21.7344v-3.459"/><path d="m19.5508 21.7461-.016-3.473"/><path d="m17.5547 18.3047.021 3.426"/></g>`
const CROSS_SVG = `<path d="m25 16h-6.01v-6h-2.98v6h-6.01v3h6.01v6h2.98v-6h6.01z" fill="white"/><path d="m23.9902 17.0103h-6v-6.01h-.98v6.01h-6v.98h6v6.01h.98v-6.01h6z" fill="%23231f1f"/>`
const MOVE_SVG = `<path d="m19 14h1v1h-1zm1 6h-1v-1h1zm-5-5h-1v-1h1zm0 5h-1v-1h1zm2-10.987-7.985 7.988 5.222 5.221 2.763 2.763 7.984-7.985z" fill="white"/><g fill="black"><path d="m23.5664 16.9971-2.557-2.809v1.829h-4.009-4.001v-1.829l-2.571 2.809 2.572 2.808-.001-1.808h4.001 4.009l-.001 1.808z"/><path d="m17.9873 17h.013v-4.001l1.807.001-2.807-2.571-2.809 2.57h1.809v4.001h.008v4.002l-1.828-.001 2.807 2.577 2.805-2.576h-1.805z"/></g>`

const CORNER_SVG = `<path d='m19.7432 17.0869-4.072 4.068 2.829 2.828-8.473-.013-.013-8.47 2.841 2.842 4.075-4.068 1.414-1.415-2.844-2.842h8.486v8.484l-2.83-2.827z' fill='%23fff'/><path d='m18.6826 16.7334-4.427 4.424 1.828 1.828-5.056-.016-.014-5.054 1.842 1.841 4.428-4.422 2.474-2.475-1.844-1.843h5.073v5.071l-1.83-1.828z' fill='%23000'/>`
const EDGE_SVG = `<path d='m9 17.9907v.005l5.997 5.996.001-3.999h1.999 2.02v4l5.98-6.001-5.98-5.999.001 4.019-2.021.002h-2l.001-4.022zm1.411.003 3.587-3.588-.001 2.587h3.5 2.521v-2.585l3.565 3.586-3.564 3.585-.001-2.585h-2.521l-3.499-.001-.001 2.586z' fill='%23fff'/><path d='m17.4971 18.9932h2.521v2.586l3.565-3.586-3.565-3.585v2.605h-2.521-3.5v-2.607l-3.586 3.587 3.586 3.586v-2.587z' fill='%23000'/>`
const ROTATE_CORNER_SVG = `<g><path d="M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z" fill="white"/></g>`
const TEXT_SVG = `<path fill="white" d="M7.94 0a5.25 5.25 0 0 0-3.47 1.17A5.27 5.27 0 0 0 1 0H0v3h1c1.41 0 1.85.7 2 1v3.94H2v3h1v3c-.13.3-.57 1-2 1H0v3h1a5.27 5.27 0 0 0 3.47-1.17c.98.8 2.21 1.21 3.47 1.17h1v-3h-1c-1.41 0-1.85-.7-2-1v-3H7v-3H6V4c.13-.3.57-1 2-1h1V0H7.94z"/><path fill="black" d="M7.94 2V1a4 4 0 0 0-3.47 1.64A4 4 0 0 0 1 1v1c1.3-.17 2.56.6 3 1.84v5.1H3v1h1v4.16c-.45 1.24-1.7 2-3 1.84v1a4.05 4.05 0 0 0 3.47-1.63 4.05 4.05 0 0 0 3.47 1.63v-1A2.82 2.82 0 0 1 5 14.1V9.93h1v-1H5V3.85A2.81 2.81 0 0 1 7.94 2z"/>`
const GRABBING_SVG = `<path d='m13.5732 12.0361c.48-.178 1.427-.069 1.677.473.213.462.396 1.241.406 1.075.024-.369-.024-1.167.137-1.584.117-.304.347-.59.686-.691.285-.086.62-.116.916-.055.313.064.642.287.765.499.362.623.368 1.899.385 1.831.064-.272.07-1.229.283-1.584.141-.235.497-.445.687-.479.294-.052.656-.068.964-.008.249.049.586.344.677.487.219.344.342 1.316.379 1.658.016.141.074-.393.293-.736.406-.639 1.844-.763 1.898.639.026.654.02.624.02 1.064 0 .516-.012.828-.04 1.202-.03.399-.116 1.304-.241 1.742-.086.301-.371.978-.653 1.384 0 0-1.074 1.25-1.191 1.812-.117.563-.078.567-.102.965-.023.399.121.923.121.923s-.801.104-1.234.034c-.391-.062-.875-.84-1-1.078-.172-.328-.539-.265-.682-.023-.224.383-.709 1.07-1.05 1.113-.669.084-2.055.03-3.14.02 0 0 .185-1.011-.227-1.358-.305-.26-.83-.784-1.144-1.06l-.832-.921c-.283-.36-1.002-.929-1.243-1.985-.213-.936-.192-1.395.037-1.77.232-.381.67-.589.854-.625.208-.042.692-.039.875.062.223.123.313.159.488.391.23.307.312.456.213.121-.076-.262-.322-.595-.434-.97-.109-.361-.401-.943-.38-1.526.008-.221.103-.771.832-1.042' fill='white'/><g stroke='black' stroke-width='.75'><path d='m13.5732 12.0361c.48-.178 1.427-.069 1.677.473.213.462.396 1.241.406 1.075.024-.369-.024-1.167.137-1.584.117-.304.347-.59.686-.691.285-.086.62-.116.916-.055.313.064.642.287.765.499.362.623.368 1.899.385 1.831.064-.272.07-1.229.283-1.584.141-.235.497-.445.687-.479.294-.052.656-.068.964-.008.249.049.586.344.677.487.219.344.342 1.316.379 1.658.016.141.074-.393.293-.736.406-.639 1.844-.763 1.898.639.026.654.02.624.02 1.064 0 .516-.012.828-.04 1.202-.03.399-.116 1.304-.241 1.742-.086.301-.371.978-.653 1.384 0 0-1.074 1.25-1.191 1.812-.117.563-.078.567-.102.965-.023.399.121.923.121.923s-.801.104-1.234.034c-.391-.062-.875-.84-1-1.078-.172-.328-.539-.265-.682-.023-.224.383-.709 1.07-1.05 1.113-.669.084-2.055.03-3.14.02 0 0 .185-1.011-.227-1.358-.305-.26-.83-.784-1.144-1.06l-.832-.921c-.283-.36-1.002-.929-1.243-1.985-.213-.936-.192-1.395.037-1.77.232-.381.67-.589.854-.625.208-.042.692-.039.875.062.223.123.313.159.488.391.23.307.312.456.213.121-.076-.262-.322-.595-.434-.97-.109-.361-.401-.943-.38-1.526.008-.221.103-.771.832-1.042z' stroke-linejoin='round'/><path d='m20.5664 19.7344v-3.459' stroke-linecap='round'/><path d='m18.5508 19.7461-.016-3.473' stroke-linecap='round'/><path d='m16.5547 16.3047.021 3.426' stroke-linecap='round'/></g>`
const GRAB_SVG = `<path d="m13.5557 17.5742c-.098-.375-.196-.847-.406-1.552-.167-.557-.342-.859-.47-1.233-.155-.455-.303-.721-.496-1.181-.139-.329-.364-1.048-.457-1.44-.119-.509.033-.924.244-1.206.253-.339.962-.49 1.357-.351.371.13.744.512.916.788.288.46.357.632.717 1.542.393.992.564 1.918.611 2.231l.085.452c-.001-.04-.043-1.122-.044-1.162-.035-1.029-.06-1.823-.038-2.939.002-.126.064-.587.084-.715.078-.5.305-.8.673-.979.412-.201.926-.215 1.401-.017.423.173.626.55.687 1.022.014.109.094.987.093 1.107-.013 1.025.006 1.641.015 2.174.004.231.003 1.625.017 1.469.061-.656.094-3.189.344-3.942.144-.433.405-.746.794-.929.431-.203 1.113-.07 1.404.243.285.305.446.692.482 1.153.032.405-.019.897-.02 1.245 0 .867-.021 1.324-.037 2.121-.001.038-.015.298.023.182.094-.28.188-.542.266-.745.049-.125.241-.614.359-.859.114-.234.211-.369.415-.688.2-.313.415-.448.668-.561.54-.235 1.109.112 1.301.591.086.215.009.713-.028 1.105-.061.647-.254 1.306-.352 1.648-.128.447-.274 1.235-.34 1.601-.072.394-.234 1.382-.359 1.82-.086.301-.371.978-.652 1.384 0 0-1.074 1.25-1.192 1.812-.117.563-.078.567-.101.965-.024.399.121.923.121.923s-.802.104-1.234.034c-.391-.062-.875-.841-1-1.078-.172-.328-.539-.265-.682-.023-.225.383-.709 1.07-1.051 1.113-.668.084-2.054.03-3.139.02 0 0 .185-1.011-.227-1.358-.305-.26-.83-.784-1.144-1.06l-.832-.921c-.284-.36-.629-1.093-1.243-1.985-.348-.504-1.027-1.085-1.284-1.579-.223-.425-.331-.954-.19-1.325.225-.594.675-.897 1.362-.832.519.05.848.206 1.238.537.225.19.573.534.75.748.163.195.203.276.377.509.23.307.302.459.214.121" fill="white"/><g stroke="black" stroke-linecap="round" stroke-width=".75"><path d="m13.5557 17.5742c-.098-.375-.196-.847-.406-1.552-.167-.557-.342-.859-.47-1.233-.155-.455-.303-.721-.496-1.181-.139-.329-.364-1.048-.457-1.44-.119-.509.033-.924.244-1.206.253-.339.962-.49 1.357-.351.371.13.744.512.916.788.288.46.357.632.717 1.542.393.992.564 1.918.611 2.231l.085.452c-.001-.04-.043-1.122-.044-1.162-.035-1.029-.06-1.823-.038-2.939.002-.126.064-.587.084-.715.078-.5.305-.8.673-.979.412-.201.926-.215 1.401-.017.423.173.626.55.687 1.022.014.109.094.987.093 1.107-.013 1.025.006 1.641.015 2.174.004.231.003 1.625.017 1.469.061-.656.094-3.189.344-3.942.144-.433.405-.746.794-.929.431-.203 1.113-.07 1.404.243.285.305.446.692.482 1.153.032.405-.019.897-.02 1.245 0 .867-.021 1.324-.037 2.121-.001.038-.015.298.023.182.094-.28.188-.542.266-.745.049-.125.241-.614.359-.859.114-.234.211-.369.415-.688.2-.313.415-.448.668-.561.54-.235 1.109.112 1.301.591.086.215.009.713-.028 1.105-.061.647-.254 1.306-.352 1.648-.128.447-.274 1.235-.34 1.601-.072.394-.234 1.382-.359 1.82-.086.301-.371.978-.652 1.384 0 0-1.074 1.25-1.192 1.812-.117.563-.078.567-.101.965-.024.399.121.923.121.923s-.802.104-1.234.034c-.391-.062-.875-.841-1-1.078-.172-.328-.539-.265-.682-.023-.225.383-.709 1.07-1.051 1.113-.668.084-2.054.03-3.139.02 0 0 .185-1.011-.227-1.358-.305-.26-.83-.784-1.144-1.06l-.832-.921c-.284-.36-.629-1.093-1.243-1.985-.348-.504-1.027-1.085-1.284-1.579-.223-.425-.331-.954-.19-1.325.225-.594.675-.897 1.362-.832.519.05.848.206 1.238.537.225.19.573.534.75.748.163.195.203.276.377.509.23.307.302.459.214.121" stroke-linejoin="round"/><path d="m20.5664 21.7344v-3.459"/><path d="m18.5508 21.7461-.016-3.473"/><path d="m16.5547 18.3047.021 3.426"/></g>`

const ZOOM_IN_SVG = `<path d="m20.5 15c0 3.038-2.462 5.5-5.5 5.5s-5.5-2.462-5.5-5.5 2.462-5.5 5.5-5.5 5.5 2.462 5.5 5.5" fill="white"/><path d="m20.5 15c0 3.038-2.462 5.5-5.5 5.5s-5.5-2.462-5.5-5.5 2.462-5.5 5.5-5.5 5.5 2.462 5.5 5.5z" stroke="black"/><g fill="black"><path d="m18 14h-2v-2h-2v2h-2v1.98h2v2.02h2v-2.02h2z"/><path d="m23.5859 25 1.414-1.414-5.449-5.449-1.414 1.414z"/></g>`
const ZOOM_OUT_SVG = `<path d="m20.5 15c0 3.038-2.462 5.5-5.5 5.5s-5.5-2.462-5.5-5.5 2.462-5.5 5.5-5.5 5.5 2.462 5.5 5.5" fill="white"/><path d="m20.5 15c0 3.038-2.462 5.5-5.5 5.5s-5.5-2.462-5.5-5.5 2.462-5.5 5.5-5.5 5.5 2.462 5.5 5.5z" stroke="black"/><g fill="black"><path d="m18 16h-5.98v-1.98h5.98z"/><path d="m23.5859 25 1.414-1.414-5.449-5.449-1.414 1.414z"/></g>`

function getCursorCss(
	svg: string,
	r: number,
	tr: number,
	f: boolean,
	color: string,
	hotspotX = 16,
	hotspotY = 16
) {
	const a = (-tr - r) * (PI / 180)
	const s = Math.sin(a)
	const c = Math.cos(a)
	const dx = 1 * c - 1 * s
	const dy = 1 * s + 1 * c

	return (
		`url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: ${color};'><defs><filter id='shadow' y='-40%' x='-40%' width='180px' height='180%' color-interpolation-filters='sRGB'><feDropShadow dx='${dx}' dy='${dy}' stdDeviation='1.2' flood-opacity='.5'/></filter></defs><g fill='none' transform='rotate(${
			r + tr
		} 16 16)${f ? ` scale(-1,-1) translate(0, -32)` : ''}' filter='url(%23shadow)'>` +
		svg.replaceAll(`"`, `'`) +
		`</g></svg>") ${hotspotX} ${hotspotY}, pointer`
	)
}

const CURSORS: Record<TLCursorType, (r: number, f: boolean, color: string) => string> = {
	none: () => 'none',
	default: (r, f, c) => getCursorCss(DEFAULT_SVG, r, 0, f, c, 12, 8),
	pointer: (r, f, c) => getCursorCss(POINTER_SVG, r, 0, f, c, 14, 10),
	cross: (r, f, c) => getCursorCss(CROSS_SVG, r, 0, f, c),
	move: (r, f, c) => getCursorCss(MOVE_SVG, r, 0, f, c),
	grab: (r, f, c) => getCursorCss(GRAB_SVG, r, 0, f, c),
	grabbing: (r, f, c) => getCursorCss(GRABBING_SVG, r, 0, f, c),
	text: (r, f, c) => getCursorCss(TEXT_SVG, r, 0, f, c, 4, 10),
	'resize-edge': (r, f, c) => getCursorCss(EDGE_SVG, r, 0, f, c),
	'resize-corner': (r, f, c) => getCursorCss(CORNER_SVG, r, 0, f, c),
	'ew-resize': (r, f, c) => getCursorCss(EDGE_SVG, r, 0, f, c),
	'ns-resize': (r, f, c) => getCursorCss(EDGE_SVG, r, 90, f, c),
	'nesw-resize': (r, f, c) => getCursorCss(CORNER_SVG, r, 0, f, c),
	'nwse-resize': (r, f, c) => getCursorCss(CORNER_SVG, r, 90, f, c),
	rotate: (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 45, f, c),
	'nwse-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 0, f, c),
	'nesw-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 90, f, c),
	'senw-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 180, f, c),
	'swne-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 270, f, c),
	'zoom-in': (r, f, c) => getCursorCss(ZOOM_IN_SVG, r, 0, f, c),
	'zoom-out': (r, f, c) => getCursorCss(ZOOM_OUT_SVG, r, 0, f, c),
}

export function getCursor(cursor: TLCursorType, rotation = 0, color = 'black') {
	return CURSORS[cursor](radiansToDegrees(rotation), false, color)
}

export function useCursor() {
	const app = useApp()
	const container = useContainer()

	useQuickReactor(
		'useCursor',
		() => {
			const { type, rotation, color } = app.cursor
			container.style.setProperty('--tl-cursor', getCursor(type, rotation, color))
		},
		[app, container]
	)

	useQuickReactor(
		'useStaticCursor',
		() => {
			for (const key in CURSORS) {
				container.style.setProperty(`--tl-cursor-${key}`, getCursor(key))
			}
		},
		[app, container]
	)
}
