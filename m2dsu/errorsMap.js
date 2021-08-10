const openDSU = require("opendsu");

errorTypes = {
  "UNKNOWN": {
    errorCode: 0,
    message: "Unknown error",
    getDetails: function (data) {
      return {detailsMessage: ""}
    }
  },
  "INVALID_MESSAGE_FORMAT": {
    errorCode: 1,
    message: "Invalid message format",
    getDetails: function (data) {
      let errors = [];
      data.forEach(item => {
        errors.push({
          errorType: this.errorCode,
          errorMessage: this.message,
          errorDetails: `${item.field} - ${item.message}`
        })
      })
      return errors;
    }
  },
  "NOT_IMPLEMENTED": {
    errorCode: 2,
    message: "This case is not implemented",
    getDetails: function (data) {
      return {detailsMessage: "Missing from the wallet database or database is corrupted"}
    }
  },
  "MESSAGE_IS_NOT_AN_OBJECT": {
    errorCode: 3,
    message: "Message is not an Object",
    getDetails: function (data) {
      return {detailsMessage: ""}
    }
  },
  "DIGESTING_MESSAGES": {
    errorCode: 4,
    message: "Mapping Engine is digesting messages for the moment",
    getDetails: function (data) {
      return {detailsMessage: ""}
    }
  },
  "MISSING_MAPPING": {
    errorCode: 5,
    message: "Not able to digest message due to missing suitable mapping",
    getDetails: function (data) {
      return {detailsMessage: ""}
    }
  },
  "MAPPING_ERROR": {
    errorCode: 6,
    message: "Caught error during mapping",
    getDetails: function (data) {
      return {detailsMessage: ""}
    }
  },
  "PRODUCT_NOT_FOUND": {
    errorCode: 7,
    message: "Product not found",
    getDetails: function (data) {
      return {detailsMessage: ""}
    }
  },
  "BATCH_MISSING_PRODUCT": {
    errorCode: 8,
    message: "Fail to create a batch for a missing product",
    getDetails: function (data) {
      return {detailsMessage: ""}
    }
  },

}

function getErrorKeyByCode(errCode) {
  try {
    let errObj = Object.values(errorTypes).find(item => item.errorCode === errCode)
    if (errObj) {
      return errObj;
    }
  } catch (e) {

  }

  return errorTypes.UNKNOWN
}

function getErrorKeyByMessage(errMessage) {
  try {
    let errObj = Object.values(errorTypes).find(item => item.message === errMessage);
    if (errObj) {
      return errObj
    }
  } catch (e) {
    console.log('Could not find mapping for ', errMessage);
  }

  return errorTypes.UNKNOWN.defaultDetails.detailsMessage = errMessage;
}

function newCustomError(errorObj, detailsObj) {
  return createOpenDSUErrorWrapper(errorObj.message, null, {
    code: errorObj.errorCode,
    details: errorObj.getDetails(detailsObj)
  });
}

module.exports = {
  errorTypes,
  newCustomError,
  getErrorKeyByCode,
  getErrorKeyByMessage
}
