#ifndef BRUTE_FORCE_H
#define BRUTE_FORCE_H

#include "../Backend.hh"
#include "../DirTree.hh"
#include "../Watcher.hh"

class BruteForceBackend : public Backend {
public:
  void writeSnapshot(Watcher &watcher, std::string *snapshotPath) override;
  void getEventsSince(Watcher &watcher, std::string *snapshotPath) override;
  void subscribe(Watcher &watcher) override {
    throw "Brute force backend doesn't support subscriptions.";
  }

  void unsubscribe(Watcher &watcher) override {
    throw "Brute force backend doesn't support subscriptions.";
  }

  std::shared_ptr<DirTree> getTree(Watcher &watcher, bool shouldRead = true);
private:
  void readTree(Watcher &watcher, std::shared_ptr<DirTree> tree);
};

#endif
