import * as fa from 'browser-fs-access'
import { Data, Page, PageState, TLDocument } from 'types'
import { lzw_decode, lzw_encode, setToArray } from 'utils/utils'
import state from './state'
import { current } from 'immer'
import { v4 as uuid } from 'uuid'
import * as idb from 'idb-keyval'

const CURRENT_VERSION = 'code_slate_0.0.6'
const DOCUMENT_ID = '0001'

function storageId(fileId: string, label: string, id?: string) {
  return [CURRENT_VERSION, fileId, label, id].filter(Boolean).join('_')
}

class Storage {
  previousSaveHandle?: fa.FileSystemHandle

  constructor() {
    // this.loadPreviousHandle() // Still needs debugging
  }

  firstLoad(data: Data) {
    const lastOpened = localStorage.getItem(`${CURRENT_VERSION}_lastOpened`)

    this.loadDocumentFromLocalStorage(data, lastOpened || DOCUMENT_ID)

    this.loadPage(data, data.currentPageId)

    this.saveToLocalStorage(data, data.document.id)

    localStorage.setItem(`${CURRENT_VERSION}_lastOpened`, data.document.id)
  }

  load(data: Data, restoredData: any) {
    // Before loading the state, save the pages / page states
    for (let key in restoredData.document.pages) {
      this.savePage(restoredData, restoredData.document.id, key)
    }

    // Empty current state.
    data.document = {} as TLDocument
    data.pageStates = {}

    // Merge restored data into state.
    Object.assign(data, restoredData)

    // Add id and name to document, just in case.
    data.document = {
      id: 'document0',
      name: 'My Document',
      ...restoredData.document,
    }
  }

  loadDocumentFromLocalStorage(data: Data, fileId = DOCUMENT_ID) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    // Load data from local storage
    const savedData = localStorage.getItem(
      storageId(fileId, 'document', fileId)
    )

    if (savedData === null) {
      // If we're going to use the default data, assign the
      // current document a fresh random id.
      data.document.id = uuid()
      return false
    }

    const restoredData: any = JSON.parse(lzw_decode(savedData))

    for (let pageId in restoredData.document.pages) {
      const selectedIds = restoredData.pageStates[pageId].selectedIds
      restoredData.pageStates[pageId].selectedIds = new Set(selectedIds)
    }

    this.load(data, restoredData)
  }

  getDataToSave = (data: Data) => {
    const dataToSave = current(data) as any

    for (let pageId in data.document.pages) {
      const savedPage = localStorage.getItem(
        storageId(data.document.id, 'page', pageId)
      )

      if (savedPage !== null) {
        const restored: Page = JSON.parse(lzw_decode(savedPage))
        dataToSave.document.pages[pageId] = restored
      }

      const pageState = dataToSave.pageStates[pageId]
      pageState.selectedIds = setToArray(pageState.selectedIds)
    }

    return JSON.stringify(dataToSave, null, 2)
  }

  saveToLocalStorage = (data: Data, fileId = data.document.id) => {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    const dataToSave = this.getDataToSave(data)

    // Save current data to local storage
    localStorage.setItem(
      storageId(fileId, 'document', fileId),
      lzw_encode(dataToSave)
    )
  }

  loadDocumentFromJson(data: Data, restoredData: any) {
    this.load(data, restoredData)
    this.loadPage(data, data.currentPageId)
    this.saveToLocalStorage(data, data.document.id)
    localStorage.setItem(`${CURRENT_VERSION}_lastOpened`, data.document.id)
  }
  /* ---------------------- Pages --------------------- */

  async loadPreviousHandle() {
    const handle: fa.FileSystemHandle | undefined = await idb.get(
      'previous_handle'
    )
    if (handle !== undefined) {
      this.previousSaveHandle = handle
    }
  }

  savePage(data: Data, fileId = data.document.id, pageId = data.currentPageId) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    // Save page
    const page = data.document.pages[pageId]
    const json = JSON.stringify(page)

    localStorage.setItem(storageId(fileId, 'page', pageId), lzw_encode(json))

    // Save page state

    let currentPageState = {
      camera: {
        point: [0, 0],
        zoom: 1,
      },
      selectedIds: new Set([]),
      ...data.pageStates[pageId],
    }

    localStorage.setItem(
      storageId(fileId, 'pageState', pageId),
      JSON.stringify({
        ...currentPageState,
        selectedIds: setToArray(currentPageState.selectedIds),
      })
    )
  }

  loadPage(data: Data, pageId = data.currentPageId) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    const fileId = data.document.id

    // Page

    const savedPage = localStorage.getItem(storageId(fileId, 'page', pageId))

    if (savedPage !== null) {
      data.document.pages[pageId] = JSON.parse(lzw_decode(savedPage))
    } else {
      data.document.pages[pageId] = {
        id: pageId,
        type: 'page',
        childIndex: 0,
        name: 'Page',
        shapes: {},
      }
    }

    // Page state

    const savedPageState = localStorage.getItem(
      storageId(fileId, 'pageState', pageId)
    )

    if (savedPageState !== null) {
      const restored: PageState = JSON.parse(savedPageState)
      data.pageStates[pageId] = restored
    } else {
      data.pageStates[pageId] = {
        camera: {
          point: [0, 0],
          zoom: 1,
        },
        selectedIds: new Set([]),
      }
    }

    data.pageStates[pageId].selectedIds = new Set(
      data.pageStates[pageId].selectedIds
    )

    // Empty shapes in state for other pages

    for (let key in data.document.pages) {
      if (key === pageId) continue
      data.document.pages[key].shapes = {}
    }

    // Update camera for the new page state
    document.documentElement.style.setProperty(
      '--camera-zoom',
      data.pageStates[data.currentPageId].camera.zoom.toString()
    )
  }

  /* ------------------- File System ------------------ */

  saveToFileSystem = (data: Data) => {
    this.saveDataToFileSystem(data, data.document.id, false)
  }

  saveAsToFileSystem = (data: Data) => {
    this.saveDataToFileSystem(data, uuid(), true)
  }

  saveDataToFileSystem = (data: Data, fileId: string, saveAs: boolean) => {
    const json = this.getDataToSave(data)

    this.saveToLocalStorage(data, fileId)

    const blob = new Blob([json], {
      type: 'application/vnd.tldraw+json',
    })

    fa.fileSave(
      blob,
      {
        fileName: `${
          saveAs
            ? data.document.name
            : this.previousSaveHandle?.name || 'My Document'
        }.tldr`,
        description: 'tldraw file',
        extensions: ['.tldr'],
      },
      saveAs ? undefined : this.previousSaveHandle,
      true
    )
      .then((handle) => {
        this.previousSaveHandle = handle
        state.send('SAVED_FILE_TO_FILE_SYSTEM')
        idb.set('previous_handle', handle)
      })
      .catch((e) => {
        state.send('CANCELLED_SAVE', { reason: e.message })
      })
  }

  loadDocumentFromFilesystem() {
    console.warn('Loading file from file system.')
    fa.fileOpen({
      description: 'tldraw files',
    })
      .then((blob) =>
        getTextFromBlob(blob).then((text) => {
          const restoredData = JSON.parse(text)

          if (restoredData === null) {
            console.warn('Could not load that data.')
            return
          }

          // Save blob for future saves
          this.previousSaveHandle = blob.handle

          state.send('LOADED_FROM_FILE', { restoredData: { ...restoredData } })
        })
      )
      .catch((e) => {
        state.send('CANCELLED_SAVE', { reason: e.message })
      })
  }
}

const storage = new Storage()

export default storage

async function getTextFromBlob(blob: Blob): Promise<string> {
  // Return blob as text if a text file.
  if ('text' in Blob) return blob.text()

  // Return blob as text if a text file.
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      if (reader.readyState === FileReader.DONE) {
        resolve(reader.result as string)
      }
    }

    reader.readAsText(blob, 'utf8')
  })
}
