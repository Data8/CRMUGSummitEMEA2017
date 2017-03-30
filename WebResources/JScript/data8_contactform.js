
toggleSections = function () {
    toggleSection('data8_drinkscoffee', 'COFFEE_SECTION');
    toggleSection('data8_drinkstea', 'TEA_SECTION');
}

toggleSection = function (controllingAttribute, targetSection) {
    var checked = Xrm.Page.getAttribute(controllingAttribute).getValue();
    var section = Xrm.Page.ui.tabs.get(0).sections.get(targetSection);

    section.setVisible(checked);
}

checkJobTitleRequired = function (minLength) {
    var value = Xrm.Page.getAttribute('jobtitle').getValue();
    if (value === '.' || (value && minLength && value.length < minLength)) {
        Xrm.Page.getControl('jobtitle').setNotification('You must provide a value for Job Title.', 'REQD');
    }
    else {
        Xrm.Page.getControl('jobtitle').clearNotification('REQD');
    }
}

checkRequiredGeneric = function (context, minLength) {
    var attr = context.getEventSource();
    var value = attr.getValue();
    if (value === '.' || (value && minLength && value.length < minLength)) {
        attr.controls.forEach(function (control) {
            control.setNotification('You must provide a value for ' + control.getLabel() + '.', 'REQD');
        });
    }
    else {
        attr.controls.forEach(function (control) {
            control.clearNotification('REQD');
        });
    }
}

attachCheckRequired = function (minLength) {
    Xrm.Page.data.entity.attributes.forEach(function (attr) {
        if (attr.getRequiredLevel() === 'required') {
            attr.addOnChange(function (context) { checkRequiredGeneric(context, minLength); });
        }
    });
}
