'use strict';

const levelup = require('levelup');
const leveldown = require('leveldown');
const kfs = require('kfs');
const path = require('path');
const assert = require('assert');
const utils = require('../utils');
const mkdirp = require('mkdirp');

/**
 * Implements an LevelDB/KFS storage adapter interface
 * @extends {StorageAdapter}
 * @param {String} storageDirPath - Path to store the level db
 * @constructor
 * @license AGPL-3.0
 */

class Deleter {

  constructor(storageDirPath) {
    if (!(this instanceof Deleter)) {
      return new Deleter(storageDirPath);
    }
  
    this._validatePath(storageDirPath);
  
    this._path = storageDirPath;
    this._db = levelup(leveldown(path.join(this._path, 'contracts.db')));
    this._fs = kfs(path.join(this._path, 'sharddata.kfs'));
    this._isOpen = true;
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
  
  
    return self._del(key, function(err) {
      if (err) {
        return callback(err);
      }

      console.log('delete item', item)
      callback(null);
    });
  };
  
  /**
   * Validates the storage path supplied
   * @private
   */
  _validatePath(storageDirPath) {
    if (!utils.existsSync(storageDirPath)) {
      mkdirp.sync(storageDirPath);
    }
  
    assert(utils.isDirectory(storageDirPath), 'Invalid directory path supplied');
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
    const fskey = key;
  
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
