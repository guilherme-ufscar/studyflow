/* ============================================================
   STUDYFLOW — IndexedDB Data Layer (Offline-First)
   Stores: subjects, events, grades, flashcards, files, topics,
           focusSessions, settings
   ============================================================ */

const DB_NAME = 'StudyFlowDB';
const DB_VERSION = 1;

const STORES = {
  subjects:      'subjects',
  events:        'events',
  gradeSchemes:  'gradeSchemes',
  grades:        'grades',
  flashcards:    'flashcards',
  files:         'files',
  topics:        'topics',
  focusSessions: 'focusSessions',
  settings:      'settings',
};

class StudyFlowDB {
  constructor() {
    this.db = null;
    this._ready = this._open();
  }

  _open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Subjects
        if (!db.objectStoreNames.contains(STORES.subjects)) {
          const s = db.createObjectStore(STORES.subjects, { keyPath: 'id' });
          s.createIndex('name', 'name', { unique: false });
        }

        // Events (timeline)
        if (!db.objectStoreNames.contains(STORES.events)) {
          const s = db.createObjectStore(STORES.events, { keyPath: 'id' });
          s.createIndex('date', 'date', { unique: false });
          s.createIndex('subjectId', 'subjectId', { unique: false });
        }

        // Grade schemes (formulas per subject)
        if (!db.objectStoreNames.contains(STORES.gradeSchemes)) {
          const s = db.createObjectStore(STORES.gradeSchemes, { keyPath: 'subjectId' });
        }

        // Individual grade entries
        if (!db.objectStoreNames.contains(STORES.grades)) {
          const s = db.createObjectStore(STORES.grades, { keyPath: 'id' });
          s.createIndex('subjectId', 'subjectId', { unique: false });
        }

        // Flashcards
        if (!db.objectStoreNames.contains(STORES.flashcards)) {
          const s = db.createObjectStore(STORES.flashcards, { keyPath: 'id' });
          s.createIndex('subjectId', 'subjectId', { unique: false });
          s.createIndex('nextReview', 'nextReview', { unique: false });
        }

        // Files (locker)
        if (!db.objectStoreNames.contains(STORES.files)) {
          const s = db.createObjectStore(STORES.files, { keyPath: 'id' });
          s.createIndex('subjectId', 'subjectId', { unique: false });
          s.createIndex('eventId', 'eventId', { unique: false });
        }

        // Topics (roadmap)
        if (!db.objectStoreNames.contains(STORES.topics)) {
          const s = db.createObjectStore(STORES.topics, { keyPath: 'id' });
          s.createIndex('subjectId', 'subjectId', { unique: false });
          s.createIndex('order', 'order', { unique: false });
        }

        // Focus sessions
        if (!db.objectStoreNames.contains(STORES.focusSessions)) {
          const s = db.createObjectStore(STORES.focusSessions, { keyPath: 'id' });
          s.createIndex('subjectId', 'subjectId', { unique: false });
          s.createIndex('date', 'date', { unique: false });
        }

        // Settings (key-value)
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' });
        }
      };

      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      req.onerror = (e) => reject(e.target.error);
    });
  }

  async ready() {
    await this._ready;
    return this;
  }

  /* ---------- Generic CRUD helpers ---------- */

  _tx(storeName, mode = 'readonly') {
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async getAll(storeName) {
    await this._ready;
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async get(storeName, key) {
    await this._ready;
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async put(storeName, data) {
    await this._ready;
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName, 'readwrite').put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async delete(storeName, key) {
    await this._ready;
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName, 'readwrite').delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async getAllByIndex(storeName, indexName, value) {
    await this._ready;
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName);
      const idx = store.index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async count(storeName) {
    await this._ready;
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async clear(storeName) {
    await this._ready;
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName, 'readwrite').clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  /* ---------- Domain helpers ---------- */

  // Subjects
  async getSubjects()          { return this.getAll(STORES.subjects); }
  async getSubject(id)         { return this.get(STORES.subjects, id); }
  async saveSubject(s)         { return this.put(STORES.subjects, s); }
  async deleteSubject(id)      { return this.delete(STORES.subjects, id); }

  // Events
  async getEvents()            { return this.getAll(STORES.events); }
  async getEventsByDate(d)     { return this.getAllByIndex(STORES.events, 'date', d); }
  async saveEvent(e)           { return this.put(STORES.events, e); }
  async deleteEvent(id)        { return this.delete(STORES.events, id); }

  // Grade schemes
  async getGradeScheme(subjectId) { return this.get(STORES.gradeSchemes, subjectId); }
  async saveGradeScheme(s)        { return this.put(STORES.gradeSchemes, s); }

  // Grades
  async getGradesBySubject(subjectId) { return this.getAllByIndex(STORES.grades, 'subjectId', subjectId); }
  async saveGrade(g)                  { return this.put(STORES.grades, g); }
  async deleteGrade(id)               { return this.delete(STORES.grades, id); }

  // Flashcards
  async getFlashcards()                    { return this.getAll(STORES.flashcards); }
  async getFlashcardsBySubject(subjectId)  { return this.getAllByIndex(STORES.flashcards, 'subjectId', subjectId); }
  async saveFlashcard(f)                   { return this.put(STORES.flashcards, f); }
  async deleteFlashcard(id)                { return this.delete(STORES.flashcards, id); }

  // Files (locker)
  async getFiles()                    { return this.getAll(STORES.files); }
  async getFilesBySubject(subjectId)  { return this.getAllByIndex(STORES.files, 'subjectId', subjectId); }
  async saveFile(f)                   { return this.put(STORES.files, f); }
  async deleteFile(id)                { return this.delete(STORES.files, id); }

  // Topics (roadmap)
  async getTopics()                   { return this.getAll(STORES.topics); }
  async getTopicsBySubject(subjectId) { return this.getAllByIndex(STORES.topics, 'subjectId', subjectId); }
  async saveTopic(t)                  { return this.put(STORES.topics, t); }
  async deleteTopic(id)               { return this.delete(STORES.topics, id); }

  // Focus sessions
  async getFocusSessions()                      { return this.getAll(STORES.focusSessions); }
  async getFocusSessionsBySubject(subjectId)    { return this.getAllByIndex(STORES.focusSessions, 'subjectId', subjectId); }
  async saveFocusSession(s)                     { return this.put(STORES.focusSessions, s); }
  async deleteFocusSession(id)                  { return this.delete(STORES.focusSessions, id); }

  // Settings
  async getSetting(key)           { const r = await this.get(STORES.settings, key); return r ? r.value : null; }
  async saveSetting(key, value)   { return this.put(STORES.settings, { key, value }); }
}

// Singleton
const db = new StudyFlowDB();
