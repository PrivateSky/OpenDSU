const didDocumentsFactory = require("../didDocumentsFactory");
const didMethodsNames = require("../didMethodsNames");
function SReadDID_CryptographicSkills() {
    const CryptoGraphicSkillsMixin = require("./CryptographicSkillsMixin");
    CryptoGraphicSkillsMixin(this);

    this.createDID_Document = (seedSSI) => {
        return didDocumentsFactory.createDID_Document(didMethodsNames.S_READ_SUBTYPE, seedSSI);
    }
}

module.exports = SReadDID_CryptographicSkills;