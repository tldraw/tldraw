import { Audio, Series, staticFile } from 'remotion'
import { CodeSlide } from './slides/CodeSlide'
import { DiffSlide } from './slides/DiffSlide'
import { ImageSlide } from './slides/ImageSlide'
import { IntroSlide } from './slides/IntroSlide'
import { ListSlide } from './slides/ListSlide'
import { OutroSlide } from './slides/OutroSlide'
import { SegmentSlide } from './slides/SegmentSlide'
import { TextSlide } from './slides/TextSlide'
import { FPS } from './styles'
import type { Manifest, Slide } from './types'

function renderSlide(slide: Slide) {
	switch (slide.type) {
		case 'intro':
			return <IntroSlide slide={slide} />
		case 'diff':
			return <DiffSlide slide={slide} />
		case 'code':
			return <CodeSlide slide={slide} />
		case 'text':
			return <TextSlide slide={slide} />
		case 'list':
			return <ListSlide slide={slide} />
		case 'image':
			return <ImageSlide src={slide.src} />
		case 'segment':
			return <SegmentSlide slide={slide} />
		case 'outro':
			return <OutroSlide />
	}
}

export const Walkthrough: React.FC<{
	manifest: Manifest
}> = ({ manifest }) => {
	return (
		<Series>
			{manifest.slides.map((slide, i) => {
				const frames = Math.ceil(slide.durationInSeconds * FPS)
				const hasAudio = 'audio' in slide && slide.audio

				return (
					<Series.Sequence key={i} durationInFrames={frames}>
						{renderSlide(slide)}
						{hasAudio && <Audio src={staticFile(slide.audio as string)} />}
					</Series.Sequence>
				)
			})}
		</Series>
	)
}
