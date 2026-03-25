/**
 * Hand-crafted zstd dictionary containing representative tldraw sync protocol messages.
 *
 * This dictionary pre-seeds the zstd compressor/decompressor with common byte patterns
 * found in tldraw WebSocket messages: protocol keys, record type names, shape types,
 * diff operation formats, and typical value patterns.
 *
 * For a production dictionary, train using: zstd --train samples/* -o dict
 * using captured real traffic. This hand-crafted version covers the structural patterns
 * that appear in virtually every message.
 */

const DICTIONARY_SAMPLES = [
	// Protocol message types (server → client)
	'{"type":"connect","hydrationType":"wipe_all","connectRequestId":"',
	',"protocolVersion":8,"schema":{"schemaVersion":2,"sequences":{}},"diff":{},"serverClock":0,"isReadonly":false}',
	'{"type":"connect","hydrationType":"wipe_presence","connectRequestId":"',
	',"protocolVersion":8,"schema":{"schemaVersion":2,"sequences":{}},"diff":{},"serverClock":0,"isReadonly":false}',
	'{"type":"pong"}',
	'{"type":"data","data":[',
	'{"type":"patch","diff":{',
	',"serverClock":',
	'{"type":"push_result","clientClock":',
	',"serverClock":',
	',"action":"commit"}',
	'{"type":"push_result","clientClock":',
	',"serverClock":',
	',"action":"discard"}',
	'{"type":"push_result","clientClock":',
	',"serverClock":',
	',"action":{"rebaseWithDiff":{',
	'{"type":"custom","data":',
	'{"type":"incompatibility_error","reason":"clientTooOld"}',
	'{"type":"incompatibility_error","reason":"serverTooOld"}',

	// Protocol message types (client → server)
	'{"type":"connect","connectRequestId":"',
	',"lastServerClock":0,"protocolVersion":8,"schema":{"schemaVersion":2,"sequences":{}}}',
	'{"type":"push","clientClock":',
	',"diff":{',
	'{"type":"push","clientClock":',
	',"presence":["put",{',
	'{"type":"push","clientClock":',
	',"presence":["patch",{',
	'{"type":"ping"}',

	// Record operation patterns (these appear constantly in diffs)
	'["put",{',
	'["patch",{',
	'["remove"]',
	'["put",',
	'["delete"]',
	'["append",',

	// Record type names (typeName field)
	'"typeName":"shape"',
	'"typeName":"page"',
	'"typeName":"asset"',
	'"typeName":"binding"',
	'"typeName":"camera"',
	'"typeName":"document"',
	'"typeName":"instance"',
	'"typeName":"instance_page_state"',
	'"typeName":"instance_presence"',
	'"typeName":"pointer"',

	// Record ID prefixes (appear as keys in NetworkDiff)
	'"shape:',
	'"page:',
	'"asset:',
	'"binding:',
	'"camera:',
	'"document:document"',
	'"instance:instance"',
	'"instance_page_state:',
	'"instance_presence:',
	'"pointer:pointer"',

	// Common shape properties
	'"x":',
	',"y":',
	',"rotation":0,"isLocked":false',
	'"opacity":1',
	'"parentId":"page:',
	'"index":"a1"',
	'"id":"shape:',
	'"meta":{}',

	// Shape types
	'"type":"arrow"',
	'"type":"bookmark"',
	'"type":"draw"',
	'"type":"embed"',
	'"type":"frame"',
	'"type":"geo"',
	'"type":"group"',
	'"type":"highlight"',
	'"type":"image"',
	'"type":"line"',
	'"type":"note"',
	'"type":"text"',
	'"type":"video"',

	// Common geo/shape props
	'"props":{',
	'"w":',
	',"h":',
	'"color":"black"',
	'"color":"blue"',
	'"color":"red"',
	'"color":"green"',
	'"color":"orange"',
	'"color":"violet"',
	'"color":"yellow"',
	'"color":"grey"',
	'"color":"light-blue"',
	'"color":"light-green"',
	'"color":"light-red"',
	'"color":"light-violet"',
	'"fill":"none"',
	'"fill":"semi"',
	'"fill":"solid"',
	'"fill":"pattern"',
	'"fill":"force"',
	'"dash":"draw"',
	'"dash":"solid"',
	'"dash":"dashed"',
	'"dash":"dotted"',
	'"size":"m"',
	'"size":"s"',
	'"size":"l"',
	'"size":"xl"',
	'"font":"draw"',
	'"font":"sans"',
	'"font":"serif"',
	'"font":"mono"',
	'"align":"middle"',
	'"align":"start"',
	'"align":"end"',
	'"verticalAlign":"middle"',
	'"verticalAlign":"start"',
	'"verticalAlign":"end"',
	'"geo":"rectangle"',
	'"geo":"ellipse"',
	'"geo":"diamond"',
	'"geo":"triangle"',
	'"geo":"pentagon"',
	'"geo":"hexagon"',
	'"geo":"octagon"',
	'"geo":"star"',
	'"geo":"rhombus"',
	'"geo":"rhombus-2"',
	'"geo":"oval"',
	'"geo":"trapezoid"',
	'"geo":"arrow-right"',
	'"geo":"arrow-left"',
	'"geo":"arrow-up"',
	'"geo":"arrow-down"',
	'"geo":"x-box"',
	'"geo":"check-box"',
	'"geo":"heart"',
	'"geo":"cloud"',
	'"labelColor":"black"',
	'"text":"',
	'"autoSize":true',
	'"autoSize":false',
	'"growY":0',
	'"url":"',
	'"scale":1',

	// Arrow-specific
	'"start":{"x":',
	',"y":',
	'"end":{"x":',
	',"y":',
	'"bend":0',
	'"arrowheadStart":"none"',
	'"arrowheadEnd":"arrow"',
	'"labelPosition":0.5',

	// Draw shape segments
	'"segments":[{"type":"free","points":[{"x":',
	',"y":',
	',"z":',

	// Presence data
	'"cursor":{"x":',
	',"y":',
	',"rotation":0,"type":"default"}',
	',"rotation":0,"type":"cross"}',
	'"lastActivityTimestamp":["put",',
	'"cursor":["put",{"x":',
	',"y":',
	',"rotation":0,"type":"cross"}]}',
	'"currentPageId":"page:',
	'"selectedShapeIds":[]',
	'"selectedShapeIds":["shape:',
	'"brush":null',
	'"scribbles":[]',
	'"chatMessage":"',
	'"color":"#',
	'"userName":"',

	// Camera
	'"z":1',

	// Instance/page state
	'"focusedGroupId":null',
	'"editingShapeId":null',
	'"hoveredShapeId":null',
	'"erasingShapeIds":[]',
	'"hintingShapeIds":[]',
	'"croppingShapeId":null',

	// Common diff value patterns
	'["put",0]',
	'["put",1]',
	'["put",true]',
	'["put",false]',
	'["put",null]',
	'["put",""]',

	// Binding record patterns
	'"fromId":"shape:',
	'"toId":"shape:',
	'"terminal":"start"',
	'"terminal":"end"',

	// Page record
	'"name":"Page ',

	// Schema
	'"schemaVersion":2',
	'"sequences":{',
	'"com.tldraw.store":',
	'"com.tldraw.shape.',
	'"com.tldraw.binding.',
	'"com.tldraw.document":',
	'"com.tldraw.instance":',
	'"com.tldraw.page":',
	'"com.tldraw.asset":',
	'"com.tldraw.camera":',
	'"com.tldraw.instance_page_state":',
	'"com.tldraw.pointer":',
	'"com.tldraw.instance_presence":',

	// Full representative messages to give compressor long-range patterns
	'{"type":"push","clientClock":1,"diff":{"shape:abcdefghijkl":["patch",{"x":["put",100],"y":["put",200]}]}}',
	'{"type":"push","clientClock":1,"presence":["patch",{"cursor":["patch",{"x":["put",500],"y":["put",300]}]}]}',
	'{"type":"push","clientClock":44,"presence":["patch",{"lastActivityTimestamp":["put",1774455697660],"cursor":["put",{"x":1256.296875,"y":-102.52734375,"rotation":0,"type":"cross"}]}]}',
	'{"type":"push","clientClock":45,"presence":["patch",{"lastActivityTimestamp":["put",1774455698123],"cursor":["put",{"x":1301.125,"y":-95.75,"rotation":0,"type":"cross"}]}]}',
	'{"type":"push","clientClock":46,"presence":["patch",{"lastActivityTimestamp":["put",1774455698567],"cursor":["put",{"x":1314.5,"y":-88.25,"rotation":0,"type":"default"}]}]}',
	'{"type":"push","clientClock":47,"presence":["patch",{"lastActivityTimestamp":["put",1774455699012],"selectedShapeIds":["put",[]]}]}',
	'{"type":"push","clientClock":48,"presence":["patch",{"lastActivityTimestamp":["put",1774455699456],"currentPageId":["put","page:page"]}]}',
	'{"type":"push","clientClock":49,"presence":["patch",{"lastActivityTimestamp":["put",1774455699901],"brush":["put",null],"scribbles":["put",[]]}]}',
	'{"type":"patch","diff":{"instance_presence:abcdefghijkl":["patch",{"lastActivityTimestamp":["put",1774455697660],"cursor":["put",{"x":1256.296875,"y":-102.52734375,"rotation":0,"type":"cross"}]}]},"serverClock":43}',
	'{"type":"data","data":[{"type":"patch","diff":{"instance_presence:abcdefghijkl":["patch",{"lastActivityTimestamp":["put",1774455698123],"cursor":["put",{"x":1301.125,"y":-95.75,"rotation":0,"type":"cross"}]}]},"serverClock":44}]}',
	'{"type":"data","data":[{"type":"patch","diff":{"shape:abcdefghijkl":["patch",{"x":["put",100]}]},"serverClock":1},{"type":"push_result","clientClock":1,"serverClock":1,"action":"commit"}]}',
	'{"type":"patch","diff":{"instance_presence:abcdefghijkl":["patch",{"cursor":["patch",{"x":["put",250],"y":["put",350]}]}]},"serverClock":42}',
]

const encoder = new TextEncoder()
const parts = DICTIONARY_SAMPLES.map((s) => encoder.encode(s))
const totalLength = parts.reduce((acc, p) => acc + p.length, 0)
const dictionary = new Uint8Array(totalLength)
let offset = 0
for (const part of parts) {
	dictionary.set(part, offset)
	offset += part.length
}

export const TLDRAW_SYNC_DICTIONARY = dictionary
