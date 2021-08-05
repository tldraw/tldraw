#ifndef WINDOWS_H
#define WINDOWS_H

#include <winsock2.h>
#include <windows.h>
#include "../shared/BruteForceBackend.hh"

class WindowsBackend : public BruteForceBackend {
public:
  void start() override;
  ~WindowsBackend();
  void subscribe(Watcher &watcher) override;
  void unsubscribe(Watcher &watcher) override;
private:
  bool mRunning;
};

#endif
