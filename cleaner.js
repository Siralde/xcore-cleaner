const config = JSON.parse(JSON.stringify(require('./config/farmer')));

const cleaner = require('./core-utils');

const farmer = new cleaner.Farmer(config);

farmer.getShards((err, arr) => {
    if (err) {
        return console.log(err);
    }

    farmer.getShardsFromBridge(arr, (err, bridgeShards) => {
        let filteredShardArray = [];
        console.log('Core Shards', arr);
        console.log('Bridge Shards', bridgeShards);
        filteredShardArray = arr.filter( (shard) => {
            return !bridgeShards.includes(shard);
        })
        console.log('Filtered Shards', filteredShardArray);
        // farmer.deleteUnusedData(filteredShardArray, (err) => {
        //     if(err) {
        //         console.error( 'Error Deleting Unused Data', err)
        //     }
        //     console.log('Finished');
        // })
        farmer.flushData((err) => {
            if(err) {
                console.error( 'Error Deleting Unused Data', err)
            }
            console.log('Finished');
        })
    });
});