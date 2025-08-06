import { Streaming, TLAgentChange } from '../../client/types/TLAgentChange'
import { TLAgentPrompt } from '../../client/types/TLAgentPrompt'
import { ISimpleEvent } from './schema'

export function getTldrawAgentChangesFromSimpleEvents(
	prompt: TLAgentPrompt,
	event: Streaming<ISimpleEvent>
): Streaming<TLAgentChange>[] {
	switch (event._type) {
		case 'update': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'create': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'delete': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'move': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'label': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'distribute': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'stack': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'align': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'place': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'message': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'think': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		case 'schedule': {
			//the model thinks this event is called "schedule", but when we translate it into a TLAgentChange, we call it "review". Specifically TLAgentScheduleReviewChange
			const { _type, ...change } = event
			return [{ ...change, type: 'review' }]
		}
		case 'setMyView': {
			const { _type, ...change } = event
			return [{ ...change, type: _type }]
		}
		default: {
			return [{ type: 'raw', event, complete: false }]
		}
	}
}
