import { Data, Page, PageState } from 'types'
import { setToArray } from 'utils/utils'

const CURRENT_VERSION = 'code_slate_0.0.4'
const DOCUMENT_ID = '0001'

function storageId(label: string, id: string) {
  return `${CURRENT_VERSION}_doc_${DOCUMENT_ID}_${label}_${id}`
}

class Storage {
  // Saving
  load(data: Data, id = CURRENT_VERSION) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    // Load data from local storage
    const savedData = localStorage.getItem(id)

    if (savedData !== null) {
      const restoredData = JSON.parse(savedData)

      // Empty shapes in state for each page
      for (let key in restoredData.document.pages) {
        restoredData.document.pages[key].shapes = {}
      }

      // Empty page states for each page
      for (let key in restoredData.pageStates) {
        restoredData.document.pages[key].shapes = {}
      }

      // Merge restored data into state
      Object.assign(data, restoredData)

      // Load current page
      this.loadPage(data, data.currentPageId)
    }
  }

  save = (data: Data, id = CURRENT_VERSION) => {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    const dataToSave: any = { ...data }

    // Don't save pageStates
    dataToSave.pageStates = {}

    // Save current data to local storage
    localStorage.setItem(id, JSON.stringify(dataToSave))

    // Save current page
    this.savePage(data, data.currentPageId)
  }

  savePage(data: Data, pageId: string) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    // Save page
    const page = data.document.pages[pageId]

    localStorage.setItem(storageId('page', pageId), JSON.stringify(page))

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
      storageId('pageState', pageId),
      JSON.stringify(pageState)
    )
  }

  loadPage(data: Data, pageId: string) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    // Load page and merge into state
    const savedPage = localStorage.getItem(storageId('page', pageId))

    if (savedPage !== null) {
      const restored: Page = JSON.parse(savedPage)
      data.document.pages[pageId] = restored
    }

    // Load page state and merge into state
    const savedPageState = localStorage.getItem(storageId('pageState', pageId))

    if (savedPageState !== null) {
      const restored: PageState = JSON.parse(savedPageState)
      restored.selectedIds = new Set(restored.selectedIds)
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

    // Empty shapes in state for other pages
    for (let key in data.document.pages) {
      if (key === pageId) continue
      data.document.pages[key].shapes = {}
    }

    // Empty page states for other pages
    for (let key in data.pageStates) {
      if (key === pageId) continue
      data.document.pages[key].shapes = {}
    }

    // Update camera
    document.documentElement.style.setProperty(
      '--camera-zoom',
      data.pageStates[data.currentPageId].camera.zoom.toString()
    )
  }
}

const storage = new Storage()

export default storage
