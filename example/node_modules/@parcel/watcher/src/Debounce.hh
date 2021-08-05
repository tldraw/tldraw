#ifndef DEBOUNCE_H
#define DEBOUNCE_H

#include <thread>
#include <unordered_map>
#include "Signal.hh"

class Debounce {
public:
  static std::shared_ptr<Debounce> getShared() {
    static std::weak_ptr<Debounce> sharedInstance;
    std::shared_ptr<Debounce> shared = sharedInstance.lock();
    if (!shared) {
      shared = std::make_shared<Debounce>();
      sharedInstance = shared;
    }

    return shared;
  }

  Debounce() {
    mRunning = true;
    mThread = std::thread([this] () {
      loop();
    });
  }

  ~Debounce() {
    mRunning = false;
    mWaitSignal.notify();
    mThread.join();
  }

  void add(void *key, std::function<void()> cb) {
    std::unique_lock<std::mutex> lock(mMutex);
    mCallbacks.emplace(key, cb);
  }

  void remove(void *key) {
    std::unique_lock<std::mutex> lock(mMutex);
    mCallbacks.erase(key);
  }

  void trigger() {
    std::unique_lock<std::mutex> lock(mMutex);
    mWaitSignal.notify();
  }
  
private:
  bool mRunning;
  std::mutex mMutex;
  Signal mWaitSignal;
  std::thread mThread;
  std::unordered_map<void *, std::function<void()>> mCallbacks;

  void loop() {
    while (mRunning) {
      mWaitSignal.wait();
      if (!mRunning) {
        break;
      }

      auto status = mWaitSignal.waitFor(std::chrono::milliseconds(50));
      if (status == std::cv_status::timeout && mRunning) {
        notify();
      }
    }
  }

  void notify() {
    std::unique_lock<std::mutex> lock(mMutex);

    for (auto it = mCallbacks.begin(); it != mCallbacks.end(); it++) {
      auto cb = it->second;
      cb();
    }

    mWaitSignal.reset();
  }
};

#endif
