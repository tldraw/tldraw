import { FileCapability } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { RefObject, createContext, useContext } from 'react'
import { Atom, Editor, assertExists } from 'tldraw'
import { FileLoad } from '../../../utils/fileLoad'

export type FileSyncStore = ReturnType<typeof useSync>

export const FileSyncStoreContext = createContext<FileSyncStore | null>(null)

export function useFileSyncStore(): FileSyncStore {
	return assertExists(useContext(FileSyncStoreContext), 'TlaFileSyncHost is missing above')
}

export const FileLoadContext = createContext<FileLoad | null>(null)

/** This file open's file_load tracker, begun where the open begins: the sync host. */
export function useFileLoad(): FileLoad {
	return assertExists(useContext(FileLoadContext), 'TlaFileSyncHost is missing above')
}

export const FileEditorRefContext = createContext<RefObject<Editor | null> | null>(null)

/**
 * Where the editor below registers itself for this file. A ref because the host mounts first and
 * only ever reads it when a job arrives, so nothing here should re-render over it.
 */
export function useFileEditorRef() {
	return assertExists(useContext(FileEditorRefContext), 'TlaFileSyncHost is missing above')
}

declare module 'tldraw' {
	interface TLCapabilities {
		comment: null
	}
}

/** Null until the room says; otherwise an editor offers everything before it knows its tier. */
export type FileCapabilities = Atom<ReadonlySet<FileCapability> | null>

export const FileCapabilitiesContext = createContext<FileCapabilities | null>(null)

/** The capabilities the room sent this session. */
export function useFileCapabilities(): FileCapabilities {
	return assertExists(useContext(FileCapabilitiesContext), 'TlaFileSyncHost is missing above')
}
