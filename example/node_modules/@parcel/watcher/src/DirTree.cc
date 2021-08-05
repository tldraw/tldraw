#include "DirTree.hh"

static std::unordered_map<std::string, std::weak_ptr<DirTree>> dirTreeCache;

struct DirTreeDeleter {
  void operator()(DirTree *tree) {
    dirTreeCache.erase(tree->root);
    delete tree;
  }
};

std::shared_ptr<DirTree> DirTree::getCached(std::string root) {
  auto found = dirTreeCache.find(root);
  std::shared_ptr<DirTree> tree;

  // Use cached tree, or create an empty one.
  if (found != dirTreeCache.end()) {
    tree = found->second.lock();
  } else {
    tree = std::shared_ptr<DirTree>(new DirTree(root), DirTreeDeleter());
    dirTreeCache.emplace(root, tree);
  }

  return tree;
}

DirTree::DirTree(std::string root, std::istream &stream) : root(root), isComplete(true) {
  size_t size;
  if (stream >> size) {
    for (size_t i = 0; i < size; i++) {
      DirEntry entry(stream);
      entries.emplace(entry.path, entry);
    }
  }
}

DirEntry *DirTree::add(std::string path, uint64_t mtime, bool isDir) {
  DirEntry entry(path, mtime, isDir);
  auto it = entries.emplace(entry.path, entry);
  return &it.first->second;
}

DirEntry *DirTree::find(std::string path) {
  auto found = entries.find(path);
  if (found == entries.end()) {
    return NULL;
  }

  return &found->second;
}

DirEntry *DirTree::update(std::string path, uint64_t mtime) {
  DirEntry *found = find(path);
  if (found) {
    found->mtime = mtime;
  }

  return found;
}

void DirTree::remove(std::string path) {
  DirEntry *found = find(path);

  // Remove all sub-entries if this is a directory
  if (found && found->isDir) {
    std::string pathStart = path + DIR_SEP;
    for (auto it = entries.begin(); it != entries.end();) {
      if (it->first.rfind(pathStart, 0) == 0) {
        it = entries.erase(it);
      } else {
        it++;
      }
    }
  }

  entries.erase(path);
}

void DirTree::write(std::ostream &stream) {
  stream << entries.size() << "\n";
  for (auto it = entries.begin(); it != entries.end(); it++) {
    it->second.write(stream);
  }
}

void DirTree::getChanges(DirTree *snapshot, EventList &events) {
  for (auto it = entries.begin(); it != entries.end(); it++) {
    auto found = snapshot->entries.find(it->first);
    if (found == snapshot->entries.end()) {
      events.create(it->second.path);
    } else if (found->second.mtime != it->second.mtime && !found->second.isDir && !it->second.isDir) {
      events.update(it->second.path);
    }
  }

  for (auto it = snapshot->entries.begin(); it != snapshot->entries.end(); it++) {
    size_t count = entries.count(it->first);
    if (count == 0) {
      events.remove(it->second.path);
    }
  }
}

DirEntry::DirEntry(std::string p, uint64_t t, bool d) {
  path = p;
  mtime = t;
  isDir = d;
  state = NULL;
}

DirEntry::DirEntry(std::istream &stream) {
  size_t size;

  if (stream >> size) {
    path.resize(size);
    if (stream.read(&path[0], size)) {
      stream >> mtime;
      stream >> isDir;
    }
  }
}

void DirEntry::write(std::ostream &stream) const {
  stream << path.size() << path << mtime << " " << isDir << "\n";
}
