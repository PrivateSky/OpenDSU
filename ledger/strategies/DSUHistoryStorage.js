const LatestHashTracker = require("./LatestHashTracker");

module.exports.createDSUHistoryStorage = function (ssi) {

    /*
    This strategy will handle the history of all the blocks as mounted DSUs
        - each year & each & each hour day will have a separate DSU mounted in the /storage folder of the main DSU of the ledger
        For example in the 2021/12/3/21 you can find all the transactions that happened in the 3th day of December 2021, at hour 21
     */
    const strategy = {};

    const opendsu = require("opendsu");
    const resolver = opendsu.loadApi("resolver");
    const mainDsuHandler = resolver.getDSUHandler(ssi);

    let lht = new LatestHashTracker();

    strategy.getHashLatestBlock = lht.getHashLatestBlock;
    let latestPulse = -1;

    const writeFile = $$.promisify(mainDsuHandler.writeFile);
    const readFile = $$.promisify(mainDsuHandler.readFile);

    strategy.appendBlock = async function (block, announceFlag, callback) {
        // get current time
        console.log('Appending block', block);
        try {
            await writeFile(`/history/${block.pulse}`, JSON.stringify(block, null, 1));

            if (block.pulse <= latestPulse) {
                return callback();
            }

            latestPulse = block.pulse;


            try {
                await writeFile(`/history/index`, latestPulse.toString());
                lht.update(block.pulse, block);
                callback();
            } catch (error) {
                callback(error);
            }
        } catch (error) {
            console.error('Unable to append block in DSU', error);
            callback(error);
        }
    };

    strategy.getLatestBlockNumber = async function (callback) {
        try {
            const indexFileContent = await readFile(`/history/index`);
            const maxBlockNumber = parseInt(indexFileContent.toString(), 10);
            callback(undefined, maxBlockNumber);
        } catch (error) {
            callback(error);
        }
    };

    strategy.loadSpecificBlock = async function (blockNumber, callback) {
        console.trace("loadSpecificBlock")
        try {
            let block = await readFile(`/history/${blockNumber}`);
            try {
                block = block.toString();
                block = JSON.parse(block);
                lht.update(block.pulse, res);
            } catch (e) {
                callback(e);
            }
            callback(null, block);
        } catch (error) {
            callback(error);
        }
    };

    ////////////////////////
    let observer;
    //send to callback all blocks newer then fromVSD
    strategy.observeNewBlocks = function (fromVSD, callback) {
        observer = callback;
    }

    return strategy;
}