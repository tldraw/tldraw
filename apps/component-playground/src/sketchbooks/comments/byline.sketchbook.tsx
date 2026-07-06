import { Sketch, Sketchbook } from '../../sketch'
import { Byline, BylineProps } from './byline'

const sketchbook: Sketchbook<BylineProps> = {
	title: 'Comments/Byline',
	component: Byline,
}
export default sketchbook

export const Default: Sketch<BylineProps> = { args: { author: 'Ada Lovelace', time: '2h' } }
