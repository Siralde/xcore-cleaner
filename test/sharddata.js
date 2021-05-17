const levelup = require('levelup')
const leveldown = require('leveldown')
const kfs = require('kfs')
const moment = require('moment')
const tokens = levelup(leveldown('/xcore-storage/tokens.db'))
const _db = levelup(leveldown('/xcore-storage/contracts.db'))
const _fs = kfs('/xcore-storage/sharddata.kfs')

function _peek(key, callback) {
 _fs.get(key, { fillCache: false }, function(err, value) {
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

// _peek('230e66e17fe57bf0f4ee13e27809d7c3e39f4a99', (err, item) => err ? console.log(err) : console.log(item) );

_fs.unlink('54d8aea5d66e5ea62f5e4acf2598c95d3db941ce', (err, f) => {console.log(err | f); process.exit(1)});

// _fs.flush((err, f) => {console.log(err | f); process.exit(1)});
// _fs.close()
