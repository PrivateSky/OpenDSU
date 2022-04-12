const openDSU = require("opendsu");

errorTypes = {
  "UNKNOWN": {
    errorCode: 0,
    message: "Unknown error",
    getDetails: function (data) {
      return [{
        errorType: this.errorCode,
        errorMessage: this.message,
        errorDetails: "",
        errorField: data
      }]
    }
  },
  "INVALID_MESSAGE_FORMAT": {
    errorCode: 1,
    message: "Invalid message format",
    getDetails: function (data) {
      return data.map(item => {
        return {
          errorType: this.errorCode,
          errorMessage: this.message,
          errorDetails: `${item.field} - ${item.message}`,
          errorField: item.field
        }
      })
    }
  },
  "DB_OPERATION_FAIL": {
    errorCode: 2,
    message: "Database operation failed",
    getDetails: function (data) {
      return [
        {
          errorType: this.errorCode,
          errorMessage: this.message,
          errorDetails: "Missing from the wallet database or database is corrupted",
          errorField: data
        }
      ]
    }
  },
  "MESSAGE_IS_NOT_AN_OBJECT": {
    errorCode: 3,
    message: "Message is not an Object",
    getDetails: function (data) {
      return data.map(item => {
        return {
          errorType: this.errorCode,
          errorMessage: this.message,
          errorDetails: item.detailsMessage,
          errorField: "unknown"
        }
      })
    }
  },
  "DIGESTING_MESSAGES": {
    errorCode: 4,
    message: "Mapping Engine is digesting messages for the moment",
    getDetails: function (data) {
      return [{
        errorType: this.errorCode,
        errorMessage: this.message,
        errorDetails: "",
        errorField: "unknown"
      }]
    }
  },
  "MISSING_MAPPING": {
    errorCode: 5,
    message: "Not able to digest message due to missing mapping",
    getDetails: function (data) {
      return [{
        errorType: this.errorCode,
        errorMessage: this.message,
        errorDetails: "",
        errorField: "unknown"
      }]
    }
  },
  "MAPPING_ERROR": {
    errorCode: 6,
    message: "Caught error during mapping",
    getDetails: function (data) {
      return [{
        errorType: this.errorCode,
        errorMessage: this.message,
        errorDetails: "",
        errorField: "unknown"
      }]
    }
  }
}

function getErrorCodes() {
  let errCodes = Object.values(errorTypes).map(item => {
    return item.errorCode
  });
  return errCodes;
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

function addNewErrorType(key, code, message, detailsFn) {
  errorTypes[key] = {
    errorCode: code,
    message: message,
    getDetails: detailsFn || function (data) {
      return [{
        errorType: this.errorCode,
        errorMessage: this.message,
        errorDetails: "",
        errorField: data || "unknown"
      }]
    }
  }

}
function setErrorMessage(key, message){
  errorTypes[key].message = message;
}

module.exports = {
  errorTypes,
  newCustomError,
  getErrorKeyByCode,
  getErrorKeyByMessage,
  setErrorMessage,
  addNewErrorType
}
