const config = JSON.parse(JSON.stringify(require('./config/farmer')));

const cleaner = require('./core-utils');

const farmer = new cleaner.Farmer(config);

farmer.connectBridge();

farmer.getShards();