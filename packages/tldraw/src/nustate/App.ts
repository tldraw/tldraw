import { AppState, Document, Settings } from './stores'

export class App {
  settings = new Settings()
  appState = new AppState()
  document = new Document()
}
