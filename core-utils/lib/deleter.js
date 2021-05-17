'use strict';

const assert = require('assert');

/**
 * Implements an LevelDB/KFS storage adapter interface
 * @extends {StorageAdapter}
 * @param {String} storageDirPath - Path to store the level db
 * @constructor
 * @license AGPL-3.0
 */

class Deleter {

  constructor(storageDirPath, contractDB, shardDB) {
    if (!(this instanceof Deleter)) {
      return new Deleter(storageDirPath);
    }
  
    this._path = storageDirPath;
    this._db = contractDB;
    this._fs = shardDB;
  }
  
  /**
   * Calls the implemented {@link StorageAdapter#_del}
   * @param {String} key - Shard hash to delete the data for
   * @param {Function} callback - Called with error or {@link StorageItem}
   */
  del(key, callback) {
    const self = this;
  
    assert(typeof key === 'string', 'Invalid key supplied');
    assert(key.length === 40, 'Key must be 160 bit hex string');
    assert(typeof callback === 'function', 'Callback function must be supplied');
  
    return self._del(key, callback);
  };
  
  /**
   * Calls the implemented {@link StorageAdapter#_del}
   * @param {String} key - Shard hash to delete the data for
   * @param {Function} callback - Called with error or {@link StorageItem}
   */
  flush(callback) {
    const self = this;
  
    assert(typeof callback === 'function', 'Callback function must be supplied');
  
    return self._flush(callback);
  };

  /**
   * Implements the abstract {@link StorageAdapter#_flush}
   * @private
   * @param {Function} callback
   */
  _flush(callback) {
    this._fs.flush(callback);
  };

  
  /**
   * Implements the abstract {@link StorageAdapter#_peek}
   * @private
   * @param {String} key
   * @param {Function} callback
   */
  _peek(key, callback) {
    this._db.get(key, { fillCache: false }, function(err, value) {
      if (err) {
        return callback(err);
      }
  
      callback(null, JSON.parse(value));
    });
  };
  
  
  /**
   * Implements the abstract {@link StorageAdapter#_del}
   * @private
   * @param {String} key
   * @param {Function} callback
   */
  _del(key, callback) {
    const self = this;
    let fskey = key;
  
    self._peek(key, function(err, item) {
      if (!err && item.fskey) {
        fskey = item.fskey;
      }
  
      self._db.del(key, function(err) {
        if (err) {
          return callback(err);
        }
  
        self._fs.unlink(fskey, function(err) {
          if (err) {
            return callback(err);
          }
  
          callback(null);
        });
      });
    });
  };
  
}

module.exports = Deleter;