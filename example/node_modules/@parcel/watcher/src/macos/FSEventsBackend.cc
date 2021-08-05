#include <CoreServices/CoreServices.h>
#include <sys/stat.h>
#include <string>
#include <fstream>
#include <unordered_set>
#include "../Event.hh"
#include "../Backend.hh"
#include "./FSEventsBackend.hh"
#include "../Watcher.hh"

#define CONVERT_TIME(ts) ((uint64_t)ts.tv_sec * 1000000000 + ts.tv_nsec)

void stopStream(FSEventStreamRef stream, CFRunLoopRef runLoop) {
  FSEventStreamStop(stream);
  FSEventStreamUnscheduleFromRunLoop(stream, runLoop, kCFRunLoopDefaultMode);
  FSEventStreamInvalidate(stream);
  FSEventStreamRelease(stream);
}

struct State {
  FSEventStreamRef stream;
  std::shared_ptr<DirTree> tree;
  uint64_t since;
};

void FSEventsCallback(
  ConstFSEventStreamRef streamRef,
  void *clientCallBackInfo,
  size_t numEvents,
  void *eventPaths,
  const FSEventStreamEventFlags eventFlags[],
  const FSEventStreamEventId eventIds[]
) {
  char **paths = (char **)eventPaths;
  Watcher *watcher = (Watcher *)clientCallBackInfo;
  EventList *list = &watcher->mEvents;
  State *state = (State *)watcher->state;
  uint64_t since = state->since;

  for (size_t i = 0; i < numEvents; ++i) {
    bool isCreated = (eventFlags[i] & kFSEventStreamEventFlagItemCreated) == kFSEventStreamEventFlagItemCreated;
    bool isRemoved = (eventFlags[i] & kFSEventStreamEventFlagItemRemoved) == kFSEventStreamEventFlagItemRemoved;
    bool isModified = (eventFlags[i] & kFSEventStreamEventFlagItemModified) == kFSEventStreamEventFlagItemModified ||
                      (eventFlags[i] & kFSEventStreamEventFlagItemInodeMetaMod) == kFSEventStreamEventFlagItemInodeMetaMod ||
                      (eventFlags[i] & kFSEventStreamEventFlagItemFinderInfoMod) == kFSEventStreamEventFlagItemFinderInfoMod ||
                      (eventFlags[i] & kFSEventStreamEventFlagItemChangeOwner) == kFSEventStreamEventFlagItemChangeOwner ||
                      (eventFlags[i] & kFSEventStreamEventFlagItemXattrMod) == kFSEventStreamEventFlagItemXattrMod;
    bool isRenamed = (eventFlags[i] & kFSEventStreamEventFlagItemRenamed) == kFSEventStreamEventFlagItemRenamed;
    bool isDone = (eventFlags[i] & kFSEventStreamEventFlagHistoryDone) == kFSEventStreamEventFlagHistoryDone;
    bool isDir = (eventFlags[i] & kFSEventStreamEventFlagItemIsDir) == kFSEventStreamEventFlagItemIsDir;

    if (isDone) {
      watcher->notify();
      break;
    }

    // FSEvents exclusion paths only apply to files, not directories.
    if (watcher->isIgnored(paths[i])) {
      continue;
    }

    // Handle unambiguous events first
    if (isCreated && !(isRemoved || isModified || isRenamed)) {
      state->tree->add(paths[i], 0, isDir);
      list->create(paths[i]);
    } else if (isRemoved && !(isCreated || isModified || isRenamed)) {
      state->tree->remove(paths[i]);
      list->remove(paths[i]);
    } else if (isModified && !(isCreated || isRemoved || isRenamed)) {
      state->tree->update(paths[i], 0);
      list->update(paths[i]);
    } else {
      // If multiple flags were set, then we need to call `stat` to determine if the file really exists.
      // This helps disambiguate creates, updates, and deletes.
      struct stat file;
      if (stat(paths[i], &file)) {
        // File does not exist, so we have to assume it was removed. This is not exact since the
        // flags set by fsevents get coalesced together (e.g. created & deleted), so there is no way to
        // know whether the create and delete both happened since our snapshot (in which case
        // we'd rather ignore this event completely). This will result in some extra delete events
        // being emitted for files we don't know about, but that is the best we can do.
        state->tree->remove(paths[i]);
        list->remove(paths[i]);
        continue;
      }

      // If the file was modified, and existed before, then this is an update, otherwise a create.
      uint64_t ctime = CONVERT_TIME(file.st_birthtimespec);
      uint64_t mtime = CONVERT_TIME(file.st_mtimespec);
      auto existed = !since && state->tree->find(paths[i]);
      if (isModified && (existed || ctime <= since)) {
        state->tree->update(paths[i], mtime);
        list->update(paths[i]);
      } else {
        state->tree->add(paths[i], mtime, S_ISDIR(file.st_mode));
        list->create(paths[i]);
      }
    }
  }

  if (watcher->mWatched) {
    watcher->notify();
  }
}

void checkWatcher(Watcher &watcher) {
  struct stat file;
  if (stat(watcher.mDir.c_str(), &file)) {
    throw WatcherError(strerror(errno), &watcher);
  }

  if (!S_ISDIR(file.st_mode)) {
    throw WatcherError(strerror(ENOTDIR), &watcher);
  }
}

void FSEventsBackend::startStream(Watcher &watcher, FSEventStreamEventId id) {
  checkWatcher(watcher);

  CFAbsoluteTime latency = 0.01;
  CFStringRef fileWatchPath = CFStringCreateWithCString(
    NULL,
    watcher.mDir.c_str(),
    kCFStringEncodingUTF8
  );

  CFArrayRef pathsToWatch = CFArrayCreate(
    NULL,
    (const void **)&fileWatchPath,
    1,
    NULL
  );

  FSEventStreamContext callbackInfo {0, (void *)&watcher, nullptr, nullptr, nullptr};
  FSEventStreamRef stream = FSEventStreamCreate(
    NULL,
    &FSEventsCallback,
    &callbackInfo,
    pathsToWatch,
    id,
    latency,
    kFSEventStreamCreateFlagFileEvents
  );

  CFMutableArrayRef exclusions = CFArrayCreateMutable(NULL, watcher.mIgnore.size(), NULL);
  for (auto it = watcher.mIgnore.begin(); it != watcher.mIgnore.end(); it++) {
    CFStringRef path = CFStringCreateWithCString(
      NULL,
      it->c_str(),
      kCFStringEncodingUTF8
    );

    CFArrayAppendValue(exclusions, (const void *)path);
  }

  FSEventStreamSetExclusionPaths(stream, exclusions);

  FSEventStreamScheduleWithRunLoop(stream, mRunLoop, kCFRunLoopDefaultMode);
  bool started = FSEventStreamStart(stream);

  CFRelease(pathsToWatch);
  CFRelease(fileWatchPath);

  if (!started) {
    FSEventStreamRelease(stream);
    throw WatcherError("Error starting FSEvents stream", &watcher);
  }

  State *s = (State *)watcher.state;
  s->tree = std::make_shared<DirTree>(watcher.mDir);
  s->stream = stream;
}

void FSEventsBackend::start() {
  mRunLoop = CFRunLoopGetCurrent();
  CFRetain(mRunLoop);

  // Unlock once run loop has started.
  CFRunLoopPerformBlock(mRunLoop, kCFRunLoopDefaultMode, ^ {
    notifyStarted();
  });

  CFRunLoopWakeUp(mRunLoop);
  CFRunLoopRun();
}

FSEventsBackend::~FSEventsBackend() {
  std::unique_lock<std::mutex> lock(mMutex);
  CFRunLoopStop(mRunLoop);
  CFRelease(mRunLoop);
}

void FSEventsBackend::writeSnapshot(Watcher &watcher, std::string *snapshotPath) {
  std::unique_lock<std::mutex> lock(mMutex);
  checkWatcher(watcher);

  FSEventStreamEventId id = FSEventsGetCurrentEventId();
  std::ofstream ofs(*snapshotPath);
  ofs << id;
  ofs << "\n";

  struct timespec now;
  clock_gettime(CLOCK_REALTIME, &now);
  ofs << CONVERT_TIME(now);
}

void FSEventsBackend::getEventsSince(Watcher &watcher, std::string *snapshotPath) {
  std::unique_lock<std::mutex> lock(mMutex);
  std::ifstream ifs(*snapshotPath);
  if (ifs.fail()) {
    return;
  }

  FSEventStreamEventId id;
  uint64_t since;
  ifs >> id;
  ifs >> since;

  State *s = new State;
  s->since = since;
  watcher.state = (void *)s;

  startStream(watcher, id);
  watcher.wait();
  stopStream(s->stream, mRunLoop);

  delete s;
  watcher.state = NULL;
}

void FSEventsBackend::subscribe(Watcher &watcher) {
  State *s = new State;
  s->since = 0;
  watcher.state = (void *)s;
  startStream(watcher, kFSEventStreamEventIdSinceNow);
}

void FSEventsBackend::unsubscribe(Watcher &watcher) {
  State *s = (State *)watcher.state;
  stopStream(s->stream, mRunLoop);

  delete s;
  watcher.state = NULL;
}
