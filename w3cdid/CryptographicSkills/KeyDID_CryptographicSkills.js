const didDocumentsFactory = require("../didDocumentsFactory");
const didMethodsNames = require("../didMethodsNames");
function KeyDID_CryptographicSkills() {
    const CryptoGraphicSkillsMixin = require("./CryptographicSkillsMixin");
    CryptoGraphicSkillsMixin(this);

    this.createDID_Document = () => {
        return didDocumentsFactory.createDID_Document(didMethodsNames.KEY_SUBTYPE);
    }
}

module.exports = KeyDID_CryptographicSkills;