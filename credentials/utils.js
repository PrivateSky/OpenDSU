const keySSIResolver = require("key-ssi-resolver");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;
const SSITypes = keySSIResolver.SSITypes;
const keySSIFactory = keySSIResolver.KeySSIFactory;
const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

function base58Decode(data, keepBuffer) {
    const decodedValue = cryptoRegistry.getDecodingFunction(templateSeedSSI)(data);
    if (keepBuffer) {
        return decodedValue;
    }
    return decodedValue ? decodedValue.toString() : null;
}

function base64UrlEncode(source) {
    const buffer = $$.Buffer.from(source, 'utf-8');
    return buffer.toString('base64')
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

function base64UrlDecode(source, keepAsBuffer = false) {
    const buffer = $$.Buffer.from(source, 'base64');
    if (keepAsBuffer) {
        return buffer;
    }

    return buffer.toString('utf-8')
        .replace(/-/g, "+")
        .replace(/_/g, "/");
}

function dateTimeFormatter(timestamp) {
    if (!timestamp) {
        return null;
    }

    return new Date(timestamp).toISOString().split(".")[0] + "Z";
}

function isValidURL(str) {
    const pattern = new RegExp("^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$", "i"); // fragment locator
    return !!pattern.test(str);
}

module.exports = {
    base64UrlEncode,
    base64UrlDecode,
    base58Decode,

    dateTimeFormatter,
    isValidURL
};