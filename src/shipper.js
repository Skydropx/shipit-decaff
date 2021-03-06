/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {titleCase} = require('change-case');
const request = require('request');
const moment = require('moment-timezone');

class ShipperClient {
  static initClass() {
  
    this.STATUS_TYPES = {
      UNKNOWN: 0,
      SHIPPING: 1,
      EN_ROUTE: 2,
      OUT_FOR_DELIVERY: 3,
      DELIVERED: 4,
      DELAYED: 5
    };
  }

  presentPostalCode(rawCode) {
    rawCode = rawCode != null ? rawCode.trim() : undefined;
    if (/^\d{9}$/.test(rawCode)) { return `${rawCode.slice(0, 5)}-${rawCode.slice(5)}`; } else { return rawCode; }
  }

  presentLocationString(location) {
    const newFields = [];
    for (let field of Array.from((location != null ? location.split(',') : undefined) || [])) {
      field = field.trim();
      if (field.length > 2) { field = titleCase(field); }
      newFields.push(field);
    }

    return newFields.join(', ');
  }

  presentLocation({city, stateCode, countryCode, postalCode}) {
    let address;
    if (city != null ? city.length : undefined) { city = titleCase(city); }
    if (stateCode != null ? stateCode.length : undefined) {
      stateCode = stateCode.trim();
      if (stateCode.length > 3) {
        stateCode = titleCase(stateCode);
      }
      if (city != null ? city.length : undefined) {
        city = city.trim();
        address = `${city}, ${stateCode}`;
      } else {
        address = stateCode;
      }
    } else {
      address = city;
    }
    postalCode = this.presentPostalCode(postalCode);
    if (countryCode != null ? countryCode.length : undefined) {
      countryCode = countryCode.trim();
      if (countryCode.length > 3) {
        countryCode = titleCase(countryCode);
      }
      if ((address != null ? address.length : undefined)) {
        address = countryCode !== 'US' ? `${address}, ${countryCode}` : address;
      } else {
        address = countryCode;
      }
    }
    if (postalCode != null ? postalCode.length : undefined) {
      address = (address != null) ? `${address} ${postalCode}` : postalCode;
    }
    return address;
  }

  presentResponse(response, requestData, cb) {
    return this.validateResponse(response, (err, shipment) => {
      let adjustedEta;
      if ((err != null) || (shipment == null)) { return cb(err); }
      const {activities, status} = this.getActivitiesAndStatus(shipment);
      const eta = this.getEta(shipment);
      if (eta != null) { adjustedEta = moment(eta).utc().format().replace(/T00:00:00/, 'T23:59:59'); }
      if (adjustedEta != null) { adjustedEta = moment(adjustedEta).toDate(); }
      const presentedResponse = {
        eta: adjustedEta,
        service: this.getService(shipment),
        weight: this.getWeight(shipment),
        destination: this.getDestination(shipment),
        activities,
        status
      };
      if ((requestData != null ? requestData.raw : undefined) != null) {
        if (requestData.raw) { presentedResponse.raw = response; }
      } else {
        if (this.options != null ? this.options.raw : undefined) { presentedResponse.raw = response; }
      }
      presentedResponse.request = requestData;
      return cb(null, presentedResponse);
    });
  }

  requestData(requestData, cb) {
    const opts = this.requestOptions(requestData);
    opts.timeout = (requestData != null ? requestData.timeout : undefined) || (this.options != null ? this.options.timeout : undefined);
    return request(opts, (err, response, body) => {
      if ((body == null) || (err != null)) { return cb(err); }
      if (response.statusCode !== 200) { return cb(`response status ${response.statusCode}`); }
      return this.presentResponse(body, requestData, cb);
    });
  }
}
ShipperClient.initClass();

module.exports = {ShipperClient};
