import * as React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Basic from './basic'
import ReadOnly from './readonly'
import PropsControl from './props-control'
import ApiControl from './api-control'
import LoadingFiles from './loading-files'
import Embedded from './embedded'
import NoSizeEmbedded from './no-size-embedded'
import ChangingId from './changing-id'
import Persisted from './persisted'
import Develop from './develop'
import Api from './api'
import FileSystem from './file-system'
import UIOptions from './ui-options'
import { Multiplayer } from './multiplayer'
import { Multiplayer as MultiplayerWithImages } from './multiplayer-with-images'
import './styles.css'

export default function App(): JSX.Element {
  return (
    <main>
      <Routes>
        <Route path="/develop" element={<Develop />} />

        <Route path="/basic" element={<Basic />} />

        <Route path="/ui-options" element={<UIOptions />} />

        <Route path="/persisted" element={<Persisted />} />

        <Route path="/loading-files" element={<LoadingFiles />} />

        <Route path="/file-system" element={<FileSystem />} />

        <Route path="/api" element={<Api />} />

        <Route path="/readonly" element={<ReadOnly />} />

        <Route path="/controlled" element={<PropsControl />} />

        <Route path="/imperative" element={<ApiControl />} />

        <Route path="/changing-id" element={<ChangingId />} />

        <Route path="/embedded" element={<Embedded />} />

        <Route path="/no-size-embedded" element={<NoSizeEmbedded />} />

        <Route path="/multiplayer" element={<Multiplayer />} />

        <Route path="/multiplayer-with-images" element={MultiplayerWithImages} />
        <Route
          path="/"
          element={
            <div>
              <img className="hero" src="./card-repo.png" />
              <ul className="links">
                <li>
                  <Link to="/develop">Develop</Link>
                </li>
                <hr />
                <li>
                  <Link to="/basic">Basic</Link>
                </li>
                <li>
                  <Link to="/ui-options">UI Options</Link>
                </li>
                <li>
                  <Link to="/persisted">Persisting State with an ID</Link>
                </li>
                <li>
                  <Link to="/file-system">Using the File System</Link>
                </li>
                <li>
                  <Link to="/readonly">Readonly Mode</Link>
                </li>
                <li>
                  <Link to="/loading-files">Loading Files</Link>
                </li>
                <li>
                  <Link to="/controlled">Controlled via Props</Link>
                </li>
                <li>
                  <Link to="/api">Using the TldrawApp API</Link>
                </li>
                <li>
                  <Link to="/imperative">Controlled via TldrawApp API</Link>
                </li>
                <li>
                  <Link to="/changing-id">Changing ID</Link>
                </li>
                <li>
                  <Link to="/embedded">Embedded</Link>
                </li>
                <li>
                  <Link to="/no-size-embedded">Embedded (without explicit size)</Link>
                </li>
                <li>
                  <Link to="/multiplayer">Multiplayer</Link>
                </li>
              </ul>
            </div>
          }
        />
      </Routes>
    </main>
  )
}
