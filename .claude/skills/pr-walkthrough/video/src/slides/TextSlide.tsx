import { SlideLayout } from '../components/SlideLayout'
import { COLORS, FONT_FAMILY } from '../styles'
import type { TextSlide as TextSlideType } from '../types'

export const TextSlide: React.FC<{ slide: TextSlideType }> = ({ slide }) => {
	return (
		<SlideLayout>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 36,
					fontFamily: FONT_FAMILY,
				}}
			>
				<div style={{ fontSize: 48, fontWeight: 700 }}>{slide.title}</div>
				{slide.subtitle && (
					<div
						style={{
							fontSize: 42,
							fontWeight: 400,
							color: COLORS.textLight,
							lineHeight: 1.5,
							textAlign: 'center',
							maxWidth: '82%',
							textWrap: 'balance',
						}}
					>
						{slide.subtitle}
					</div>
				)}
			</div>
		</SlideLayout>
	)
}
