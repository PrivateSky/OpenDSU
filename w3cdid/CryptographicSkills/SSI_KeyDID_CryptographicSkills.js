const didDocumentsFactory = require("../didDocumentsFactory");
const didMethodsNames = require("../didMethodsNames");
function SSI_KeyDID_CryptographicSkills() {
    const CryptoGraphicSkillsMixin = require("./CryptographicSkillsMixin");
    CryptoGraphicSkillsMixin(this);

    this.createDID_Document = (seedSSI) => {
        return didDocumentsFactory.createDID_Document(didMethodsNames.SSI_KEY_SUBTYPE, seedSSI);
    }
}

module.exports = SSI_KeyDID_CryptographicSkills;