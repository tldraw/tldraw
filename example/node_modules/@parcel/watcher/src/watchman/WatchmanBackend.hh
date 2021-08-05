#ifndef WATCHMAN_H
#define WATCHMAN_H

#include "../Backend.hh"
#include "./BSER.hh"
#include "../Signal.hh"
#include "./IPC.hh"

class WatchmanBackend : public Backend {
public:
  static bool checkAvailable();
  void start() override;
  WatchmanBackend() : mStopped(false) {};
  ~WatchmanBackend();
  void writeSnapshot(Watcher &watcher, std::string *snapshotPath) override;
  void getEventsSince(Watcher &watcher, std::string *snapshotPath) override;
  void subscribe(Watcher &watcher) override;
  void unsubscribe(Watcher &watcher) override;
private:
  std::unique_ptr<IPC> mIPC;
  Signal mRequestSignal;
  Signal mResponseSignal;
  BSER::Object mResponse;
  std::string mError;
  std::unordered_map<std::string, Watcher *> mSubscriptions;
  bool mStopped;
  Signal mEndedSignal;

  std::string clock(Watcher &watcher);
  void watchmanWatch(std::string dir);
  BSER::Object watchmanRequest(BSER cmd);
  void handleSubscription(BSER::Object obj);
};

#endif
