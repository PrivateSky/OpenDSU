const didDocumentsFactory = require("../didDocumentsFactory");
const didMethodsNames = require("../didMethodsNames");
function GroupDID_CryptographicSkills() {
    const CryptoGraphicSkillsMixin = require("./CryptographicSkillsMixin");
    CryptoGraphicSkillsMixin(this);

    this.createDID_Document = (domain, groupName) => {
        return didDocumentsFactory.createDID_Document(didMethodsNames.GROUP_METHOD_NAME, domain, groupName);
    }
}

module.exports = GroupDID_CryptographicSkills;