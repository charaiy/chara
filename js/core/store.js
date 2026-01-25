/**
 * js/core/store.js
 * * 本模块负责系统的持久化存储。
 * * [Upgrade] Storage Engine upgraded to IndexedDB + Memory Cache
 * * Enables "Unlimited" storage capacity while keeping Sync API compatibility.
 * * @author CharaOS Team
 */

const APP_PREFIX = 'chara_os_';
const DB_NAME = 'CharaOS_Storage_V1';
const STORE_NAME = 'key_value_pairs';

class Store {
    constructor() {
        this.cache = {};
        this.db = null;
        this.pendingWrites = new Map(); // Debounce map

        // Return a promise that resolves when DB is loaded into cache
        this.readyPromise = this._initInfrastructure();
    }

    // --- Infrastructure (Async) ---

    async _initInfrastructure() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                await this._loadAllToCache();

                // Initialize default data if cache is empty (New User or Clean Slate)
                this._ensureDefaults();

                console.log('[Store] Infrastructure Ready (IndexedDB Mode)');
                resolve();
            };

            request.onerror = (event) => {
                console.error('[Store] IndexedDB Error:', event.target.error);
                // Fallback to localStorage if IDB fails?
                // For now, allow cache to work in memory-only mode if DB fails
                resolve();
            };
        });
    }

    async _loadAllToCache() {
        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.openCursor();
                let count = 0;

                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        this.cache[cursor.key] = cursor.value;
                        count++;
                        cursor.continue();
                    } else {
                        // EOF
                        if (count === 0) {
                            // If IDB is empty, try to migrate from LocalStorage
                            this._migrateFromLocalStorage();
                        }
                        resolve();
                    }
                };

                request.onerror = () => resolve(); // Ignore errors, proceed with empty/partial cache
            } catch (e) {
                console.error('Loader failed', e);
                resolve();
            }
        });
    }

    _migrateFromLocalStorage() {
        console.log('[Store] Migrating from LocalStorage to IndexedDB...');
        let migratedCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(APP_PREFIX)) {
                try {
                    const rawVal = localStorage.getItem(key);
                    const val = JSON.parse(rawVal);

                    // Strip prefix for internal cache (Optional, but let's keep prefix for logic consistency if needed)
                    // Actually, the Store methods usually expect raw keys like 'chara_db_messages'
                    // But in old Store.js, keys passed to get() didn't have prefix, prefix was added in get().
                    // Wait, old code: get(key) -> localStorage.getItem(APP_PREFIX + key)
                    // So the key in LocalStorage IS 'chara_os_chara_db_messages'.

                    // We will store it in IDB using the SAME KEY (without prefix? or with?)
                    // To keep new `get` compatible: get(key) { return this.cache[key]; }
                    // We should strip the prefix if we want cleaner keys, OR we follow the existing pattern.
                    // Let's look at `get(key)` implementation below.
                    // It uses `this.cache[key]`.

                    // SO: We must store in `this.cache` WITHOUT the prefix.
                    // The migration needs to strip the prefix.

                    const cleanKey = key.replace(APP_PREFIX, '');
                    this.cache[cleanKey] = val;
                    this._persist(cleanKey, val); // Save to IDB
                    migratedCount++;
                } catch (e) {
                    console.warn('Migration skip:', key);
                }
            }
        }
        if (migratedCount > 0) {
            console.log(`[Store] Migrated ${migratedCount} items. Clearing LocalStorage...`);
            // Optional: Clear LocalStorage to free up space, or keep as backup?
            // Better clear it to avoid confusion and "Stock Full" errors in other apps
            // But for safety, maybe just leave it?
            // The user wants "Extended Capacity", so we MUST move away from LS.
            // Let's clear the migrated keys.
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(APP_PREFIX)) {
                    localStorage.removeItem(key);
                }
            }
        }
    }

    _persist(key, value) {
        if (!this.db) return;

        // Debounce? No, IDB is fast enough for object writes usually. 
        // But let's simple-fire-and-forget for now.
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(value, key);

        transaction.oncomplete = () => {
            // Success
        };
        transaction.onerror = (e) => {
            console.error('IDB Write Failed', e);
        };
    }

    _ensureDefaults() {
        const initialStates = {
            'chara_db_messages': [],
            'chara_db_characters': {},
            'chara_db_world': {
                mode: 'online',
                location: 'home',
                offline_participants: []
            }
        };

        Object.keys(initialStates).forEach(key => {
            if (this.cache[key] === undefined) {
                this.set(key, initialStates[key]);
            }
        });
    }

    // --- Public API (Async Waiter) ---

    /**
     * Wait for the Store to be fully loaded from Disk.
     * All Apps should await this before rendering.
     */
    async ready() {
        return this.readyPromise;
    }

    // --- Public API (Sync) ---
    // Reads are instant (from Memory)

    get(key, defaultValue = null) {
        // If cache has it, return it.
        if (this.cache[key] !== undefined) {
            return this.cache[key];
        }
        return defaultValue;
    }

    set(key, value) {
        this.cache[key] = value;
        // Asynchronous persistence
        this._persist(key, value);
    }

    remove(key) {
        delete this.cache[key];
        if (this.db) {
            const tx = this.db.transaction([STORE_NAME], 'readwrite');
            tx.objectStore(STORE_NAME).delete(key);
        }
    }

    // --- Helpers (Same as before) ---

    getAllMessages() { return this.get('chara_db_messages', []); }

    getMessagesBySession(targetId) {
        const messages = this.getAllMessages();
        const isMe = (id) => id === 'user' || id === 'me' || id === 'my';
        return messages.filter(m =>
            (isMe(m.sender_id) && m.receiver_id === targetId) ||
            (m.sender_id === targetId && isMe(m.receiver_id))
        );
    }

    getMessagesBetween(charA, charB) {
        const messages = this.getAllMessages();
        return messages.filter(m =>
            (m.sender_id === charA && m.receiver_id === charB) ||
            (m.sender_id === charB && m.receiver_id === charA)
        );
    }

    getMessageById(id) { return this.getAllMessages().find(m => m.id === id) || null; }

    deleteMessage(id) {
        const messages = this.getAllMessages();
        const index = messages.findIndex(m => m.id === id);
        if (index !== -1) {
            messages.splice(index, 1);
            this.set('chara_db_messages', messages);
            return true;
        }
        return false;
    }

    addMessage(payload) {
        const messages = this.getAllMessages();
        const newMessage = {
            id: window.utils ? window.utils.generateUUID() : Date.now() + '_' + Math.random(),
            timestamp: Date.now(),
            is_recalled: false,
            read_status: {},
            ...payload
        };
        messages.push(newMessage);
        this.set('chara_db_messages', messages);
        return newMessage;
    }

    getCharacter(id) { const db = this.get('chara_db_characters', {}); return db[id] || null; }
    getAllCharacters() { const db = this.get('chara_db_characters', {}); return Object.values(db); }

    updateCharacter(id, data) {
        const db = this.get('chara_db_characters', {});
        const current = db[id] || {};
        // Use window.utils.deepMerge if available, else simple spread
        const merged = window.utils && window.utils.deepMerge ? window.utils.deepMerge(current, data) : { ...current, ...data };
        db[id] = merged;
        this.set('chara_db_characters', db);
        return db[id];
    }

    deleteCharacter(id) {
        const db = this.get('chara_db_characters', {});
        if (db[id]) {
            delete db[id];
            this.set('chara_db_characters', db);
            return true;
        }
        return false;
    }

    clearMessagesBySession(targetId) {
        let messages = this.getAllMessages();
        const isMe = (id) => id === 'user' || id === 'me' || id === 'my';
        messages = messages.filter(m =>
            !((isMe(m.sender_id) && m.receiver_id === targetId) ||
                (m.sender_id === targetId && isMe(m.receiver_id)))
        );
        this.set('chara_db_messages', messages);
    }

    resetCharacterState(id) {
        const db = this.get('chara_db_characters', {});
        const char = db[id];
        if (char) {
            db[id] = {
                id: char.id,
                name: char.name,
                real_name: char.real_name,
                remark: char.remark,
                nickname: char.nickname,
                avatar: char.avatar,
                main_persona: char.main_persona,
                section: char.section,
                type: char.type,
                settings: char.settings,
                memories: [],
                status: {},
                status_history: []
            };
            this.set('chara_db_characters', db);
            return true;
        }
        return false;
    }
}

// 实例化并挂载到 window
window.sysStore = new Store();