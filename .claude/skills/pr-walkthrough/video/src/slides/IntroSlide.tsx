import { Logo } from '../components/Logo'
import { SlideLayout } from '../components/SlideLayout'
import { COLORS, FONT_FAMILY } from '../styles'
import type { IntroSlide as IntroSlideType } from '../types'

export const IntroSlide: React.FC<{ slide: IntroSlideType }> = ({ slide }) => {
	return (
		<SlideLayout>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100%',
					gap: 72,
					fontFamily: FONT_FAMILY,
				}}
			>
				<Logo />
				<div
					style={{
						fontSize: 42,
						color: COLORS.text,
						textAlign: 'center',
						textWrap: 'balance',
						lineHeight: 1.5,
						maxWidth: '80%',
					}}
				>
					{slide.title}
				</div>
				<div
					style={{
						fontSize: 24,
						color: COLORS.textLight,
						textAlign: 'center',
						marginBottom: 24,
					}}
				>
					{slide.date}
				</div>
			</div>
		</SlideLayout>
	)
}
