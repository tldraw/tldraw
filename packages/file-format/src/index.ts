export { buildFromV1Document, type LegacyTldrawDocument } from './lib/buildFromV1Document'
export {
	TLDRAW_FILE_EXTENSION,
	TLDRAW_FILE_MIMETYPE,
	isV1File,
	parseAndLoadDocument,
	parseTldrawJsonFile,
	serializeTldrawJson,
	serializeTldrawJsonBlob,
	type TldrawFile,
	type TldrawFileParseError,
} from './lib/file'
