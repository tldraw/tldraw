import { Composition, staticFile } from 'remotion'
import { Walkthrough } from './Walkthrough'
import { FPS, HEIGHT, WIDTH } from './styles'
import type { Manifest } from './types'

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="Walkthrough"
				component={Walkthrough}
				width={WIDTH}
				height={HEIGHT}
				fps={FPS}
				defaultProps={{
					manifest: {
						pr: 0,
						slides: [
							{
								type: 'intro',
								title: 'Preview — no manifest loaded',
								date: new Date().toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
								}),
								audio: '',
								durationInSeconds: 3,
							},
							{
								type: 'outro',
								durationInSeconds: 3,
							},
						],
					} satisfies Manifest,
				}}
				calculateMetadata={async ({ props }) => {
					// If a manifestPath prop was injected, load the manifest from public/
					const p = props as any
					if (p.manifestPath) {
						const response = await fetch(staticFile(p.manifestPath))
						const manifest: Manifest = await response.json()
						const totalSeconds = manifest.slides.reduce((sum, s) => sum + s.durationInSeconds, 0)

						return {
							durationInFrames: Math.ceil(totalSeconds * FPS),
							props: { manifest },
						}
					}

					const totalSeconds = props.manifest.slides.reduce(
						(sum, s) => sum + s.durationInSeconds,
						0
					)
					return {
						durationInFrames: Math.ceil(totalSeconds * FPS),
					}
				}}
			/>
		</>
	)
}
