import { TLAsset } from './TLAsset'
import { TLCamera } from './TLCamera'
import { TLDocument } from './TLDocument'
import { TLInstance } from './TLInstance'
import { TLPage } from './TLPage'
import { TLInstancePageState } from './TLPageState'
import { TLPointer } from './TLPointer'
import { TLInstancePresence } from './TLPresence'
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
