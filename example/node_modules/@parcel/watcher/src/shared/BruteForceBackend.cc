#include <string>
#include <fstream>
#include "../DirTree.hh"
#include "../Event.hh"
#include "./BruteForceBackend.hh"

std::shared_ptr<DirTree> BruteForceBackend::getTree(Watcher &watcher, bool shouldRead) {
  auto tree = DirTree::getCached(watcher.mDir);

  // If the tree is not complete, read it if needed.
  if (!tree->isComplete && shouldRead) {
    readTree(watcher, tree);
    tree->isComplete = true;
  }

  return tree;
}

void BruteForceBackend::writeSnapshot(Watcher &watcher, std::string *snapshotPath) {
  std::unique_lock<std::mutex> lock(mMutex);
  auto tree = getTree(watcher);
  std::ofstream ofs(*snapshotPath);
  tree->write(ofs);
}

void BruteForceBackend::getEventsSince(Watcher &watcher, std::string *snapshotPath) {
  std::unique_lock<std::mutex> lock(mMutex);
  std::ifstream ifs(*snapshotPath);
  if (ifs.fail()) {
    return;
  }

  auto snapshot = DirTree(watcher.mDir, ifs);
  auto now = getTree(watcher);
  now->getChanges(&snapshot, watcher.mEvents);
}
