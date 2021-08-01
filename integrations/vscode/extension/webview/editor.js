// Get a reference to the VS Code webview api.
// We use this API to post messages back to our extension.

// @ts-ignore
const vscode = acquireVsCodeApi()

const container = document.getElementById('container')

// Webviews are normally torn down when not visible and re-created when they become visible again.
// State lets us save information across these re-loads

const state = vscode.getState()

const runTimeStart = Date.now()
let virtualRunTimeStart = runTimeStart
if (state && state.virtualRunTimeStart !== undefined) {
  console.log('fresh start', state)
  virtualRunTimeStart = state.virtualRunTimeStart
} else {
  console.log('virtual fresh start', state)
  vscode.setState({ virtualRunTimeStart })
}

setInterval(() => {
  container.innerHTML = `<p>This editor has been (actually) running for ${(
    (Date.now() - runTimeStart) /
    1000.0
  ).toFixed(1)} seconds</p>`
  container.innerHTML += `<p>This editor has been (virtually) running for ${(
    (Date.now() - virtualRunTimeStart) /
    1000.0
  ).toFixed(1)} seconds</p>`
}, 30)

const notesContainer = /** @type {HTMLElement} */ (
  document.querySelector('.notes')
)

//const iframe = document.querySelector('iframe')

const errorContainer = document.createElement('div')
document.body.appendChild(errorContainer)
errorContainer.className = 'error'
errorContainer.style.display = 'none'

function resize() {
  document.body.style.width = `${window.innerWidth}px`
  document.body.style.height = `${window.innerHeight}px`
}
window.addEventListener('resize', resize)
resize()

/**
 * Render the document in the webview.
 */
function updateContent(/** @type {string} */ text) {
  //console.log(`${window.innerWidth},${window.innerHeight}`)
  setTimeout(() => {
    console.log(`"load" (webview -> iframe)`)
    //iframe.contentWindow.postMessage({ type: 'load', text }, '*')
  }, 1000)
  let json
  try {
    json = JSON.parse(text)
    //errorContainer.innerText = `<code>Hello!</code>`
  } catch {
    notesContainer.style.display = 'none'
    errorContainer.innerText = 'Error: Document is not valid json'
    errorContainer.style.display = ''
    return
  }
}

// Handle messages sent between
//   Extension <---> webview
//   webview <--> tldraw iframe
window.addEventListener('message', (event) => {
  const message = event.data // The json data that the extension sent
  switch (message.type) {
    // Send from extension when textdocument changed
    case 'load':
      const text = message.text

      // Update our webview's content
      updateContent(text)

      // Then persist state information.
      // This state is returned in the call to `vscode.getState` below when a webview is reloaded.
      // vscode.setState({
      //     text
      // })
      // // Webviews are normally torn down when not visible and re-created when they become visible again.
      // // State lets us save information across these re-loads
      // const state = vscode.getState()
      // if (state) {
      //     updateContent(state.text)
      // }
      break

    case 'update':
      console.log(`"update" (extension <- webview)`)
      vscode.postMessage({
        type: 'update',
        text: message.text,
      })
      break

    case 'save':
      console.log('tldraw editor requested a save')
      //console.log(message.text)
      console.log(`"save" (extension <- webview)`)
      vscode.postMessage({
        type: 'save',
      })
      break
  }
})
