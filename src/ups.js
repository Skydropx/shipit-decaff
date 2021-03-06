/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {Builder, Parser} = require('xml2js');
const request = require('request');
const moment = require('moment-timezone');
const {titleCase, upperCaseFirst, lowerCase} = require('change-case');
const {ShipperClient} = require('./shipper');

var UpsClient = (function() {
  let STATUS_MAP = undefined;
  UpsClient = class UpsClient extends ShipperClient {
    static initClass() {
  
      STATUS_MAP = {
        'D': ShipperClient.STATUS_TYPES.DELIVERED,
        'P': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'M': ShipperClient.STATUS_TYPES.SHIPPING
      };
    }

    constructor({licenseNumber, userId, password}, options) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { this; }).toString();
        let thisName = thisFn.slice(thisFn.indexOf('{') + 1, thisFn.indexOf(';')).trim();
        eval(`${thisName} = this;`);
      }
      this.licenseNumber = licenseNumber;
      this.userId = userId;
      this.password = password;
      this.options = options;
      super(...arguments);
      this.parser = new Parser();
      this.builder = new Builder({renderOpts: {pretty: false}});
    }

    generateRequest(trk, reference) {
      if (reference == null) { reference = 'n/a'; }
      const accessRequest = this.builder.buildObject({
        'AccessRequest': {
          'AccessLicenseNumber': this.licenseNumber,
          'UserId': this.userId,
          'Password': this.password
        }
      });

      const trackRequest = this.builder.buildObject({
        'TrackRequest': {
          'Request': {
            'TransactionReference': { 'CustomerContext': reference
          },
            'RequestAction': 'track',
            'RequestOption': 3
          },
          'TrackingNumber': trk
        }
      });

      return `${accessRequest}${trackRequest}`;
    }

    validateResponse(response, cb) {
      const handleResponse = function(xmlErr, trackResult) {
        let errorMsg, shipment;
        if ((xmlErr != null) || (trackResult == null)) { return cb(xmlErr); }
        const responseStatus = __guard__(__guard__(__guard__(trackResult['TrackResponse'] != null ? trackResult['TrackResponse']['Response'] : undefined, x2 => x2[0]), x1 => x1['ResponseStatusDescription']), x => x[0]);
        if (responseStatus !== 'Success') {
          const error = __guard__(__guard__(__guard__(__guard__(__guard__(trackResult['TrackResponse'] != null ? trackResult['TrackResponse']['Response'] : undefined, x7 => x7[0]), x6 => x6['Error']), x5 => x5[0]), x4 => x4['ErrorDescription']), x3 => x3[0]);
          errorMsg = error || "unknown error";
          shipment = null;
        } else {
          shipment = trackResult['TrackResponse']['Shipment'] != null ? trackResult['TrackResponse']['Shipment'][0] : undefined;
          if (shipment == null) { errorMsg = "missing shipment data"; }
        }
        if (errorMsg != null) { return cb(errorMsg); }
        return cb(null, shipment);
      };
      this.parser.reset();
      return this.parser.parseString(response, handleResponse);
    }

    getEta(shipment) {
      return this.presentTimestamp(__guard__(__guard__(shipment['Package'] != null ? shipment['Package'][0] : undefined, x1 => x1['RescheduledDeliveryDate']), x => x[0]) || (shipment['ScheduledDeliveryDate'] != null ? shipment['ScheduledDeliveryDate'][0] : undefined));
    }

    getService(shipment) {
      let service;
      if (service = __guard__(__guard__(shipment['Service'] != null ? shipment['Service'][0] : undefined, x1 => x1['Description']), x => x[0])) {
        return titleCase(service);
      }
    }

    getWeight(shipment) {
      let weightData;
      let weight = null;
      if (weightData = __guard__(__guard__(shipment['Package'] != null ? shipment['Package'][0] : undefined, x1 => x1['PackageWeight']), x => x[0])) {
        let units;
        weight = weightData['Weight'] != null ? weightData['Weight'][0] : undefined;
        if ((weight != null) && (units = __guard__(__guard__(weightData['UnitOfMeasurement'] != null ? weightData['UnitOfMeasurement'][0] : undefined, x3 => x3['Code']), x2 => x2[0]))) {
          weight = `${weight} ${units}`;
        }
      }
      return weight;
    }

    presentTimestamp(dateString, timeString) {
      if (dateString == null) { return; }
      if (timeString == null) { timeString = '00:00:00'; }
      const formatSpec = 'YYYYMMDD HHmmss ZZ';
      return moment(`${dateString} ${timeString} +0000`, formatSpec).toDate();
    }

    presentAddress(rawAddress) {
      if (!rawAddress) { return; }
      const city = rawAddress['City'] != null ? rawAddress['City'][0] : undefined;
      const stateCode = rawAddress['StateProvinceCode'] != null ? rawAddress['StateProvinceCode'][0] : undefined;
      const countryCode = rawAddress['CountryCode'] != null ? rawAddress['CountryCode'][0] : undefined;
      const postalCode = rawAddress['PostalCode'] != null ? rawAddress['PostalCode'][0] : undefined;
      return this.presentLocation({city, stateCode, countryCode, postalCode});
    }

    presentStatus(status) {
      if (status == null) { return ShipperClient.STATUS_TYPES.UNKNOWN; }

      const statusType = __guard__(__guard__(status['StatusType'] != null ? status['StatusType'][0] : undefined, x1 => x1['Code']), x => x[0]);
      const statusCode = __guard__(__guard__(status['StatusCode'] != null ? status['StatusCode'][0] : undefined, x3 => x3['Code']), x2 => x2[0]);
      if (STATUS_MAP[statusType] != null) { return STATUS_MAP[statusType]; }

      switch (statusType) {
        case 'I': switch (statusCode) {
          case 'OF': return ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY;
          default: return ShipperClient.STATUS_TYPES.EN_ROUTE;
        }
        case 'X': switch (statusCode) {
          case 'U2': return ShipperClient.STATUS_TYPES.EN_ROUTE;
          default: return ShipperClient.STATUS_TYPES.DELAYED;
        }
        default:
          return ShipperClient.STATUS_TYPES.UNKNOWN;
      }
    }

    getDestination(shipment) {
      return this.presentAddress(__guard__(__guard__(shipment['ShipTo'] != null ? shipment['ShipTo'][0] : undefined, x1 => x1['Address']), x => x[0]));
    }

    getActivitiesAndStatus(shipment) {
      const activities = [];
      let status = null;
      const rawActivities = __guard__(__guard__(shipment != null ? shipment['Package'] : undefined, x1 => x1[0]), x => x['Activity']);
      for (let rawActivity of Array.from(rawActivities || [])) {
        const location = this.presentAddress(__guard__(__guard__(rawActivity['ActivityLocation'] != null ? rawActivity['ActivityLocation'][0] : undefined, x3 => x3['Address']), x2 => x2[0]));
        const timestamp = this.presentTimestamp(rawActivity['Date'] != null ? rawActivity['Date'][0] : undefined, rawActivity['Time'] != null ? rawActivity['Time'][0] : undefined);
        const lastStatus = rawActivity['Status'] != null ? rawActivity['Status'][0] : undefined;
        let details = __guard__(__guard__(__guard__(lastStatus != null ? lastStatus['StatusType'] : undefined, x6 => x6[0]), x5 => x5['Description']), x4 => x4[0]);
        if ((details != null) && (timestamp != null)) {
          var statusObj;
          details = upperCaseFirst(lowerCase(details));
          const activity = {timestamp, location, details};
          if (statusObj = rawActivity['Status'] != null ? rawActivity['Status'][0] : undefined) {
            activity.statusType = __guard__(__guard__(statusObj['StatusType'] != null ? statusObj['StatusType'][0] : undefined, x8 => x8['Code']), x7 => x7[0]);
            activity.statusCode = __guard__(__guard__(statusObj['StatusCode'] != null ? statusObj['StatusCode'][0] : undefined, x10 => x10['Code']), x9 => x9[0]);
          }
          activities.push(activity);
        }
        if (!status) {
          status = this.presentStatus(rawActivity['Status'] != null ? rawActivity['Status'][0] : undefined);
        }
      }
      return {activities, status};
    }

    requestOptions({trackingNumber, reference, test}) {
      const hostname = test ? 'wwwcie.ups.com' : 'www.ups.com';
      return {
        method: 'POST',
        uri: `https://${hostname}/ups.app/xml/Track`,
        body: this.generateRequest(trackingNumber, reference)
      };
    }
  };
  UpsClient.initClass();
  return UpsClient;
})();

module.exports = {UpsClient};


function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}