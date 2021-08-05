#ifndef DIR_TREE_H
#define DIR_TREE_H

#include <string>
#include <unordered_map>
#include <ostream>
#include <istream>
#include <memory>
#include "Event.hh"

#ifdef _WIN32
#define DIR_SEP "\\"
#else
#define DIR_SEP "/"
#endif

struct DirEntry {
  std::string path;
  uint64_t mtime;
  bool isDir;
  mutable void *state;

  DirEntry(std::string p, uint64_t t, bool d);
  DirEntry(std::istream &stream);
  void write(std::ostream &stream) const;
  bool operator==(const DirEntry &other) const {
    return path == other.path;
  }
};

struct DirTree {
  std::string root;
  bool isComplete;
  std::unordered_map<std::string, DirEntry> entries;

  static std::shared_ptr<DirTree> getCached(std::string root);
  DirTree(std::string root) : root(root), isComplete(false) {}
  DirTree(std::string root, std::istream &stream);

  DirEntry *add(std::string path, uint64_t mtime, bool isDir);
  DirEntry *find(std::string path);
  DirEntry *update(std::string path, uint64_t mtime);
  void remove(std::string path);
  void write(std::ostream &stream);
  void getChanges(DirTree *snapshot, EventList &events);
};

#endif
