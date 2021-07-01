/**
 * @param {Object} [options]
 * @param {string} [options.domain=default]
 * @param {string} [options.volume=external-volume]
 * @param {string} [options.folder=test]
 */
async function mockEnvironment({ domain, volume, folder } = {}) {
    const path = require('path');
    const dc = require('double-check');

    const cache = require('../../../cache');
    const vault = cache.getCacheForVault('DSUs');

    if (!domain) {
        domain = 'default';
    }
    if (!volume) {
        volume = 'external-volume';
    }
    if (!folder) {
        folder = 'test';
    }

    const testFolder = `${folder}_`;
    const basePath = await $$.promisify(dc.createTestFolder)(testFolder);
    const domainPath = path.join(basePath, volume, 'domains', domain);
    const anchorsPath = path.join(domainPath, 'anchors');
    const brickStoragePath = path.join(domainPath, 'brick-storage');

    return {
        domain,
        volume,
        vault,
        basePath,
        domainPath,
        anchorsPath,
        brickStoragePath
    };
}

async function extractBricks({ brickStoragePath }) {
    const fs = require('fs');
    const path = require('path');

    const brickTable = await $$.promisify(fs.readdir)(brickStoragePath);
    const brickCellSize = brickTable[0].length;

    let promises = brickTable.map(brickCell =>
        $$.promisify(fs.readdir)(path.join(brickStoragePath, brickCell))
    );
    const brickHashes = (await Promise.all(promises)).reduce((accumulator, brickHash) =>
            [...accumulator, ...brickHash]
        , []);
    promises = brickHashes.map(brickHash => (async () => {
        const brickSubPath = path.join(brickHash.substr(0, brickCellSize), brickHash);
        const brickPath = path.join(brickStoragePath, brickSubPath);
        const brickBuffer = await $$.promisify(fs.readFile)(brickPath);
        return {
            hash: brickHash,
            path: brickPath,
            subPath: brickSubPath,
            stats: await $$.promisify(fs.stat)(brickPath),
            buffer: brickBuffer,
            content: brickBuffer.toString()
        };
    })());
    return (await Promise.all(promises)).sort((b1, b2) => b2.stats.mtime - b1.stats.mtime);
}

async function extractLatestBrickMap({ brickStoragePath }) {
    const bricks = await extractBricks({ brickStoragePath });
    const lastBrickMap = bricks[0];
    bricks.shift();
    return [lastBrickMap, bricks];
}

/**
 * Fills cache entirely with DSUs, 3 cache levels (each of them is of size 1000)
 * Check module psk-cache
 *
 * @param {Object} env
 * @param {string} env.domain
 * @param {Object} vault
 */
async function fillCacheEntirely({ domain, vault }) {
    const resolver = require('../../../resolver');

    const limit = 3 * 1000 + 1;
    const promises = [];

    for (let i = 0; i < limit; i++) {
        promises.push((async () => {
            const dsu = await $$.promisify(resolver.createDSUx)(domain, 'seed');
            const key = await $$.promisify(dsu.getKeySSIAsString)();
            vault.put(key, undefined);
            await $$.promisify(resolver.loadDSU)(key);
        })());
    }
    await Promise.all(promises);
}

module.exports = {
    mockEnvironment,
    extractBricks,
    extractLatestBrickMap,
    fillCacheEntirely
};
