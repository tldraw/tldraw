import * as React from 'react'
import { Switch, Route, Link } from 'react-router-dom'
import Basic from './basic'
import Controlled from './controlled'
import Imperative from './imperative'
import Embedded from './embedded'
import NoSizeEmbedded from './no-size-embedded'
import { Multiplayer } from './multiplayer'
import ChangingId from './changing-id'
import Core from './core'
import './styles.css'

export default function App(): JSX.Element {
  return (
    <main>
      <Switch>
        <Route path="/basic">
          <Basic />
        </Route>
        <Route path="/core">
          <Core />
        </Route>
        <Route path="/controlled">
          <Controlled />
        </Route>
        <Route path="/imperative">
          <Imperative />
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
          <ul>
            <li>
              <Link to="/basic">basic</Link>
            </li>
            <li>
              <Link to="/core">core</Link>
            </li>
            <li>
              <Link to="/controlled">controlled</Link>
            </li>
            <li>
              <Link to="/imperative">imperative</Link>
            </li>
            <li>
              <Link to="/changing-id">changing id</Link>
            </li>
            <li>
              <Link to="/embedded">embedded</Link>
            </li>
            <li>
              <Link to="/no-size-embedded">embedded (no size)</Link>
            </li>
            <li>
              <Link to="/multiplayer">multiplayer</Link>
            </li>
          </ul>
        </Route>
      </Switch>
    </main>
  )
}
