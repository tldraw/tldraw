import { SlideLayout } from '../components/SlideLayout'
import { COLORS, FONT_FAMILY } from '../styles'
import type { ListSlide as ListSlideType } from '../types'

export const ListSlide: React.FC<{ slide: ListSlideType }> = ({ slide }) => {
	return (
		<SlideLayout>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 32,
					fontFamily: FONT_FAMILY,
				}}
			>
				<div style={{ fontSize: 48, fontWeight: 700 }}>{slide.title}</div>
				<div style={{ textAlign: 'left', marginTop: 12 }}>
					{slide.items.map((item, i) => (
						<div
							key={i}
							style={{
								display: 'flex',
								gap: 12,
								fontSize: 42,
								lineHeight: 2.2,
								color: COLORS.textLight,
							}}
						>
							<span
								style={{
									color: COLORS.primary,
									fontWeight: 700,
									minWidth: 40,
								}}
							>
								{i + 1}.
							</span>
							<span>{item}</span>
						</div>
					))}
				</div>
			</div>
		</SlideLayout>
	)
}
