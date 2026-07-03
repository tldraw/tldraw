import { Sketch, Sketchbook } from '../sketch'

// Throwaway sample: a local component with no SDK dependency, here only to prove
// the discovery -> render pipeline. Deleted once real component sketchbooks land.
interface DemoButtonProps {
	label: string
	tone?: 'default' | 'primary'
}

function DemoButton({ label, tone = 'default' }: DemoButtonProps) {
	return <button className={`demo-button demo-button--${tone}`}>{label}</button>
}

const sketchbook: Sketchbook<DemoButtonProps> = {
	title: 'Sample/Button',
	component: DemoButton,
}
export default sketchbook

export const Default: Sketch<DemoButtonProps> = { args: { label: 'Click me' } }
export const Primary: Sketch<DemoButtonProps> = { args: { label: 'Save', tone: 'primary' } }
