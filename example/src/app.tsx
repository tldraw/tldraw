import * as React from 'react'
import { Switch, Route, Link } from 'react-router-dom'
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
import './styles.css'

export default function App(): JSX.Element {
  return (
    <main>
      <Switch>
        <Route path="/develop">
          <Develop />
        </Route>
        <Route path="/basic">
          <Basic />
        </Route>
        <Route path="/ui-options">
          <UIOptions />
        </Route>
        <Route path="/persisted">
          <Persisted />
        </Route>
        <Route path="/loading-files">
          <LoadingFiles />
        </Route>
        <Route path="/file-system">
          <FileSystem />
        </Route>
        <Route path="/api">
          <Api />
        </Route>
        <Route path="/readonly">
          <ReadOnly />
        </Route>
        <Route path="/controlled">
          <PropsControl />
        </Route>
        <Route path="/imperative">
          <ApiControl />
        </Route>
        <Route path="/changing-id">
          <ChangingId />
        </Route>
        <Route path="/embedded">
          <Embedded />
        </Route>
        <Route path="/no-size-embedded">
          <NoSizeEmbedded />
        </Route>
        <Route path="/multiplayer">
          <Multiplayer />
        </Route>
        <Route path="/">
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
              <Link to="/file-system">Using the File System</Link>
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
        </Route>
      </Switch>
    </main>
  )
}
