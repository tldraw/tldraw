import { Img, staticFile } from 'remotion'
import { SlideLayout } from '../components/SlideLayout'
import { HEIGHT, WIDTH } from '../styles'

export const ImageSlide: React.FC<{ src: string }> = ({ src }) => {
	return (
		<SlideLayout>
			<Img
				src={staticFile(src)}
				style={{
					width: WIDTH,
					height: HEIGHT,
					objectFit: 'contain',
				}}
			/>
		</SlideLayout>
	)
}
