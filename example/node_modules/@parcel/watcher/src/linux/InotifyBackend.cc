#include <memory>
#include <poll.h>
#include <unistd.h>
#include "InotifyBackend.hh"

#define INOTIFY_MASK \
  IN_ATTRIB | IN_CREATE | IN_DELETE | \
  IN_DELETE_SELF | IN_MODIFY | IN_MOVE_SELF | IN_MOVED_FROM | \
  IN_MOVED_TO | IN_DONT_FOLLOW | IN_ONLYDIR | IN_EXCL_UNLINK
#define BUFFER_SIZE 8192
#define CONVERT_TIME(ts) ((uint64_t)ts.tv_sec * 1000000000 + ts.tv_nsec)

void InotifyBackend::start() {
  // Create a pipe that we will write to when we want to end the thread.
  int err = pipe2(mPipe, O_CLOEXEC | O_NONBLOCK);
  if (err == -1) {
    throw std::runtime_error(std::string("Unable to open pipe: ") + strerror(errno));
  }

  // Init inotify file descriptor.
  mInotify = inotify_init1(IN_NONBLOCK | IN_CLOEXEC);
  if (mInotify == -1) {
    throw std::runtime_error(std::string("Unable to initialize inotify: ") + strerror(errno));
  }

  pollfd pollfds[2];
  pollfds[0].fd = mPipe[0];
  pollfds[0].events = POLLIN;
  pollfds[0].revents = 0;
  pollfds[1].fd = mInotify;
  pollfds[1].events = POLLIN;
  pollfds[1].revents = 0;

  notifyStarted();

  // Loop until we get an event from the pipe.
  while (true) {
    int result = poll(pollfds, 2, 500);
    if (result < 0) {
      throw std::runtime_error(std::string("Unable to poll: ") + strerror(errno));
    }

    if (pollfds[0].revents) {
      break;
    }

    if (pollfds[1].revents) {
      handleEvents();
    }
  }

  close(mPipe[0]);
  close(mPipe[1]);
  close(mInotify);

  mEndedSignal.notify();
}

InotifyBackend::~InotifyBackend() {
  write(mPipe[1], "X", 1);
  mEndedSignal.wait();
}

void InotifyBackend::subscribe(Watcher &watcher) {
  // Build a full directory tree recursively, and watch each directory.
  std::shared_ptr<DirTree> tree = getTree(watcher);
  
  for (auto it = tree->entries.begin(); it != tree->entries.end(); it++) {
    if (it->second.isDir) {
      watchDir(watcher, (DirEntry *)&it->second, tree);
    }
  }
}

void InotifyBackend::watchDir(Watcher &watcher, DirEntry *entry, std::shared_ptr<DirTree> tree) {
  int wd = inotify_add_watch(mInotify, entry->path.c_str(), INOTIFY_MASK);
  if (wd == -1) {
    throw WatcherError(std::string("inotify_add_watch failed: ") + strerror(errno), &watcher);
  }

  std::shared_ptr<InotifySubscription> sub = std::make_shared<InotifySubscription>();
  sub->tree = tree;
  sub->entry = entry;
  sub->watcher = &watcher;
  mSubscriptions.emplace(wd, sub);
}

void InotifyBackend::handleEvents() {
  char buf[BUFFER_SIZE] __attribute__ ((aligned(__alignof__(struct inotify_event))));;
  struct inotify_event *event;

  // Track all of the watchers that are touched so we can notify them at the end of the events.
  std::unordered_set<Watcher *> watchers;

  while (true) {
    int n = read(mInotify, &buf, BUFFER_SIZE);
    if (n < 0) {
      if (errno == EAGAIN || errno == EWOULDBLOCK) {
        break;
      }

      throw std::runtime_error(std::string("Error reading from inotify: ") + strerror(errno));
    }

    if (n == 0) {
      break;
    }

    for (char *ptr = buf; ptr < buf + n; ptr += sizeof(*event) + event->len) {
      event = (struct inotify_event *)ptr;

      if ((event->mask & IN_Q_OVERFLOW) == IN_Q_OVERFLOW) {
        // overflow
        continue;
      }

      handleEvent(event, watchers);
    }
  }

  for (auto it = watchers.begin(); it != watchers.end(); it++) {
    (*it)->notify();
  }
}

void InotifyBackend::handleEvent(struct inotify_event *event, std::unordered_set<Watcher *> &watchers) {
  std::unique_lock<std::mutex> lock(mMutex);

  // Find the subscriptions for this watch descriptor
  auto range = mSubscriptions.equal_range(event->wd);
  std::unordered_set<std::shared_ptr<InotifySubscription>> set;
  for (auto it = range.first; it != range.second; it++) {
    set.insert(it->second);
  }

  for (auto it = set.begin(); it != set.end(); it++) {
    if (handleSubscription(event, *it)) {
      watchers.insert((*it)->watcher);
    }
  }
}

bool InotifyBackend::handleSubscription(struct inotify_event *event, std::shared_ptr<InotifySubscription> sub) {
  // Build full path and check if its in our ignore list.
  Watcher *watcher = sub->watcher;
  std::string path = std::string(sub->entry->path);
  if (event->len > 0) { 
    path += "/" + std::string(event->name);
  }

  if (watcher->mIgnore.count(path) > 0) {
    return false;
  }

  // If this is a create, check if it's a directory and start watching if it is.
  // In any case, keep the directory tree up to date.
  if (event->mask & (IN_CREATE | IN_MOVED_TO)) {
    watcher->mEvents.create(path);

    struct stat st;
    stat(path.c_str(), &st);
    DirEntry *entry = sub->tree->add(path, CONVERT_TIME(st.st_mtim), S_ISDIR(st.st_mode));

    if (entry->isDir) {
      watchDir(*watcher, entry, sub->tree);
    }
  } else if (event->mask & (IN_MODIFY | IN_ATTRIB)) {
    watcher->mEvents.update(path);

    struct stat st;
    stat(path.c_str(), &st);
    sub->tree->update(path, CONVERT_TIME(st.st_mtim));
  } else if (event->mask & (IN_DELETE | IN_DELETE_SELF | IN_MOVED_FROM | IN_MOVE_SELF)) {
    // Ignore delete/move self events unless this is the recursive watch root
    if ((event->mask & (IN_DELETE_SELF | IN_MOVE_SELF)) && path != watcher->mDir) {
      return false;
    }

    // If the entry being deleted/moved is a directory, remove it from the list of subscriptions
    auto entry = sub->tree->find(path);
    if (entry && entry->isDir) {
      for (auto it = mSubscriptions.begin(); it != mSubscriptions.end(); it++) {
        if (it->second->entry == &*entry) {
          mSubscriptions.erase(it);
          break;
        }
      }
    }

    watcher->mEvents.remove(path);
    sub->tree->remove(path);
  }

  return true;
}

void InotifyBackend::unsubscribe(Watcher &watcher) {
  // Find any subscriptions pointing to this watcher, and remove them.
  for (auto it = mSubscriptions.begin(); it != mSubscriptions.end();) {
    if (it->second->watcher == &watcher) {
      if (mSubscriptions.count(it->first) == 1) {
        int err = inotify_rm_watch(mInotify, it->first);
        if (err == -1) {
          throw WatcherError(std::string("Unable to remove watcher: ") + strerror(errno), &watcher);
        }
      }

      it = mSubscriptions.erase(it);
    } else {
      it++;
    }
  }
}
