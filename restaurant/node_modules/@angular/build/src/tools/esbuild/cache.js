"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = exports.Cache = void 0;
/**
 * A cache object that allows accessing and storing key/value pairs in
 * an underlying CacheStore. This class is the primary method for consumers
 * to use a cache.
 */
class Cache {
    store;
    namespace;
    // In-flight creator promises to deduplicate concurrent requests for the same key.
    #requests = new Map();
    // Track how many writes occurred for a key to detect mutations during await gaps.
    #writeCounts = new Map();
    // Count the number of active, pending getOrCreate operations per key to avoid memory leaks.
    #pendingGets = new Map();
    constructor(store, namespace) {
        this.store = store;
        this.namespace = namespace;
    }
    #incrementWrite(key) {
        // Only track write counts if there is a pending getOrCreate operation active for the key.
        // This ensures that write counts are not leaked when no concurrent gets are running.
        if (this.#pendingGets.has(key)) {
            this.#writeCounts.set(key, (this.#writeCounts.get(key) || 0) + 1);
        }
    }
    /**
     * Prefixes a key with the cache namespace if present.
     * @param key A key string to prefix.
     * @returns A prefixed key if a namespace is present. Otherwise the provided key.
     */
    withNamespace(key) {
        if (this.namespace) {
            return `${this.namespace}:${key}`;
        }
        return key;
    }
    /**
     * Gets the value associated with a provided key if available.
     * Otherwise, creates a value using the factory creator function, puts the value
     * in the cache, and returns the new value.
     * @param key A key associated with the value.
     * @param creator A factory function for the value if no value is present.
     * @returns A value associated with the provided key.
     */
    async getOrCreate(key, creator) {
        const namespacedKey = this.withNamespace(key);
        // 1. If another call is already running the creator for this key, share its promise.
        let activeRequest = this.#requests.get(namespacedKey);
        if (activeRequest !== undefined) {
            return activeRequest;
        }
        // Increment pending gets count to enable write-tracking for this key.
        const currentPending = this.#pendingGets.get(namespacedKey) || 0;
        this.#pendingGets.set(namespacedKey, currentPending + 1);
        try {
            const startWriteCount = this.#writeCounts.get(namespacedKey) || 0;
            // 2. Query the backing store. Since store.get can be async, we yield to the event loop.
            const value = await this.store.get(namespacedKey);
            // If a write (e.g. put) occurred during the store.get await gap, we must abort
            // the current execution and restart to ensure we return the newly written value.
            if ((this.#writeCounts.get(namespacedKey) || 0) !== startWriteCount) {
                return this.getOrCreate(key, creator);
            }
            if (value !== undefined) {
                return value;
            }
            // 3. Recheck active request after the await gap in case another concurrent call
            // initiated a creator during the store.get wait.
            activeRequest = this.#requests.get(namespacedKey);
            if (activeRequest !== undefined) {
                return activeRequest;
            }
            // 4. Run the creator to produce the new value, and store its promise in #requests.
            activeRequest = Promise.resolve(creator()).then(async (newValue) => {
                // Ensure this request is still the active one before writing back to the store
                // (prevents overwriting newer data if put() was called before resolution).
                if (this.#requests.get(namespacedKey) === activeRequest) {
                    this.#incrementWrite(namespacedKey);
                    await this.store.set(namespacedKey, newValue);
                    this.#requests.delete(namespacedKey);
                }
                return newValue;
            }, (error) => {
                // Clean up the active request if the creator fails.
                if (this.#requests.get(namespacedKey) === activeRequest) {
                    this.#requests.delete(namespacedKey);
                }
                throw error;
            });
            this.#requests.set(namespacedKey, activeRequest);
            return activeRequest;
        }
        finally {
            // Clean up write counts and pending gets once all concurrent gets for this key finish.
            const current = this.#pendingGets.get(namespacedKey) || 0;
            if (current <= 1) {
                this.#pendingGets.delete(namespacedKey);
                this.#writeCounts.delete(namespacedKey);
            }
            else {
                this.#pendingGets.set(namespacedKey, current - 1);
            }
        }
    }
    /**
     * Gets the value associated with a provided key if available.
     * @param key A key associated with the value.
     * @returns A value associated with the provided key if present. Otherwise, `undefined`.
     */
    async get(key) {
        const value = await this.store.get(this.withNamespace(key));
        return value;
    }
    /**
     * Puts a value in the cache and associates it with the provided key.
     * If the key is already present, the value is updated instead.
     * @param key A key associated with the value.
     * @param value A value to put in the cache.
     */
    async put(key, value) {
        const namespacedKey = this.withNamespace(key);
        this.#requests.delete(namespacedKey);
        this.#incrementWrite(namespacedKey);
        await this.store.set(namespacedKey, value);
    }
    /**
     * Clears the base class internal state (requests, write counts, and pending gets).
     */
    clearInternal() {
        this.#requests.clear();
        this.#writeCounts.clear();
        this.#pendingGets.clear();
    }
}
exports.Cache = Cache;
/**
 * A lightweight in-memory cache implementation based on a JavaScript Map object.
 */
class MemoryCache extends Cache {
    constructor() {
        super(new Map());
    }
    /**
     * Removes all entries from the cache instance.
     */
    clear() {
        this.clearInternal();
        this.store.clear();
    }
    /**
     * Provides all the values currently present in the cache instance.
     * @returns An iterable of all values in the cache.
     */
    values() {
        return this.store.values();
    }
    /**
     * Provides all the keys/values currently present in the cache instance.
     * @returns An iterable of all key/value pairs in the cache.
     */
    entries() {
        return this.store.entries();
    }
}
exports.MemoryCache = MemoryCache;
//# sourceMappingURL=cache.js.map