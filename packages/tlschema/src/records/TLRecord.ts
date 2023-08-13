import { TLAsset } from './TLAsset'
import { TLCamera } from './TLCamera'
import { TLDocument } from './TLDocument'
import { TLInstance } from './TLInstance'
import { TLInstancePageState } from './TLInstancePageState'
import { TLInstancePresence } from './TLInstancePresence'
import { TLPage } from './TLPage'
import { TLPointer } from './TLPointer'
import { TLShape } from './TLShape'

/** @public */
export type TLRecord =
	| TLAsset
	| TLCamera
	| TLDocument
	| TLInstance
	| TLInstancePageState
	| TLPage
	| TLShape
	| TLInstancePresence
	| TLPointer
