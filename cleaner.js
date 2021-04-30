const config = JSON.parse(JSON.stringify(require('./config/farmer')));

const cleaner = require('./core-utils');

const farmer = new cleaner.Farmer(config);

farmer.getShards((err, arr) => {
    
    if(err)
    {
        return console.log(err);
    }

    farmer.connectBridge(arr);
    
});