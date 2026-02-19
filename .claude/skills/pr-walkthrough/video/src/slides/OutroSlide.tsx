import { Logo } from '../components/Logo'
import { SlideLayout } from '../components/SlideLayout'

export const OutroSlide: React.FC = () => {
	return (
		<SlideLayout>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100%',
				}}
			>
				<Logo />
			</div>
		</SlideLayout>
	)
}
