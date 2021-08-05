# @parcel/watcher

A native C++ Node module for querying and subscribing to filesystem events. Used by [Parcel 2](https://github.com/parcel-bundler/parcel).

## Features

- **Watch** - subscribe to realtime recursive directory change notifications when files or directories are created, updated, or deleted.
- **Query** - performantly query for historical change events in a directory, even when your program is not running.
- **Native** - implemented in C++ for performance and low-level integration with the operating system.
- **Cross platform** - includes backends for macOS, Linux, Windows, and Watchman.
- **Performant** - events are throttled in C++ so the JavaScript thread is not overwhelmed during large filesystem changes (e.g. `git checkout` or `npm install`).
- **Scalable** - tens of thousands of files can be watched or queried at once with good performance.

## Example

```javascript
const watcher = require('@parcel/watcher');
const path = require('path');

// Subscribe to events
let subscription = await watcher.subscribe(process.cwd(), (err, events) => {
  console.log(events);
});

// later on...
await subscription.unsubscribe();

// Get events since some saved snapshot in the past
let snapshotPath = path.join(process.cwd(), 'snapshot.txt');
let events = await watcher.getEventsSince(process.cwd(), snapshotPath);

// Save a snapshot for later
await watcher.writeSnapshot(process.cwd(), snapshotPath);
```

## Watching

`@parcel/watcher` supports subscribing to realtime notifications of changes in a directory. It works recursively, so changes in sub-directories will also be emitted.

Events are throttled and coalesced for performance during large changes like `git checkout` or `npm install`, and a single notification will be emitted with all of the events at the end.

Only one notification will be emitted per file. For example, if a file was both created and updated since the last event, you'll get only a `create` event. If a file is both created and deleted, you will not be notifed of that file. Renames cause two events: a `delete` for the old name, and a `create` for the new name.

```javascript
let subscription = await watcher.subscribe(process.cwd(), (err, events) => {
  console.log(events);
});
```

Events have two properties:

- `type` - the event type: `create`, `update`, or `delete`.
- `path` - the absolute realpath to the file.

To unsubscribe from change notifications, call the `unsubscribe` method on the returned subscription object.

```javascript
await subscription.unsubscribe();
```

`@parcel/watcher` has the following watcher backends, listed in priority order:

- [FSEvents](https://developer.apple.com/documentation/coreservices/file_system_events) on macOS
- [Watchman](https://facebook.github.io/watchman/) if installed
- [inotify](http://man7.org/linux/man-pages/man7/inotify.7.html) on Linux
- [ReadDirectoryChangesW](https://msdn.microsoft.com/en-us/library/windows/desktop/aa365465%28v%3Dvs.85%29.aspx) on Windows

You can specify the exact backend you wish to use by passing the `backend` option. If that backend is not available on the current platform, the default backend will be used instead. See below for the list of backend names that can be passed to the options.

## Querying

`@parcel/watcher` also supports querying for historical changes made in a directory, even when your program is not running. This makes it easy to invalidate a cache and re-build only the files that have changed, for example. It can be **significantly** faster than traversing the entire filesystem to determine what files changed, depending on the platform.

In order to query for historical changes, you first need a previous snapshot to compare to. This can be saved to a file with the `writeSnapshot` function, e.g. just before your program exits.

```javascript
await watcher.writeSnapshot(dirPath, snapshotPath);
```

When your program starts up, you can query for changes that have occurred since that snapshot using the `getEventsSince` function.

```javascript
let events = await watcher.getEventsSince(dirPath, snapshotPath);
```

The events returned are exactly the same as the events that would be passed to the `subscribe` callback (see above).

`@parcel/watcher` has the following watcher backends, listed in priority order:

- [FSEvents](https://developer.apple.com/documentation/coreservices/file_system_events) on macOS
- [Watchman](https://facebook.github.io/watchman/) if installed
- [fts](http://man7.org/linux/man-pages/man3/fts.3.html) (brute force) on Linux
- [FindFirstFile](https://docs.microsoft.com/en-us/windows/desktop/api/fileapi/nf-fileapi-findfirstfilea) (brute force) on Windows

The FSEvents (macOS) and Watchman backends are significantly more performant than the brute force backends used by default on Linux and Windows, for example returning results in miliseconds instead of seconds for large directory trees. This is because a background daemon monitoring filesystem changes on those platforms allows us to query cached data rather than traversing the filesystem manually (brute force).

macOS has good performance with FSEvents by default. For the best performance on other platforms, install [Watchman](https://facebook.github.io/watchman/) and it will be used by `@parcel/watcher` automatically.

You can specify the exact backend you wish to use by passing the `backend` option. If that backend is not available on the current platform, the default backend will be used instead. See below for the list of backend names that can be passed to the options.

## Options

All of the APIs in `@parcel/watcher` support the following options, which are passed as an object as the last function argument.

- `ignore` - an array of paths to ignore. They can be either files or directories. No events will be emitted about these files or directories or their children.
- `backend` - the name of an explicitly chosen backend to use. Allowed options are `"fs-events"`, `"watchman"`, `"inotify"`, `"windows"`, or `"brute-force"` (only for querying). If the specified backend is not available on the current platform, the default backend will be used instead.

## License

MIT
