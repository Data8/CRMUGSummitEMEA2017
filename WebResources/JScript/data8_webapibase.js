"use strict";
var Sdk = window.Sdk || {};

/**
 * @function getClientUrl
 * @description Get the client URL.
 * @returns {string} The client URL.
 */
Sdk.getClientUrl = function () {
    var context;
    // GetGlobalContext defined by including reference to 
    // ClientGlobalContext.js.aspx in the HTML page.
    if (typeof GetGlobalContext != "undefined") {
        context = GetGlobalContext();
    } else {
        if (typeof Xrm != "undefined") {
            // Xrm.Page.context defined within the Xrm.Page object model for form scripts.
            context = Xrm.Page.context;
        } else {
            throw new Error("Context is not available.");
        }
    }
    return context.getClientUrl();

};

/**
 * An object instantiated to manage detecting the
 * Web API version in conjunction with the 
 * Sdk.retrieveVersion function
 */
Sdk.versionManager = new function () {
    //Start with base version
    var _webAPIMajorVersion = 8;
    var _webAPIMinorVersion = 0;
    //Use properties to increment version and provide WebAPIPath string used by Sdk.request;
    Object.defineProperties(this, {
        "WebAPIMajorVersion": {
            get: function () {
                return _webAPIMajorVersion;
            },
            set: function (value) {
                if (typeof value != "number") {
                    throw new Error("Sdk.versionManager.WebAPIMajorVersion property must be a number.")
                }
                _webAPIMajorVersion = parseInt(value, 10);
            }
        },
        "WebAPIMinorVersion": {
            get: function () {
                return _webAPIMinorVersion;
            },
            set: function (value) {
                if (isNaN(value)) {
                    throw new Error("Sdk.versionManager._webAPIMinorVersion property must be a number.")
                }
                _webAPIMinorVersion = parseInt(value, 10);
            }
        },
        "WebAPIPath": {
            get: function () {
                return "/api/data/v" + _webAPIMajorVersion + "." + _webAPIMinorVersion;
            }
        }
    })

}

/**
 * @function request
 * @description Generic helper function to handle basic XMLHttpRequest calls.
 * @param {string} action - The request action. String is case-sensitive.
 * @param {string} uri - An absolute or relative URI. Relative URI starts with a "/".
 * @param {object} data - An object representing an entity. Required for create and update actions.
 * @param {object} addHeader - An object with header and value properties to add to the request
 * @returns {Promise} - A Promise that returns either the request object or an error object.
 */
Sdk.request = function (action, uri, data, addHeader) {
    if (!RegExp(action, "g").test("POST PATCH PUT GET DELETE")) { // Expected action verbs.
        throw new Error("Sdk.request: action parameter must be one of the following: " +
            "POST, PATCH, PUT, GET, or DELETE.");
    }
    if (!typeof uri === "string") {
        throw new Error("Sdk.request: uri parameter must be a string.");
    }
    if ((RegExp(action, "g").test("POST PATCH PUT")) && (!data)) {
        throw new Error("Sdk.request: data parameter must not be null for operations that create or modify data.");
    }
    if (addHeader) {
        if (typeof addHeader.header != "string" || typeof addHeader.value != "string") {
            throw new Error("Sdk.request: addHeader parameter must have header and value properties that are strings.");
        }
    }

    // Construct a fully qualified URI if a relative URI is passed in.
    if (uri.charAt(0) === "/") {
        //This sample will try to use the latest version of the web API as detected by the 
        // Sdk.retrieveVersion function.
        uri = Sdk.getClientUrl() + Sdk.versionManager.WebAPIPath + uri;
    }

    return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();
        request.open(action, encodeURI(uri), true);
        request.setRequestHeader("OData-MaxVersion", "4.0");
        request.setRequestHeader("OData-Version", "4.0");
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        if (addHeader) {
            request.setRequestHeader(addHeader.header, addHeader.value);
        }
        request.onreadystatechange = function () {
            if (this.readyState === 4) {
                request.onreadystatechange = null;
                switch (this.status) {
                    case 200: // Operation success with content returned in response body.
                    case 201: // Create success. 
                    case 204: // Operation success with no content returned in response body.
                        resolve(this);
                        break;
                    default: // All other statuses are unexpected so are treated like errors.
                        var error;
                        try {
                            error = JSON.parse(request.response).error;
                        } catch (e) {
                            error = new Error("Unexpected Error");
                        }
                        reject(error);
                        break;
                }
            }
        };
        request.send(JSON.stringify(data));
    });
};

Sdk.retrieveVersion = function () {
    return new Promise(function (resolve, reject) {
        Sdk.request("GET", "/RetrieveVersion")
            .then(function (request) {
                try {
                    var RetrieveVersionResponse = JSON.parse(request.response);
                    var fullVersion = RetrieveVersionResponse.Version;
                    var versionData = fullVersion.split('.');
                    Sdk.versionManager.WebAPIMajorVersion = parseInt(versionData[0], 10);
                    Sdk.versionManager.WebAPIMinorVersion = parseInt(versionData[1], 10);
                    resolve();
                } catch (err) {
                    reject(new Error("Error processing version: " + err.message));
                }
            }).catch(function (err) {
                reject(new Error("Error retrieving version: " + err.message));
            });
    });
};