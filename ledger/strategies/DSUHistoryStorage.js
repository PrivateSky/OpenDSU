const LatestHashTracker = require("./LatestHashTracker");

const DOMAIN = "default";

module.exports.createDSUHistoryStorage = function (ssi) {
    /*
    This strategy will handle the history of all the blocks as mounted DSUs
        - each year & each & each hour day will have a separate DSU mounted in the /storage folder of the main DSU of the ledger
        For example in the 2021/12/3/21/03 you can find all the transactions that happened in the 3th day of December 2021, at hour 21 min 03
     */
    const opendsu = require("opendsu");
    const resolver = opendsu.loadApi("resolver");
    const keySSI = opendsu.loadApi("keyssi");
    const createDSU = $$.promisify(resolver.createDSU);
    const loadDSU = $$.promisify(resolver.loadDSU);

    let lht = new LatestHashTracker();

    const strategy = {};
    strategy.getHashLatestBlock = lht.getHashLatestBlock;
    let latestPulse = -1;

    let mainDSU;
    let writeFile;
    let readFile;
    let listMountedDSUs;

    const loadedMountedDSUs = {};

    const ensureLoadedDSU = async () => {
        if (mainDSU) {
            return;
        }

        mainDSU = await loadDSU(ssi);
        writeFile = $$.promisify(mainDSU.writeFile);
        readFile = $$.promisify(mainDSU.readFile);
        listMountedDSUs = $$.promisify(mainDSU.listMountedDSUs);
    };

    strategy.appendBlock = async function (block, announceFlag, callback) {
        const currentTime = new Date();

        try {
            await ensureLoadedDSU();

            // we take all the parts of the currentTime, until minutes inclusive
            const dateParts = currentTime
                .toISOString()
                .split(/[-T:Z.]/g)
                .slice(0, 5);
            const blockFilename = dateParts.pop();

            console.log(
                `[DSUHistoryStorage] Appending block at /history/${dateParts.join("/")}/${blockFilename}`,
                block
            );

            let currentDatePartDSU = mainDSU;
            for (let datePartIndex = 0; datePartIndex < dateParts.length; datePartIndex++) {
                const datePart = dateParts[datePartIndex];
                let parentMountedLocation = `/history/${dateParts.slice(0, datePartIndex).join("/")}`;
                if (parentMountedLocation.endsWith("/")) {
                    parentMountedLocation = parentMountedLocation.slice(0, -1);
                }

                const mountedDSUs = await listMountedDSUs(parentMountedLocation);
                console.log(`[DSUHistoryStorage] parentMountedLocation at ${parentMountedLocation}`, mountedDSUs);

                const mountedDSUMatchedForDatePart = mountedDSUs.find((mountedDSU) => mountedDSU.path === dataPart);
                let mountedDSU;
                if (mountedDSUMatchedForDatePart) {
                    const { identifier } = dsuForCurrentDatePart;
                    if (loadedMountedDSUs[identifier]) {
                        mountedDSU = loadedMountedDSUs[identifier];
                    } else {
                        mountedDSU = await loadDSU(identifier);
                    }
                } else {
                    console.log(`[DSUHistoryStorage] mounting ${parentMountedLocation}/${datePart}...`);

                    const keySSITemplate = keySSI.createTemplateKeySSI("seed", DOMAIN);
                    mountedDSU = await createDSU(keySSITemplate);
                    const identifier = await $$.promisify(mountedDSU.getKeySSIAsString)();

                    const mountLocation = datePartIndex === 0 ? `/history/${datePart}` : datePart;
                    console.log(`[DSUHistoryStorage] mounting ${mountLocation}...`);
                    await $$.promisify(currentDatePartDSU.mount)(mountLocation, identifier);

                    loadedMountedDSUs[identifier] = mountedDSU;
                }

                currentDatePartDSU = mountedDSU;

                const mountedDSUs2 = await listMountedDSUs(parentMountedLocation);
                console.log(
                    `[DSUHistoryStorage] parentMountedLocation at ${parentMountedLocation} after mounting`,
                    mountedDSUs2
                );
            }

            await $$.promisify(currentDatePartDSU.writeFile)(`/${blockFilename}`, JSON.stringify(block));

            if (block.pulse <= latestPulse) {
                return callback();
            }

            latestPulse = block.pulse;

            try {
                console.log(`[DSUHistoryStorage] writing to /history/index: ${latestPulse.toString()}`);
                await writeFile(`/history/index`, latestPulse.toString());
                lht.update(block.pulse, block);
                callback();
            } catch (error) {
                callback(error);
            }
        } catch (error) {
            console.error("Unable to append block in DSU", error);
            callback(error);
        }
    };

    strategy.getLatestBlockNumber = async function (callback) {
        try {
            await ensureLoadedDSU();
            const indexFileContent = await readFile(`/history/index`);
            const maxBlockNumber = parseInt(indexFileContent.toString(), 10);
            callback(undefined, maxBlockNumber);
        } catch (error) {
            callback(error);
        }
    };

    strategy.loadSpecificBlock = async function (blockNumber, callback) {
        console.log(`[DSUHistoryStorage] loadSpecificBlock: ${blockNumber}`);
        try {
            await ensureLoadedDSU();
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
            console.log("error loadSpecificBlock", error);
            callback(error);
        }
    };

    strategy.loadEachBlockInOrder = async function (callback) {
        console.log(`[DSUHistoryStorage] loadEachBlockInOrder`);
        try {
            await ensureLoadedDSU();

            const run = async (mountedDSUs) => {
                mountedDSUs.sort((a, b) => {
                    if (a.code < b.code) return -1;
                    if (a.code > b.code) return 1;
                    return 0;
                });

                for (let mountedDSUEntryIndex = 0; mountedDSUEntryIndex < mountedDSUs.length; mountedDSUEntryIndex++) {
                    const mountedDSUEntry = mountedDSUs[mountedDSUEntryIndex];

                    const { identifier } = mountedDSUEntry;
                    let mountedDSU;
                    if (loadedMountedDSUs[identifier]) {
                        mountedDSU = loadedMountedDSUs[identifier];
                    } else {
                        mountedDSU = await loadDSU(identifier);
                        loadedMountedDSUs[identifier] = mountedDSU;
                    }

                    const mountedChildrenDSUs = await $$.promisify(mountedDSU.listMountedDSUs)("/");
                    console.log("[DSUHistoryStorage] mountedChildrenDSUs", mountedChildrenDSUs);
                    if (mountedChildrenDSUs.length) {
                        await run(mountedChildrenDSUs);
                        return;
                    }

                    let mountedDSUFiles = await $$.promisify(mountedDSU.listFiles)("/");
                    console.log("[DSUHistoryStorage] mountedDSUFiles", mountedDSUFiles);

                    mountedDSUFiles = mountedDSUFiles.filter((filename) => /^\d+$/.test(filename));
                    for (let fileIndex = 0; fileIndex < mountedDSUFiles.length; fileIndex++) {
                        const mountedDSUFile = mountedDSUFiles[fileIndex];

                        let block = await $$.promisify(mountedDSU.readFile)(`/${mountedDSUFile}`);
                        try {
                            block = block.toString();
                            console.log(`[DSUHistoryStorage] block ${mountedDSUFile}`, block);
                            block = JSON.parse(block);
                            lht.update(block.pulse, res);
                        } catch (e) {
                            callback(e);
                        }
                        callback(null, block);
                    }
                }
            };

            const historyParentDSUs = await $$.promisify(listMountedDSUs)("/history");
            
            await run(historyParentDSUs);
        } catch (error) {
            console.log("error loadEachBlockInOrder", error);
            callback(error);
        }
    };

    ////////////////////////
    let observer;
    //send to callback all blocks newer then fromVSD
    strategy.observeNewBlocks = function (fromVSD, callback) {
        observer = callback;
    };

    return strategy;
};
