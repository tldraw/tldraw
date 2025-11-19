import { tlenvReactive } from 'tldraw'

export function getIsCoarsePointer() {
	return tlenvReactive.get().isCoarsePointer
}
