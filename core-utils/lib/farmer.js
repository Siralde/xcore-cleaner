'use strict';

const async = require('async');
const secp256k1 = require('secp256k1');
const assert = require('assert');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const url = require('url');
const KeyPair = require('../crypto-tools/keypair');
const { getShardDataHash, readAllContracts, readAllShards, readAllTokens } = require('../lib/reader');

class FarmerInterface {
  
  constructor(options) {
    if (! (this instanceof FarmerInterface )) {
        FarmerInterface.instance = new FarmerInterface(options);
    }

    assert(options.storagePath, 'storagePath is expected option');

    this._mapBridges(options.bridges);
    this._initKeyPair(options.networkPrivateKey);
  }

  _initKeyPair(networkPrivateKey) {
    // assert(networkPrivateKey, '"Network Private Key" is expected');
    this.keyPair = new KeyPair(networkPrivateKey);
  }

  getInstance() {
    return FarmerInterface.instance;
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
  };

  connectBridge(shards) {
    async.eachSeries(this.bridges.values(), (bridge, next) => {
      this._connectBridge(bridge, shards, (err) => {
        console.log(err);
      })
      next();
    }, (err) => {
      if (err) 
      {
        console.log(err)
      }
    });
  }
  
  _connectBridge(bridge, shards, callback) {
    let headers = {};
    let body = {shards};
    let path = '/contacts/shards';
    
    this.bridgeRequest(bridge.url, 'POST', path, headers, body, (err, contact) => {
      
      if (err && err.statusCode >= 400) 
      {
        return callback(err);
      } 
  
      // if (contact.address) 
      // {
      //   console.log('Contact', contact);
      // } 
      // else 
      // {
      //   callback();
      // }

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
    readAllContracts(callback)
  }

}

module.exports = FarmerInterface;