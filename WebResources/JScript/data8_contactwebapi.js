Sdk.checkExistingOrders = function () {
    Sdk.retrieveVersion()
        .then(function () {
            return Sdk.retrieveSalesOrders()
        })
        .then(function (orders) {
            return Sdk.processSalesOrders(orders);
        });
};

Sdk.retrieveSalesOrders = function () {
    return new Promise(function (resolve, reject) {
        Sdk.request("GET", "/salesorders?$select=salesorderid&$top=1&$orderby=createdon desc&$filter=customerid_contact/contactid eq " + Xrm.Page.data.entity.getId().replace('{', '').replace('}', ''))
            .then(function (request) {
                try {
                    var salesOrders = JSON.parse(request.response).value;

                    resolve(salesOrders);
                } catch (err) {
                    reject(new Error("Error processing sales orders: " + err.message));
                }
            }).catch(function (err) {
                reject(new Error("Error retrieving sales orders: " + err.message));
            })
    });
};

Sdk.processSalesOrders = function (orders) {
    return new Promise(function (resolve, reject) {
        if (orders.length === 0) {
            resolve();
            return;
        }

        Sdk.request("GET", "/salesorderdetails?$select=salesorderdetailid&$expand=productid($select=productid,productnumber)&$filter=salesorderid/salesorderid eq " + orders[0].salesorderid)
            .then(function (request) {
                try {
                    var orderDetails = JSON.parse(request.response).value;

                    for (var i = 0; i < orderDetails.length; i++) {
                        if (orderDetails[i].productid.productnumber === "Tea" && !Xrm.Page.getAttribute("data8_drinkstea").getValue()) {
                            var teaAttribute = Xrm.Page.getAttribute("data8_drinkstea");
							var teaControl = teaAttribute.controls.get(0);
                            var actionCollection = {
                                message: 'Set Drinks Tea to Yes?',
                                actions: null
                            };

                            actionCollection.actions = [function () {
                                teaAttribute.setValue(true);
                                teaControl.clearNotification('drinkstea');
                            }];

                            teaControl.addNotification({
                                messages: ['Does drink tea'],
                                notificationLevel: 'RECOMMENDATION',
                                uniqueId: 'drinkstea',
                                actions: [actionCollection]
                            });
                            break;
                        }
                    }
                } catch (err) {
                    reject(new Error("Error processing sales order details: " + err.message));
                }
            })
            .catch(function (err) {
                reject(new Error("Error retrieving sales order details: " + err.message));
            })
    });
};

Sdk.duplicateLastOrder = function () {
    Sdk.retrieveVersion()
        .then(function () {
            return Sdk.duplicateOrder();
        });
};

Sdk.duplicateOrder = function () {
    return new Promise(function (resolve, reject) {
        Sdk.request(
            "POST",
            "/contacts(" + Xrm.Page.data.entity.getId().replace('{', '').replace('}', '') + ")/Microsoft.Dynamics.CRM.data8_CreateRegularOrder",
            {})
            .then(function (request) {
                try {
                    var newOrderRef = JSON.parse(request.response);
                    Xrm.Utility.openEntityForm("salesorder", newOrderRef.salesorderid);
                } catch (err) {
                    reject(new Error("Error processing sales order details: " + err.message));
                }
            })
            .catch(function (err) {
                reject(new Error("Error retrieving sales order details: " + err.message));
            })
    });
};