function base64UrlEncode(source) {
    const buffer = $$.Buffer.from(source, 'utf-8');
    const base64EncodedString = buffer.toString('base64');
    console.log(base64EncodedString);
    return base64EncodedString;
}

function base64UrlDecode(source, keepAsBuffer = false) {
    const buffer = $$.Buffer.from(source, 'base64');
    if (keepAsBuffer) {
        return buffer;
    }

    const base64decodedString = buffer.toString('utf-8');
    console.log(base64decodedString);
    return base64decodedString;
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

    dateTimeFormatter,
    isValidURL
};