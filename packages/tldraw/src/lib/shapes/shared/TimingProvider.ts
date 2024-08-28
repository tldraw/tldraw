export type TConnectionState = 'closed' | 'closing' | 'connecting' | 'open';
export interface ITimingStateVector {
  readonly acceleration: number;
  readonly position: number;
  readonly timestamp: number;
  readonly velocity: number;
}
export type TFilteredTimingStateVectorUpdate = Partial<
    {
        -readonly [P in Exclude<keyof ITimingStateVector, 'timestamp'>]: ITimingStateVector[P];
    }
>;
export type TTimingStateVectorUpdate = {
  [P in keyof TFilteredTimingStateVectorUpdate]: null | TFilteredTimingStateVectorUpdate[P];
};

export interface ITimingProvider {
  startPosition: number;
  endPosition: number;
  readyState: TConnectionState;
  skew: number;
  vector: ITimingStateVector;

  update(newVector: TTimingStateVectorUpdate): Promise<void>;
}

export type TEventHandler<T, U extends Event = Event> = (ThisType<T> & { handler(event: U): void })['handler'];
export type TNativeEventTarget = EventTarget;
export type TFilterTimingStateVectorUpdateFunction = (vector?: TTimingStateVectorUpdate) => TFilteredTimingStateVectorUpdate;
export type TTranslateTimingStateVectorFunction = (vector: ITimingStateVector, delta: number) => ITimingStateVector;
export interface ITimingProviderEventMap extends Record<string, Event> {
  adjust: Event;

  change: Event;

  // @todo error: ErrorEvent;

  readystatechange: Event;
}


const wrapEventListener = <T>(target: T, eventListener: EventListenerOrEventListenerObject): EventListener => {
  return (event) => {
      const descriptor = { value: target };

      Object.defineProperties(event, {
          currentTarget: descriptor,
          target: descriptor
      });

      if (typeof eventListener === 'function') {
          return eventListener.call(target, event);
      }

      return eventListener.handleEvent.call(target, event);
  };
};

export interface IEventTarget<EventMap extends Record<string, Event>> extends TNativeEventTarget {
  addEventListener<Type extends keyof EventMap>(
      type: Type,
      listener: (this: this, event: EventMap[Type]) => void,
      options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type: string, listener: null | EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

  removeEventListener<Type extends keyof EventMap>(
      type: Type,
      listener: (this: this, event: EventMap[Type]) => void,
      options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(type: string, callback: null | EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean): void;
}


class EventTarget<EventMap extends Record<string, Event>> implements IEventTarget<EventMap> {
  private _listeners: WeakMap<EventListenerOrEventListenerObject, EventListenerOrEventListenerObject>;

  private _nativeEventTarget: TNativeEventTarget;

  constructor() {
      this._listeners = new WeakMap();
      this._nativeEventTarget = window.document.createElement('p');
  }

  public addEventListener(
      type: string,
      listener: null | TEventHandler<this> | EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
  ): void {
      if (listener !== null) {
          let wrappedEventListener = this._listeners.get(listener);

          if (wrappedEventListener === undefined) {
              wrappedEventListener = wrapEventListener(this, listener);

              if (typeof listener === 'function') {
                  this._listeners.set(listener, wrappedEventListener);
              }
          }

          this._nativeEventTarget.addEventListener(type, wrappedEventListener, options);
      }
  }

  public dispatchEvent(event: Event): boolean {
      return this._nativeEventTarget.dispatchEvent(event);
  }

  public removeEventListener(
      type: string,
      listener: null | TEventHandler<this> | EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
  ): void {
      const wrappedEventListener = listener === null ? undefined : this._listeners.get(listener);

      this._nativeEventTarget.removeEventListener(type, wrappedEventListener === undefined ? null : wrappedEventListener, options);
  }
};

const filterTimingStateVectorUpdate: TFilterTimingStateVectorUpdateFunction = (vector) => {
  if (vector === undefined) {
      return {};
  }

  let filteredVector: TFilteredTimingStateVectorUpdate =
      vector.acceleration !== null && vector.acceleration !== undefined ? { acceleration: vector.acceleration } : {};

  if (vector.position !== null && vector.position !== undefined) {
      filteredVector = { ...filteredVector, position: vector.position };
  }

  if (vector.velocity !== null && vector.velocity !== undefined) {
      return { ...filteredVector, velocity: vector.velocity };
  }

  return filteredVector;
};

const translateTimingStateVector: TTranslateTimingStateVectorFunction = (vector, delta) => {
  const { acceleration, position, timestamp, velocity } = vector;

  return {
      acceleration,
      position: position + velocity * delta + 0.5 * acceleration * delta ** 2,
      timestamp: timestamp + delta,
      velocity: velocity + acceleration * delta
  };
};

const updateTimingStateVector = (timingStateVector: ITimingStateVector, timingStateVectorUpdate: TTimingStateVectorUpdate) => {
    const filteredTimingStateVectorUpdate = filterTimingStateVectorUpdate(timingStateVectorUpdate);
    const translatedTimingStateVector = translateTimingStateVector(
        timingStateVector,
        performance.now() / 1000 - timingStateVector.timestamp
    );

    for (const [key, value] of <[keyof ITimingStateVector, number][]>Object.entries(filteredTimingStateVectorUpdate)) {
        if (value !== translatedTimingStateVector[key]) {
            return { ...translatedTimingStateVector, ...filteredTimingStateVectorUpdate };
        }
    }

    return null;
};


export class TimingProvider extends EventTarget<ITimingProviderEventMap> implements ITimingProvider {
  startPosition: number;
  endPosition: number;
  readyState: TConnectionState;
  skew: number;
  vector: ITimingStateVector;
  private clientId: number;

  constructor(webSocketUrl: string) {
      super();

      const timestamp = performance.now() / 1000;

      this.startPosition = Number.NEGATIVE_INFINITY;
      this.endPosition = Number.POSITIVE_INFINITY;
      this.readyState = 'connecting';
      this.skew = 0;
      this.vector = { acceleration: 0, position: 0, timestamp, velocity: 0 };
      this.clientId = -1;

      this._createClient(webSocketUrl);
  }

  public update(newVector: TTimingStateVectorUpdate): Promise<void> {
    const updatedVector = updateTimingStateVector(this.vector, newVector);
    console.log('update', this.vector,newVector, updatedVector)
      if (updatedVector) {
        this.vector = updatedVector
        this.dispatchEvent(new CustomEvent('change', { detail: updatedVector }));
        this.socket.send(JSON.stringify({ client: {id: this.clientId}, type: 'change', detail: updatedVector }));
      }

      return Promise.resolve();
  }

  private _createClient(webSocketUrl: string) {
    // Create WebSocket connection.
    this.socket = new WebSocket(webSocketUrl);

    // Connection opened
    this.socket.addEventListener("open", () => {
      /* blah */
    });
    this.socket.addEventListener("message", event => {
      const data = JSON.parse(event.data);
      if (data.type === 'init') {
        this.clientId = data.client.id
        this.readyState = 'open';
        this.dispatchEvent(new Event('readystatechange'));
      }
      if (data.type === 'change' && data.client.id !== this.clientId) {
        this.update(data.detail)
      }
      console.log('socket',event)
      !this.skew && this.socket.send(JSON.stringify({ client: {id: this.clientId}, type: 'test' }));
      this.skew = 1;


    })
  }

  //                                             if (group$.key === 'ping') {
  //                                                 return group$.pipe(
  //                                                     tap(({ index, timestamp, reply }) =>
  //                                                         reply({
  //                                                             index,
  //                                                             remoteReceivedTime: timestamp,
  //                                                             remoteSentTime: performance.now(),
  //                                                             type: 'pong'
  //                                                         })
  //                                                     ),
  //                                                     ignoreElements()
  //                                                 );
  //                                             }

  //                                             if (group$.key === 'pong') {
  //                                                 return group$.pipe(
  //                                                     matchPongWithPing(localSentTimesSubject),
  //                                                     computeOffsetAndRoundTripTime(),
  //                                                     selectMostLikelyOffset(),
  //                                                     map((offset) => [1, offset] as const)
  //                                                 );
  //                                             }

  //                                         distinctUntilChanged(
  //                                             ([vectorA, [offsetA, roundTripTimeA]], [vectorB, [offsetB, roundTripTimeB]]) =>
  //                                                 vectorA === vectorB && offsetA === offsetB && roundTripTimeA === roundTripTimeB
  //                                         ),
  //                                         map(
  //                                             ([vector, [offset, roundTripTime]]) =>
  //                                                 <const>[
  //                                                     messageOrFunctionTuple$.key,
  //                                                     vector === null
  //                                                         ? null
  //                                                         : { ...vector, timestamp: vector.timestamp - offset / 1000 },
  //                                                     roundTripTime
  //                                                 ]
  //                                         ),
  // }
};
// import { OperatorFunction, map } from 'rxjs';

// /*
//  * This will compute the offset with the formula `remoteTime - localTime`. That means a positive offset indicates that `remoteTime` is
//  * larger than `localTime` and viceversa.
//  */
// export const computeOffsetAndRoundTripTime = (): OperatorFunction<readonly [number, number, number, number], [number, number]> =>
//     map(([localSentTime, remoteReceivedTime, remoteSentTime, localReceivedTime]) => [
//         (remoteReceivedTime + remoteSentTime - localSentTime - localReceivedTime) / 2,
//         localReceivedTime - localSentTime + remoteReceivedTime - remoteSentTime
//     ]);
