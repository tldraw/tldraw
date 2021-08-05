#ifndef FS_EVENTS_H
#define FS_EVENTS_H

#include <CoreServices/CoreServices.h>
#include "../Backend.hh"

class FSEventsBackend : public Backend {
public:
  void start() override;
  ~FSEventsBackend();
  void writeSnapshot(Watcher &watcher, std::string *snapshotPath) override;
  void getEventsSince(Watcher &watcher, std::string *snapshotPath) override;
  void subscribe(Watcher &watcher) override;
  void unsubscribe(Watcher &watcher) override;
private:
  void startStream(Watcher &watcher, FSEventStreamEventId id);
  CFRunLoopRef mRunLoop;
};

#endif
