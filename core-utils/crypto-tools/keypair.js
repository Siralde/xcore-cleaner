'use strict';

const bitcore = require('bitcore-lib');
const crypto = require('crypto');
const merge = require('merge');
const secp256k1 = require('secp256k1');
const Message = require('bitcore-message')

class KeyPair {

  /**
   * Represents a ECDSA key pair
   * @constructor
   * @license LGPL-3.0
   * @param {String|Buffer|undefined} privateKey - WIF encoded ECDSA private key
   */
  constructor(privKey)
  {
    
    if (!(this instanceof KeyPair)) {
      return new KeyPair(privKey);
    }
  
    if (privKey) {
      this._privkey = bitcore.PrivateKey.fromString(privKey);
    } else {
      this._privkey = bitcore.PrivateKey.fromRandom();
    }
  
    this._pubkey = this._privkey.toPublicKey();
  }

  /**
   * Returns the private key
   * @returns {String} key
   */
  getPrivateKey() {
    return this._privkey.toString();
  }

  /**
   * Returns the private key padded at 32 bytes
   * @returns {String} key
   */
  getPrivateKeyPadded() {
    return this._privkey.bn.toBuffer({size: 32}).toString('hex');
  };

  /**
   * Returns the public key
   * @returns {String} key
   */
  getPublicKey() {
    return this._pubkey.toString();
  };

  /**
   * Returns the NodeID derived from the public key
   * @returns {String} nodeID - RIPEMD160 hash of public key
   */
  getNodeID() {
    return bitcore.crypto.Hash.sha256ripemd160(
      this._pubkey.toBuffer()
    ).toString('hex');
  };

  
  /**
   * Returns the bitcoin address version of the nodeID
   * @returns {String} address - Base58 encoded address
   */
  getAddress() {
    return bitcore.Address.fromPublicKeyHash(
      Buffer.from(this.getNodeID(), 'hex')
    ).toString();
  };

  /**
   * Signs the supplied message with the private key
   * @param {String|Buffer} message - The message to sign
   * @param {Object} options
   * @param {Boolean} [options.compact=true] - Compact signature format
   * @returns {String} signature
   */
  sign(message, options) {
    var sign = null;
    var signobj = null;
    var opts = merge({ compact: true }, options);

    if (opts.compact) {
      var hash = Message(message).magicHash();
      signobj = secp256k1.ecdsaSign(hash,
        Buffer.from(this.getPrivateKeyPadded(), 'hex'));
      sign = bitcore.crypto.Signature.fromDER(
        Buffer.from(secp256k1.signatureExport(signobj.signature))
      ).toCompact(signobj.recid, this._pubkey.compressed).toString('base64');
    } else {
      if (!Buffer.isBuffer(message)) {
        message = Buffer.from(message, 'utf8');
      }
      var hash = crypto.createHash('sha256').update(message).digest()
      signobj = secp256k1.ecdsaSign(hash,
        Buffer.from(this.getPrivateKeyPadded(), 'hex'));
      sign = Buffer.from(secp256k1.signatureExport(signobj.signature)).toString('hex');
    }

    return sign;
  };

}



module.exports = KeyPair;
