const PINNED_IN_MEMORY = 0x7fffffff
const NOT_IN_LRU = 0x40000000
const EXPIRED_ENTRY = {
	description: 'This cache entry value has been expired from the LRFU cache, and is waiting for garbage collection to be removed.'
}
/* bit pattern:
*  < is-in-lru 1 bit > ...< mask/or bits 4 bits > <lru index 4 bits > < position in cache - 16 bits >
*/
class LRFUExpirer {
	constructor(options) {
		this.lruSize = options && options.lruSize || 0x2000
		this.reset()
		startTimedCleanup(new WeakRef(this), options && options.cleanupInterval || 60000)
	}
	delete(entry) {
		if (entry.position < NOT_IN_LRU) {
			this.lru[(entry.position >> 16) & 15][entry.position & 0xffff] = null
		}
		entry.position |= NOT_IN_LRU
	}
	used(entry, expirationPriority) {
		let originalPosition = entry.position
		let orMask
		if (expirationPriority < 0) {
			// pin this in memory, first remove from LRFU and then mark it as pinned in memory
			if (entry.position < NOT_IN_LRU) {
				this.lru[(entry.position >> 16) & 15][entry.position & 0xffff] = null
			}
			entry.position = PINNED_IN_MEMORY
			return
		} else if (entry.position == PINNED_IN_MEMORY && expirationPriority == undefined) {
			return
		} else if (expirationPriority >= 0) {
			let bits = 0
			if (expirationPriority > (this.lruSize >> 2))
				expirationPriority = this.lruSize >> 2
			while (expirationPriority > 0) {
				expirationPriority = expirationPriority >> 1
				bits++
			}
			expirationPriority = bits
		} else {
			if (originalPosition >= 0)
				expirationPriority = (originalPosition >> 20) & 15
			else
				expirationPriority = 0
		}
		
		let lruPosition
		let lruIndex
		if (originalPosition < NOT_IN_LRU) {
			lruIndex = (originalPosition >> 16) & 15
			if (lruIndex >= 3)
				return // can't get any higher than this, don't do anything
			let lru = this.lru[lruIndex]
			// check to see if it is in the same generation
			lruPosition = lru.position
			if ((originalPosition > lruPosition ? lruPosition + this.lruSize : lruPosition) - originalPosition < (this.lruSize >> 3))
				return // only recently added, don't promote
			lru[originalPosition & 0xffff] = null // remove it, we are going to move/promote it
			lruIndex++
		} else
			lruIndex = 0
		this.insertEntry(entry, lruIndex, expirationPriority)
	}
	insertEntry(entry, lruIndex, expirationPriority) {
		let lruPosition, nextLru = this.lru[lruIndex]
		let orMask = 0xffff >> (16 - expirationPriority)
		do {
			// put it in the next lru
			lruPosition = nextLru.position | orMask
			let previousEntry = nextLru[lruPosition & 0xffff]
			nextLru[lruPosition & 0xffff] = entry
			if (entry)
				entry.position = lruPosition | (expirationPriority << 20)
			nextLru.position = ++lruPosition
			if ((lruPosition & 0xffff) >= this.lruSize) {
				// reset at the beginning of the lru cache
				lruPosition &= 0x7fff0000
				nextLru.position = lruPosition
				nextLru.cycles++
			}
			entry = previousEntry
			if (entry && (nextLru = this.lru[--lruIndex])) {
				expirationPriority = ((entry.position || 0) >> 20) & 15
				orMask = 0xffff >> (16 - expirationPriority)
			} else
				break
		} while (true)
		if (entry) {// this one was removed
			entry.position |= NOT_IN_LRU
			if (entry.cache)
				entry.cache.onRemove(entry)
			else if (entry.deref) // if we have already registered the entry in the finalization registry, just clear it
				entry.value = EXPIRED_ENTRY
		}
	}
	reset() {
	/*	if (this.lru) {
			for (let i = 0; i < 4; i++) {
				for (let j = 0, l = this.lru.length; j < l; j++) {
					let entry =	this.lru[i][j]
					if (entry) {// this one was removed
						entry.position |= NOT_IN_LRU
						if (entry.cache)
							entry.cache.onRemove(entry)
						else if (entry.deref) // if we have already registered the entry in the finalization registry, just clear it
							entry.value = EXPIRED_ENTRY
					}
				}
			}
		}*/
		this.lru = []
		for (let i = 0; i < 4; i++) {
			this.lru[i] = new Array(this.lruSize)
			this.lru[i].position = i << 16
			this.lru[i].cycles = 0
		}
	}
	cleanup() { // clean out a portion of the cache, so we can clean up over time if idle
		let toClear = this.lruSize >> 4 // 1/16 of the lru cache at a time
		for (let i = 3; i >= 0; i--) {
			let lru = this.lru[i]
			for (let j = 0, l = toClear; j < l; j++) {
				if (lru[lru.position & 0xffff]) {
					toClear--
					this.insertEntry(null, i, 0)
				} else {
					if ((++lru.position & 0xffff) >= this.lruSize) {
						// reset at the beginning of the lru cache
						lru.position &= 0x7fff0000
						lru.cycles++
					}
				}
			}
		}
	}
}
function startTimedCleanup(reference, cleanupInterval) {
	let interval = setInterval(() => {
		let expirer = reference.deref()
		if (expirer)
			expirer.cleanup()
		else
			clearInterval(interval)
	}, cleanupInterval)
	if (interval.unref)
		interval.unref()
}
exports.LRFUExpirer = LRFUExpirer
exports.EXPIRED_ENTRY = EXPIRED_ENTRY