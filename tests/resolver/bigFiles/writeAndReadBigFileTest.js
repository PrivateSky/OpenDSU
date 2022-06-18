const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

require("../../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("../../../index");
$$.__registerModule("opendsu", openDSU);
const resolver = openDSU.loadAPI("resolver");
const keySSIApi = openDSU.loadAPI("keyssi");

const DOMAIN = "default";
const FILE_CHUNK_SIZE = 1024 * 1024;
const DSU_ADDED_FILE_PATH = "/data";

function generateRandomFile(filePath, fileSize) {
    const writer = fs.createWriteStream(filePath);
    console.log(`Writing ${fileSize} bytes to ${filePath}`);

    return new Promise((resolve, reject) => {
        const step = 1000;
        let i = fileSize;
        write();
        function write() {
            let ok = true;
            do {
                const chunkSize = i > step ? step : i;
                const buffer = crypto.randomBytes(chunkSize);

                i -= chunkSize;
                if (i === 0) {
                    // Last time!
                    writer.write(buffer, (error) => {
                        if (error) {
                            return reject(error);
                        }
                        resolve();
                    });
                } else {
                    // See if we should continue, or wait.
                    // Don't pass the callback, because we're not done yet.
                    ok = writer.write(buffer);
                }
            } while (i > 0 && ok);

            if (i > 0) {
                // Had to stop early!
                // Write some more once it drains.
                writer.once("drain", write);
            }
        }
    });
}

async function writeDataToBricks(keySSI, data) {
    // const openDSU = require("opendsu");
    const bricking = openDSU.loadApi("bricking");
    const options = {
        MAX_BRICK_SIZE: FILE_CHUNK_SIZE,
    };
    const buffer = $$.Buffer.from(data);
    const hashLinks = await $$.promisify(bricking.constructBricksFromData)(keySSI, buffer, options);
    return hashLinks;
}

async function writeBigFileToDSU(originalFilePath, originalFileSize, dsu, templateSeedSSI) {
    const hashLinks = [];

    const originalFileReadStream = fs.createReadStream(originalFilePath, { highWaterMark: FILE_CHUNK_SIZE });
    for await (const chunk of originalFileReadStream) {
        const chunkHashLinks = await writeDataToBricks(templateSeedSSI, chunk);
        chunkHashLinks.forEach((hashLink) => hashLinks.push(hashLink));
    }

    const sizeSSI = keySSIApi.createSizeSSI(DOMAIN, originalFileSize, FILE_CHUNK_SIZE);
    hashLinks.unshift({ size: sizeSSI.getIdentifier() });

    console.log("FINAL hashlinks", hashLinks);

    await $$.promisify(dsu.writeFileFromBricks)(DSU_ADDED_FILE_PATH, hashLinks);

    console.log(`Finished writing file to DSU at ${DSU_ADDED_FILE_PATH}`);
}

function streamToBuffer(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

async function compareOriginalFileWithOneFromDSU(originalFilePath, chunkSize, dsu) {
    const originalFileSize = fs.statSync(originalFilePath).size;
    const originalFileReadStream = fs.createReadStream(originalFilePath, { highWaterMark: chunkSize });
    let startIndex = 0;
    for await (const originalChunk of originalFileReadStream) {
        // not all time is the highWaterMark enforced, so we need to get the byteLength of the chunk that was actually read
        const actualChunkSize = originalChunk.byteLength;
        const streamRange = { start: startIndex, end: startIndex + actualChunkSize - 1 };
        console.log(`Checking chunk start: ${streamRange.start}, end: ${streamRange.end}, size: ${actualChunkSize}`);

        const { totalSize, stream: dsuFileStream } = await $$.promisify(dsu.createBigFileReadStreamWithRange)(
            DSU_ADDED_FILE_PATH,
            streamRange
        );
        const dsuFileBuffer = await streamToBuffer(dsuFileStream);

        if (Buffer.compare(originalChunk, dsuFileBuffer) !== 0) {
            console.log("Buffers are not the same");
            console.log("originalChunk", originalChunk, originalChunk.byteLength);
            console.log("dsuFileBuffer", dsuFileBuffer, dsuFileBuffer.byteLength);
        }

        assert.equal(totalSize, originalFileSize);
        assert.true(Buffer.compare(originalChunk, dsuFileBuffer) === 0, "Buffers are not the same");

        startIndex += actualChunkSize;
    }
}

assert.callback(
    "Writing big file with writeFileFromBricks without sizeSSI test",
    async (testFinished) => {
        const folder = await $$.promisify(dc.createTestFolder)("createTest1");

        await $$.promisify(tir.launchApiHubTestNode)(10, folder);

        const templateSeedSSI = keySSIApi.createTemplateSeedSSI(DOMAIN);
        const dsu = await $$.promisify(resolver.createDSU)(templateSeedSSI);

        const ORIGINAL_FILE_SIZE = FILE_CHUNK_SIZE * 10;
        const originalFilePath = path.join(folder, "original");
        await generateRandomFile(originalFilePath, ORIGINAL_FILE_SIZE);

        const hashLinks = [];
        const originalFileReadStream = fs.createReadStream(originalFilePath, { highWaterMark: FILE_CHUNK_SIZE });
        for await (const chunk of originalFileReadStream) {
            const chunkHashLinks = await writeDataToBricks(templateSeedSSI, chunk);
            chunkHashLinks.forEach((hashLink) => hashLinks.push(hashLink));
        }

        try {
            await $$.promisify(dsu.writeFileFromBricks)(DSU_ADDED_FILE_PATH, []);
            assert.true(false); // should not execute this code since cannot call writeFileFromBricks without sizeSSI
        } catch (error) {
            console.log("Read as BigFile error", error);
            assert.notNull(error);
        }

        try {
            await $$.promisify(dsu.writeFileFromBricks)(DSU_ADDED_FILE_PATH, hashLinks);
            assert.true(false); // should not execute this code since cannot call writeFileFromBricks without sizeSSI
        } catch (error) {
            console.log("Read as BigFile error", error);
            assert.notNull(error);
        }

        testFinished();
    },
    100000
);

assert.callback(
    "Writing big file with writeFileFromBricks and compare the saved file test",
    async (testFinished) => {
        const folder = await $$.promisify(dc.createTestFolder)("createTest1");

        await $$.promisify(tir.launchApiHubTestNode)(10, folder);

        const templateSeedSSI = keySSIApi.createTemplateSeedSSI(DOMAIN);
        const dsu = await $$.promisify(resolver.createDSU)(templateSeedSSI);

        const ORIGINAL_FILE_SIZE = FILE_CHUNK_SIZE * 10;
        const originalFilePath = path.join(folder, "original");
        await generateRandomFile(originalFilePath, ORIGINAL_FILE_SIZE);

        await writeBigFileToDSU(originalFilePath, ORIGINAL_FILE_SIZE, dsu, templateSeedSSI);

        // compare the original file and the one saved inside the DSU using various buffer sizes
        await compareOriginalFileWithOneFromDSU(originalFilePath, FILE_CHUNK_SIZE, dsu);
        await compareOriginalFileWithOneFromDSU(originalFilePath, Math.floor(FILE_CHUNK_SIZE / 2), dsu);
        await compareOriginalFileWithOneFromDSU(originalFilePath, Math.floor(FILE_CHUNK_SIZE / 3), dsu);
        await compareOriginalFileWithOneFromDSU(originalFilePath, Math.floor(FILE_CHUNK_SIZE / 4), dsu);
        await compareOriginalFileWithOneFromDSU(originalFilePath, Math.floor(FILE_CHUNK_SIZE / 5), dsu);

        testFinished();
    },
    100000
);

assert.callback(
    "Writing normal file with writeFileFromBricks and failure to read as big file test",
    async (testFinished) => {
        const folder = await $$.promisify(dc.createTestFolder)("createTest1");

        await $$.promisify(tir.launchApiHubTestNode)(10, folder);

        const templateSeedSSI = keySSIApi.createTemplateSeedSSI(DOMAIN);
        const dsu = await $$.promisify(resolver.createDSU)(templateSeedSSI);

        const ORIGINAL_FILE_SIZE = 512 * 1024; // 0.5 MB
        const originalFilePath = path.join(folder, "original");
        await generateRandomFile(originalFilePath, ORIGINAL_FILE_SIZE);
        const originalFileContent = await $$.promisify(fs.readFile)(originalFilePath);

        await $$.promisify(dsu.writeFile)(DSU_ADDED_FILE_PATH, originalFileContent);
        console.log(`Finished writing file to DSU at ${DSU_ADDED_FILE_PATH}`);

        try {
            const streamRange = { start: 0, end: ORIGINAL_FILE_SIZE - 1 };
            const { totalSize, stream } = await $$.promisify(dsu.createBigFileReadStreamWithRange)(
                DSU_ADDED_FILE_PATH,
                streamRange
            );
            assert.true(false); // should not execute this code since a normal file cannot be read as BigFile
        } catch (error) {
            console.log("Read as BigFile error", error);
            assert.notNull(error);
        }

        testFinished();
    },
    100000
);

assert.callback(
    "Writing big file file with writeFileFromBricks and failure to read as normal file test",
    async (testFinished) => {
        const folder = await $$.promisify(dc.createTestFolder)("createTest1");

        await $$.promisify(tir.launchApiHubTestNode)(10, folder);

        const templateSeedSSI = keySSIApi.createTemplateSeedSSI(DOMAIN);
        const dsu = await $$.promisify(resolver.createDSU)(templateSeedSSI);

        const ORIGINAL_FILE_SIZE = FILE_CHUNK_SIZE * 10;
        const originalFilePath = path.join(folder, "original");
        await generateRandomFile(originalFilePath, ORIGINAL_FILE_SIZE);

        await writeBigFileToDSU(originalFilePath, ORIGINAL_FILE_SIZE, dsu, templateSeedSSI);

        try {
            await $$.promisify(dsu.readFile)(DSU_ADDED_FILE_PATH);
            assert.true(false); // should not execute this code since a normal file cannot be read as BigFile
        } catch (error) {
            console.log("Read big file as normal file error", error);
            assert.notNull(error);
        }

        testFinished();
    },
    100000
);

assert.callback(
    "Writing big file file with writeFileFromBricks and failure to read as normal file stream test",
    async (testFinished) => {
        const folder = await $$.promisify(dc.createTestFolder)("createTest1");

        await $$.promisify(tir.launchApiHubTestNode)(10, folder);

        const templateSeedSSI = keySSIApi.createTemplateSeedSSI(DOMAIN);
        const dsu = await $$.promisify(resolver.createDSU)(templateSeedSSI);

        const ORIGINAL_FILE_SIZE = FILE_CHUNK_SIZE * 10;
        const originalFilePath = path.join(folder, "original");
        await generateRandomFile(originalFilePath, ORIGINAL_FILE_SIZE);

        await writeBigFileToDSU(originalFilePath, ORIGINAL_FILE_SIZE, dsu, templateSeedSSI);

        try {
            await $$.promisify(dsu.createReadStream)(DSU_ADDED_FILE_PATH);
            assert.true(false); // should not execute this code since a normal file cannot be read as BigFile
        } catch (error) {
            console.log("Read big file as normal file error", error);
            assert.notNull(error);
        }

        testFinished();
    },
    100000
);
