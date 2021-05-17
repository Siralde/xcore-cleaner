const levelup = require('levelup')
const leveldown = require('leveldown')
const kfs = require('kfs')
const moment = require('moment')
const tokens = levelup(leveldown('/xcore-storage/tokens.db'))
const contracts = levelup(leveldown('/xcore-storage/contracts.db'))
const shards = kfs('/xcore-storage/sharddata.kfs')

function readAllTokens(callback) {
    tokens.createReadStream()
        .on('data', function (data) {
            const key = data.key.toString()
            const value = data.value.toString()
            if (key.startsWith('EX')) {
                console.log(key, value)
            } else {
                const token = JSON.parse(value)
                console.log(key)
                console.log(token)
            }
        }).on('error', function (err) {
            console.log('Oh my!', err)
        }).on('close', function () {
            console.log('Stream closed')
        }).on('end', function () {
            callback()
        })
}

function readAllContracts(callback) {
    let arr = [];
    contracts.createReadStream()
        .on('data', function (data) {;
            const key = data.key.toString(); //Key File for read all shards
            const value = JSON.parse(data.value.toString())
            const innerKey = Object.keys(value.contracts)[0]
            const contract = value.contracts[innerKey];
            arr.push(key);
            const store_begin = new Date(contract.store_begin)
            const store_end = new Date(contract.store_end)
            const diff = moment(store_end).diff(moment(store_begin), 'days')
            const diffNow = moment(store_end).diff(moment(new Date()), 'days')
            // console.log('Contract duration', diff)
            // console.log('Contract duration left', diffNow)
        }).on('error', function (err) {
            console.log('Oh my!', err)
            callback(err)
        }).on('close', function () {
      
        }).on('end', function () {
            callback(null, arr)
        })
}

function readAllShards(callback) {

    shards.createReadStream('2923bc710fbec2973894fd0879cca366abe729b1', function(err, shard) {
        if (err) {
          return callback(err);
        }
        console.log('Shard', shard);
        callback(null, shard);
    });
}


// readAllContracts((error, arr) => error ? console.log(error) : console.log('Data: ', arr))
readAllShards((error, arr) => error ? console.log(error) : console.log('Data: ', arr))


module.exports = { readAllContracts, readAllShards, readAllTokens }