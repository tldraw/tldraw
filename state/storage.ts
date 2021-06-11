import * as fa from 'browser-fs-access'
import { Data, Page, PageState, TLDocument } from 'types'
import { setToArray } from 'utils/utils'
import state from './state'
import { v4 as uuid } from 'uuid'

const CURRENT_VERSION = 'code_slate_0.0.5'
const DOCUMENT_ID = '0001'

function storageId(label: string, fileId: string, id: string) {
  return `${CURRENT_VERSION}_doc_${fileId}_${label}_${id}`
}

class Storage {
  load(data: Data, restoredData: any) {
    // Empty shapes in state for each page
    for (let key in restoredData.document.pages) {
      restoredData.document.pages[key].shapes = {}
    }

    // Empty page states for each page
    for (let key in restoredData.pageStates) {
      restoredData.document.pages[key].shapes = {}
    }

    data.document = {} as TLDocument
    data.pageStates = {}

    // Merge restored data into state
    Object.assign(data, restoredData)

    // Minor migrtation: add id and name to document
    data.document = {
      id: 'document0',
      name: 'My Document',
      ...restoredData.document,
    }

    // Load current page
    this.loadPage(data, data.currentPageId)
  }

  async loadDocumentFromFilesystem() {
    const blob = await fa.fileOpen({
      description: 'tldraw files',
    })

    const text = await getTextFromBlob(blob)

    const restoredData = JSON.parse(text)

    if (restoredData === null) {
      console.warn('Could not load that data.')
      return
    }

    state.send('LOADED_FROM_FILE', { restoredData })
  }

  loadDocumentFromLocalStorage(data: Data, fileId = DOCUMENT_ID) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    // Load data from local storage
    const savedData = localStorage.getItem(fileId)

    if (savedData === null) return false

    const restoredData = JSON.parse(savedData)

    this.load(data, restoredData)
  }

  getDataToSave = (data: Data) => {
    const dataToSave: any = { ...data }

    for (let pageId in data.document) {
      const savedPage = localStorage.getItem(
        storageId(data.document.id, 'page', pageId)
      )

      if (savedPage !== null) {
        const restored: Page = JSON.parse(savedPage)
        dataToSave.document.pages[pageId] = restored
      }
    }

    dataToSave.pageStates = {}

    return JSON.stringify(dataToSave, null, 2)
  }

  saveToLocalStorage = (data: Data, id = data.document.id) => {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    // Save current data to local storage
    localStorage.setItem(id, this.getDataToSave(data))

    // Save current page too
    this.savePage(data, id, data.currentPageId)

    state.send('SAVED_FILE_TO_LOCAL_STORAGE')
  }

  saveAsToFileSystem = (data: Data) => {
    // Create a new document id when saving to the file system
    this.saveToFileSystem(data, uuid())
  }

  saveToFileSystem = (data: Data, id = data.document.id) => {
    // Save to local storage first
    this.saveToLocalStorage(data, id)

    const json = this.getDataToSave(data)

    const blob = new Blob([json], {
      type: 'application/vnd.tldraw+json',
    })

    fa.fileSave(blob, {
      fileName: `${data.document.name}.tldr`,
      description: 'tldraw file',
      extensions: ['.tldr'],
    })
      .then(() => {
        state.send('SAVED_FILE_TO_FILE_SYSTEM')
      })
      .catch((e) => {
        state.send('CANCELLED_SAVE', { reason: e.message })
      })
  }

  loadPageFromLocalStorage(fileId: string, pageId: string) {
    let restored: Page

    const savedPage = localStorage.getItem(storageId(fileId, 'page', pageId))

    if (savedPage !== null) {
      restored = JSON.parse(savedPage)
    } else {
      restored = {
        id: pageId,
        type: 'page',
        childIndex: 0,
        name: 'Page',
        shapes: {},
      }
    }

    return restored
  }

  loadPageStateFromLocalStorage(fileId: string, pageId: string) {
    let restored: PageState

    const savedPageState = localStorage.getItem(
      storageId(fileId, 'pageState', pageId)
    )

    if (savedPageState !== null) {
      restored = JSON.parse(savedPageState)
      restored.selectedIds = new Set(restored.selectedIds)
    } else {
      restored = {
        camera: {
          point: [0, 0],
          zoom: 1,
        },
        selectedIds: new Set([]),
      }
    }

    return restored
  }

  savePage(data: Data, fileId = data.document.id, pageId = data.currentPageId) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    // Save page
    const page = data.document.pages[pageId]

    localStorage.setItem(
      storageId(fileId, 'page', pageId),
      JSON.stringify(page)
    )

    // Save page state

    let currentPageState = {
      camera: {
        point: [0, 0],
        zoom: 1,
      },
      selectedIds: new Set([]),
      ...data.pageStates[pageId],
    }

    const pageState = {
      ...currentPageState,
      selectedIds: setToArray(currentPageState.selectedIds),
    }

    localStorage.setItem(
      storageId(fileId, 'pageState', pageId),
      JSON.stringify(pageState)
    )
  }

  loadPage(data: Data, pageId = data.currentPageId) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    const fileId = data.document.id

    data.document.pages[pageId] = this.loadPageFromLocalStorage(fileId, pageId)

    data.pageStates[pageId] = this.loadPageStateFromLocalStorage(fileId, pageId)

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
