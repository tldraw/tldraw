import { ReactNode, SVGProps } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { PathBuilder, Vec, VecLike } from 'tldraw'

function samplePath() {
	return new PathBuilder()
		.moveTo(0, 0)
		.lineTo(200, 0)
		.arcTo(120, false, true, 60, 100)
		.arcTo(40, false, true, 100, 60)
		.lineTo(140, 140)
		.moveTo(200, 30)
		.lineTo(200, 100)
		.arcTo(40, false, true, 260, 70)
		.close()
		.moveTo(220, 100)
		.lineTo(180, 140)
		.lineTo(260, 130)
		.close()
}

export default function PathBuilderPage() {
	const s = samplePath()

	return (
		<div>
			<PathSvg label="Tangents" path={s}>
				<PathTangents path={s} />
			</PathSvg>
		</div>
	)
}

function PathSvg({
	label,
	path,
	rendered,
	children,
}: {
	label: ReactNode
	path: PathBuilder
	rendered?: ReactNode
	children: ReactNode
}) {
	const bounds = path.toGeometry()!.getBounds().expandBy(30)
	return (
		<div
			style={{
				display: 'inline-flex',
				flexDirection: 'column',
				padding: 5,
				margin: 5,
				border: '1px solid #ccc',
			}}
		>
			{label}
			<svg
				viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
				width={bounds.w}
				height={bounds.h}
				stroke="black"
				fill="none"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				{rendered ??
					path.toSvg({
						style: 'solid',
						strokeWidth: 2,
						props: { fill: 'none', stroke: 'black' },
					})}
				{children}
			</svg>
		</div>
	)
}

function PathTangents({ path }: { path: PathBuilder }) {
	const commandInfos = path.getCommandInfo()
	const commands = path.getCommands()

	return commands.map((command, i) => {
		const info = commandInfos[i]
		if (!info) return

		const prev = commands[i - 1]
		return (
			<Fragment key={i}>
				<DebugVector origin={prev} vector={info.tangentStart} stroke="green" />
				<DebugVector origin={command} vector={info.tangentEnd} stroke="red" />
			</Fragment>
		)
	})
}

const FLAP_ANGLE = Math.PI * 0.8
function DebugArrow({
	a,
	b,
	...props
}: { a: VecLike; b: VecLike } & Omit<SVGProps<SVGPathElement>, 'd' | 'origin'>) {
	const vector = Vec.Sub(b, a)
	const angle = vector.toAngle()
	const arrowLeftPoint = Vec.FromAngle(angle - FLAP_ANGLE, 3).add(b)
	const arrowRightPoint = Vec.FromAngle(angle + FLAP_ANGLE, 3).add(b)

	const d = new PathBuilder()
		.moveTo(a.x, a.y)
		.lineTo(b.x, b.y)
		.moveTo(arrowLeftPoint.x, arrowLeftPoint.y)
		.lineTo(b.x, b.y)
		.lineTo(arrowRightPoint.x, arrowRightPoint.y)
		.toD()

	return <path d={d} {...props} />
}

function DebugVector({
	origin,
	vector,
	scale = 10,
	...props
}: { origin: VecLike; vector: VecLike; scale?: number } & Omit<
	SVGProps<SVGPathElement>,
	'd' | 'origin'
>) {
	const end = Vec.Add(origin, Vec.Mul(vector, scale))

	return <DebugArrow a={origin} b={end} {...props} />
}
