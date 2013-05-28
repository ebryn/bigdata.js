import MergeConflict from "bigdata/merge_conflict";

var versionUuid = 0;

var Store = function(map, versions) {
  this.map = map || {};
  this.versions = versions || {};
  this.conflictQueue = [];
};

Store.prototype = {
  map: null,
  versions: null,
  conflictQueue: null,

  find: function(klass, id) {
    if (arguments.length === 1) { id = ''; } // find by key
    var map = this.map,
        key = klass+id,
        record = map[key];

    if (record && !record._bigdata_key) { Object.defineProperty(record, '_bigdata_key', {value: key}); }

    return record;
  },

  all: function(klass) {
    var map = this.map,
        records = [];

    // TODO: optimize me
    for (var key in map) {
      var record = map[key];

      if (key.indexOf(klass) === 0) {
        if (record && !record._bigdata_key) { Object.defineProperty(record, '_bigdata_key', {value: key}); }
        records.push(record);
      }
    }

    return records;
  },

  load: function(klass, id, data) {
    if (arguments.length === 2) { data = id; id = ''; } // load by key
    var map = this.map,
        versions = this.versions,
        key = klass+id;

    versions[key] = versionUuid++;
    map[key] = data;
  },

  save: function(record) {
    var map = this.map,
        key = record._bigdata_key;

    this.load(key, record);
  },

  remove: function(klass, id) {
    if (arguments.length === 1) { id = ''; } // find by key
    var map = this.map,
        versions = this.versions,
        key = klass+id,
        record = map[key];

    delete map[key];
    delete versions[key];

    return record;
  },

  versionFor: function(klass, id) {
    if (arguments.length === 1) { id = ''; } // find by key
    var versions = this.versions;
    return versions[klass+id];
  },

  fork: function() {
    var fork = new Store(Object.create(this.map), Object.create(this.versions));
    return fork;
  },

  merge: function(fork) {
    var storeMap = this.map,
        forkMap = fork.map,
        storeVersions = this.versions,
        forkVersions = fork.versions;

    for (var key in forkMap) {
      var inStore = storeMap.hasOwnProperty(key),
          inFork  = forkMap.hasOwnProperty(key);

      if (!inFork) { continue; }

      if (inStore && inFork) {
        var storeVersion = storeVersions[key],
            forkVersion  = forkVersions[key];

        if (storeVersion < forkVersion) {
          storeMap[key] = forkMap[key];
          storeVersions[key] = forkVersions[key];
        } else {
          var mergeConflict = new MergeConflict(this, key, storeMap[key], storeVersion, forkMap[key], forkVersion);
          this.conflictQueue.push(mergeConflict);
          return this.conflictQueue;
        }
      } else if (!inStore && inFork) {
        storeMap[key] = forkMap[key];
        storeVersions[key] = forkVersions[key];
      } else {
        throw new Error('WAT');
      }
    }

    return this.conflictQueue;
  }
};

export Store;