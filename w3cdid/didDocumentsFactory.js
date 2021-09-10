const methodsNames = require("./didMethodsNames");
const createNameDIDDocument = require("./didssi/NameDID_Document").initiateDIDDocument;
const createGroupDID_Document = require("./didssi/GroupDID_Document").initiateDIDDocument;
const createSReadDID_Document = require("./didssi/SReadDID_Document").initiateDIDDocument;
const createSSI_KeyDID_Document = require("./didssi/KeyDID_Document").initiateDIDDocument;
const createKeyDID_Document = require("./w3cdids/KeyDID_Document").initiateDIDDocument;

const didsConstructors = {};

const registerDID_Document_Constructor = (didMethod, didConstructor) => {
    didsConstructors[didMethod] = didConstructor;
}

const createDID_Document = (didMethod, ...args) => {
    return didsConstructors[didMethod](...args);
}

registerDID_Document_Constructor(methodsNames.NAME_SUBTYPE, createNameDIDDocument);
registerDID_Document_Constructor(methodsNames.GROUP_METHOD_NAME, createGroupDID_Document);
registerDID_Document_Constructor(methodsNames.S_READ_SUBTYPE, createSReadDID_Document);
registerDID_Document_Constructor(methodsNames.SSI_KEY_SUBTYPE, createSSI_KeyDID_Document);
registerDID_Document_Constructor(methodsNames.KEY_SUBTYPE, createKeyDID_Document);

module.exports = {
    registerDID_Document_Constructor,
    createDID_Document
}