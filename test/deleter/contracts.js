const levelup = require('levelup')
const leveldown = require('leveldown')
const kfs = require('kfs')
const moment = require('moment')
const tokens = levelup(leveldown('/xcore-storage/tokens.db'))
const _db = levelup(leveldown('/xcore-storage/contracts.db'))
const _fs = kfs('/xcore-storage/sharddata.kfs')

function _peek(key, callback) {
 _db.get(key, { fillCache: false }, function(err, value) {
   if (err) {
     return callback(err);
   }

   callback(null, JSON.parse(value));
 });
};


function _del(key, callback) {
    let fskey = key;
  
    _peek(key, function(err, item) {
      if (!err && item.fskey) {
        fskey = item.fskey;
      }
  
      _db.del(key, function(err) {
        if (err) {
          return callback(err);
        }
  
        _fs.unlink(fskey, function(err) {
          if (err) {
            return callback(err);
          }
  
          callback(null);
        });
      });
    });
  };

// _del('5946b5ba3e1533fc74bb3c1274d8a7b96869aa1f', (err, item) => err ? console.log(err) : console.log(item) );

_peek('2923bc710fbec2973894fd0879cca366abe729b1', (err, item) => err ? console.log(err) : console.log(item) );
