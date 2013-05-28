(function(globals) {
var define, requireModule;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requireModule = function(name) {
    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    if (!registry[name]) {
      throw new Error("Could not find module " + name);
    }

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(deps[i]));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;
  };
})();

define("bigdata",
  ["bigdata/store","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Store = __dependency1__.Store;

    __exports__.Store = Store;
  });

define("bigdata/merge_conflict",
  ["exports"],
  function(__exports__) {
    "use strict";
    var MergeConflict = function(store, key, originalObject, originalVersion, forkedObject, forkedVersion) {
      this.store = store;
      this.key = key;
      this.objA = originalObject;
      this.versionA = originalVersion;
      this.objB = forkedObject;
      this.versionB = forkedVersion;
    };

    MergeConflict.prototype = {
      store: null,
      key: null,
      objA: null,
      versionA: null,
      objB: null,
      versionB: null,

      resolve: function(obj) {
        var store = this.store,
            key = this.key;

        store.load(key, obj);
      },

      lastWriteWins: function() {
        var store = this.store,
            key = this.key;

        var currentObj = store.find(key),
            currentVersion = store.versionFor(key);

        if (currentVersion > this.versionA && currentVersion > this.versionB) {
          this.resolve(currentObj);
        } else if (this.versionA > this.versionB && this.versionA > currentVersion) {
          this.resolve(this.objA);
        } else {
          this.resolve(this.objB);
        }
      }
    };

    __exports__.MergeConflict = MergeConflict;
  });

define("bigdata/store",
  ["bigdata/merge_conflict","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MergeConflict = __dependency1__.MergeConflict;

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

        Object.defineProperty(record, '_bigdata_key', {value: key});

        return record;
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

    __exports__.Store = Store;
  });
window.bigdata = requireModule("bigdata");
})(window);