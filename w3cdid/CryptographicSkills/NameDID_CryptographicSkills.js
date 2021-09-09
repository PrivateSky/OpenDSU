const didDocumentsFactory = require("../didDocumentsFactory");
const didMethodsNames = require("../didMethodsNames");
function NameDID_CryptographicSkills() {
    const CryptoGraphicSkillsMixin = require("./CryptographicSkillsMixin");
    CryptoGraphicSkillsMixin(this);

    this.createDID_Document = (domain, name) => {
        return didDocumentsFactory.createDID_Document(didMethodsNames.NAME_SUBTYPE, domain, name);
    }
}

module.exports = NameDID_CryptographicSkills;