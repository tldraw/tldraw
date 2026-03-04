import { SlideLayout } from '../components/SlideLayout'
import { COLORS, FONT_FAMILY } from '../styles'
import type { SegmentSlide as SegmentSlideType } from '../types'

export const SegmentSlide: React.FC<{ slide: SegmentSlideType }> = ({ slide }) => {
	return (
		<SlideLayout>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100%',
					fontFamily: FONT_FAMILY,
				}}
			>
				<div
					style={{
						fontSize: 48,
						fontWeight: 700,
						color: COLORS.text,
						textAlign: 'center',
						textWrap: 'balance',
						maxWidth: '80%',
					}}
				>
					{slide.title}
				</div>
			</div>
		</SlideLayout>
	)
}
