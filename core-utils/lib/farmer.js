'use strict';

const async = require('async');
const secp256k1 = require('secp256k1');
const assert = require('assert');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const url = require('url');
const KeyPair = require('../crypto-tools/keypair');
const Reader = require('../lib/reader');
const Deleter = require('./deleter');
const utils = require('../utils');
const path = require('path');
const levelup = require('levelup')
const leveldown = require('leveldown')
const kfs = require('kfs');

class FarmerInterface {
  
  constructor(options) {
    if (! (this instanceof FarmerInterface )) {
        FarmerInterface.instance = new FarmerInterface(options);
    }

    assert(options.storagePath, 'storagePath is expected option');

    this._mapBridges(options.bridges);
    this._initKeyPair(options.networkPrivateKey);
    
    this._validatePath(options.storagePath);
    
    this._path = options.storagePath;
    this._db = levelup(leveldown(path.join(this._path, 'contracts.db')));
    this._fs = kfs(path.join(this._path, 'sharddata.kfs'));

    this._initDeleter(options.storagePath, this._db, this._fs);
    this._initReader(options.storagePath, this._db, this._fs);
  }

  _mapBridges(bridges) {
    this.bridges = new Map();
    for (let i = 0; i < bridges.length; i++) {
      this.bridges.set(bridges[i].extendedKey, {
        url: bridges[i].url,
        extendedKey: bridges[i].extendedKey,
        connected: false
      });
    }
  }

  _initKeyPair(networkPrivateKey) {
    // assert(networkPrivateKey, '"Network Private Key" is expected');
    this.keyPair = new KeyPair(networkPrivateKey);
  }

  _initDeleter(storagePath, contractDB, shardDB) {
    this.deleter = new Deleter(storagePath, contractDB, shardDB);
  }

  _initReader(storagePath, contractDB, shardDB) {
    this.reader = new Reader(storagePath, contractDB, shardDB);
  }

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

  getInstance() {
    return FarmerInterface.instance;
  }

  getShardsFromBridge(shards, callback) {

    const bridgeIter = this.bridges.values()
    this._getShardsFromBridge(bridgeIter.next().value, shards, (err, shardsRetrieved) => {
      if(err) {
        callback(err);
      }
      else {
        callback(null, shardsRetrieved);
      }
    })
  }
  
  _getShardsFromBridge(bridge, shards, callback) {
    let headers = {};
    let body = {shards};
    let path = '/contacts/shards';
    
    this.bridgeRequest(bridge.url, 'POST', path, headers, body, (err, shardsRetrieved) => {
      
      if (err && err.statusCode >= 400) 
      {
        return callback(err);
      } 
  
      if (shardsRetrieved) 
      {
        callback(null, shardsRetrieved);
      }

    });
    
  }

  _getSigHash(bridgeUrl, method, path, timestamp, rawbody) {
    const hasher = crypto.createHash('sha256');
    hasher.update(method);
    hasher.update(bridgeUrl + path);
    hasher.update(timestamp.toString());
    hasher.update(rawbody);
    return hasher.digest();
  }
  
  bridgeRequest(bridgeUrl, method, path, headers, body, callback) {
    const urlObj = url.parse(bridgeUrl);
    const timestamp = Date.now();
    const rawbody = JSON.stringify(body);
    const sighash = this._getSigHash(bridgeUrl, method, path, timestamp, rawbody);

    const privkey = Buffer.from(this.keyPair.getPrivateKeyPadded(), 'hex');
    const sigObj = secp256k1.ecdsaSign(sighash, privkey);
    const sig = Buffer.from(secp256k1.signatureExport(sigObj.signature)).toString('hex');

    headers['x-node-timestamp'] = timestamp;
    headers['x-node-id'] = this.keyPair.getNodeID();
    headers['x-node-signature'] = sig;
    headers['x-node-pubkey'] = this.keyPair.getPublicKey();
    headers['content-type'] = 'application/json';
    headers['content-length'] = Buffer.byteLength(rawbody);

    const options = {
      headers: headers,
      method: method,
      path: path,
      hostname: urlObj.hostname,
      port: parseInt(urlObj.port)
    };

    let proto = null;
    if (urlObj.protocol === 'https:') 
    {
      proto = https;
    } 
    else if (urlObj.protocol === 'http:') 
    {
      proto = http;
    } 
    else 
    {
      return callback(new Error('Unsupported protocol'));
    }

    const req = proto.request(options, (res) => {

      let str = '';
      let json = null;

      if (res.statusCode >= 400) {
        let error = new Error('Bridge request failed (' + res.statusCode + ')');
        error.statusCode = res.statusCode;
        return callback(error);
      }

      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        str += chunk.toString();
      });

      res.on('end', () => {
        try 
        {
          json = JSON.parse(str);
        } 
        catch (err) 
        {
          callback(new Error('Unable to parse response'));
        }

        callback(null, json);
      });

      });

      req.on('error', callback);

      req.write(rawbody);
      req.end();
  }

  getShards(callback) {
    this.reader.readAllContracts(callback);
  }

  deleteUnusedData(shardToDelete, callback) {
    shardToDelete.map( (shard) => this.deleter.del(shard, callback));
  }

  flushData(callback) {
    this.deleter.flush(callback);
  }

}

module.exports = FarmerInterface;