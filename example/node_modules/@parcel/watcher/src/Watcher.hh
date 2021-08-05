#ifndef WATCHER_H
#define WATCHER_H

#include <condition_variable>
#include <unordered_set>
#include <set>
#include <uv.h>
#include <node_api.h>
#include "Event.hh"
#include "Debounce.hh"
#include "DirTree.hh"
#include "Signal.hh"

using namespace Napi;

struct Watcher {
  std::string mDir;
  std::unordered_set<std::string> mIgnore;
  EventList mEvents;
  void *state;
  bool mWatched;

  Watcher(std::string dir, std::unordered_set<std::string> ignore);
  ~Watcher();

  bool operator==(const Watcher &other) const {
    return mDir == other.mDir && mIgnore == other.mIgnore;
  }

  void wait();
  void notify();
  void notifyError(std::exception &err);
  bool watch(FunctionReference callback);
  bool unwatch(Function callback);
  void unref();
  bool isIgnored(std::string path);

  static std::shared_ptr<Watcher> getShared(std::string dir, std::unordered_set<std::string> ignore);

private:
  std::mutex mMutex;
  std::mutex mCallbackEventsMutex;
  std::condition_variable mCond;
  uv_async_t *mAsync;
  std::set<FunctionReference> mCallbacks;
  std::set<FunctionReference>::iterator mCallbacksIterator;
  bool mCallingCallbacks;
  std::vector<Event> mCallbackEvents;
  std::shared_ptr<Debounce> mDebounce;
  Signal mCallbackSignal;
  std::string mError;

  Value callbackEventsToJS(const Env& env);
  void clearCallbacks();
  void triggerCallbacks();
  static void fireCallbacks(uv_async_t *handle);
  static void onClose(uv_handle_t *handle);
};

class WatcherError : public std::runtime_error {
public:
  Watcher *mWatcher;
  WatcherError(std::string msg, Watcher *watcher) : std::runtime_error(msg), mWatcher(watcher) {}
  WatcherError(const char *msg, Watcher *watcher) : std::runtime_error(msg), mWatcher(watcher) {}
};

#endif
