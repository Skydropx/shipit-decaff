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
const {Parser} = require('xml2js');
const moment = require('moment-timezone');
const {titleCase, upperCaseFirst, lowerCase} = require('change-case');
const {ShipperClient} = require('./shipper');

var DhlClient = (function() {
  let STATUS_MAP = undefined;
  DhlClient = class DhlClient extends ShipperClient {
    static initClass() {
  
      STATUS_MAP = {
        'AD': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'AF': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'AR': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'BA': ShipperClient.STATUS_TYPES.DELAYED,
        'BN': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'BR': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'CA': ShipperClient.STATUS_TYPES.DELAYED,
        'CC': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
        'CD': ShipperClient.STATUS_TYPES.DELAYED,
        'CM': ShipperClient.STATUS_TYPES.DELAYED,
        'CR': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'CS': ShipperClient.STATUS_TYPES.DELAYED,
        'DD': ShipperClient.STATUS_TYPES.DELIVERED,
        'DF': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'DS': ShipperClient.STATUS_TYPES.DELAYED,
        'FD': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'HP': ShipperClient.STATUS_TYPES.DELAYED,
        'IC': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'MC': ShipperClient.STATUS_TYPES.DELAYED,
        'MD': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'MS': ShipperClient.STATUS_TYPES.DELAYED,
        'ND': ShipperClient.STATUS_TYPES.DELAYED,
        'NH': ShipperClient.STATUS_TYPES.DELAYED,
        'OH': ShipperClient.STATUS_TYPES.DELAYED,
        'OK': ShipperClient.STATUS_TYPES.DELIVERED,
        'PD': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'PL': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'PO': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'PU': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'RD': ShipperClient.STATUS_TYPES.DELAYED,
        'RR': ShipperClient.STATUS_TYPES.DELAYED,
        'RT': ShipperClient.STATUS_TYPES.DELAYED,
        'SA': ShipperClient.STATUS_TYPES.SHIPPING,
        'SC': ShipperClient.STATUS_TYPES.DELAYED,
        'SS': ShipperClient.STATUS_TYPES.DELAYED,
        'TD': ShipperClient.STATUS_TYPES.DELAYED,
        'TP': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
        'TR': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'UD': ShipperClient.STATUS_TYPES.DELAYED,
        'WC': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
        'WX': ShipperClient.STATUS_TYPES.DELAYED
      };
    }

    constructor({userId, password}, options) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { this; }).toString();
        let thisName = thisFn.slice(thisFn.indexOf('{') + 1, thisFn.indexOf(';')).trim();
        eval(`${thisName} = this;`);
      }
      this.userId = userId;
      this.password = password;
      this.options = options;
      super(...arguments);
      this.parser = new Parser();
    }

    generateRequest(trk) {
      return `\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<req:KnownTrackingRequest xmlns:req="http://www.dhl.com">
  <Request>
    <ServiceHeader>
      <SiteID>${this.userId}</SiteID>
      <Password>${this.password}</Password>
    </ServiceHeader>
  </Request>
  <LanguageCode>en</LanguageCode>
  <AWBNumber>${trk}</AWBNumber>
  <LevelOfDetails>ALL_CHECK_POINTS</LevelOfDetails>
</req:KnownTrackingRequest>\
`;
    }

    validateResponse(response, cb) {
      const handleResponse = function(xmlErr, trackResult) {
        if ((xmlErr != null) || (trackResult == null)) { return cb(xmlErr); }
        const trackingResponse = trackResult['req:TrackingResponse'];
        if (trackingResponse == null) { return cb({error: 'no tracking response'}); }
        const awbInfo = trackingResponse['AWBInfo'] != null ? trackingResponse['AWBInfo'][0] : undefined;
        if (awbInfo == null) { return cb({error: 'no AWBInfo in response'}); }
        const shipment = awbInfo['ShipmentInfo'] != null ? awbInfo['ShipmentInfo'][0] : undefined;
        if (shipment == null) { return cb({error: 'could not find shipment'}); }
        const trackStatus = awbInfo['Status'] != null ? awbInfo['Status'][0] : undefined;
        const statusCode = trackStatus != null ? trackStatus['ActionStatus'] : undefined;
        if (statusCode.toString() !== 'success') { return cb({error: `unexpected track status code=${statusCode}`}); }
        return cb(null, shipment);
      };
      this.parser.reset();
      return this.parser.parseString(response, handleResponse);
    }

    getEta(shipment) {}

    getService(shipment) {}

    getWeight(shipment) {
      const weight = shipment['Weight'] != null ? shipment['Weight'][0] : undefined;
      if (weight != null) { return `${weight} LB`; }
    }

    presentTimestamp(dateString, timeString) {
      if (dateString == null) { return; }
      if (timeString == null) { timeString = '00:00'; }
      const inputString = `${dateString} ${timeString} +0000`;
      return moment(inputString).toDate();
    }

    presentAddress(rawAddress) {
      let city, countryCode, stateCode;
      if (rawAddress == null) { return; }
      const firstComma = rawAddress.indexOf(',');
      const firstDash = rawAddress.indexOf('-', firstComma);
      if ((firstComma > -1) && (firstDash > -1)) {
        city = rawAddress.substring(0, firstComma).trim();
        stateCode = rawAddress.substring(firstComma+1, firstDash).trim();
        countryCode = rawAddress.substring(firstDash+1).trim();
      } else if ((firstComma < 0) && (firstDash > -1)) {
        city = rawAddress.substring(0, firstDash).trim();
        stateCode = null;
        countryCode = rawAddress.substring(firstDash+1).trim();
      } else {
        return rawAddress;
      }
      city = city.replace(' HUB', '');
      city = city.replace(' GATEWAY', '');
      return this.presentLocation({city, stateCode, countryCode});
    }

    presentDetails(rawAddress, rawDetails) {
      if (rawDetails == null) { return; }
      if (rawAddress == null) { return rawDetails; }
      return rawDetails.replace(/\s\s+/, ' ').trim().replace(new RegExp(`(?: at| in)? ${rawAddress.trim()}$`), '');
    }

    presentStatus(status) {
      return STATUS_MAP[status] || ShipperClient.STATUS_TYPES.UNKNOWN;
    }

    getActivitiesAndStatus(shipment) {
      const activities = [];
      let status = null;
      let rawActivities = shipment['ShipmentEvent'];
      if (rawActivities == null) { rawActivities = []; }
      rawActivities.reverse();
      for (let rawActivity of Array.from(rawActivities || [])) {
        const rawLocation = __guard__(__guard__(rawActivity['ServiceArea'] != null ? rawActivity['ServiceArea'][0] : undefined, x1 => x1['Description']), x => x[0]);
        const location = this.presentAddress(rawLocation);
        const timestamp = this.presentTimestamp(rawActivity['Date'] != null ? rawActivity['Date'][0] : undefined, rawActivity['Time'] != null ? rawActivity['Time'][0] : undefined);
        let details = this.presentDetails(rawLocation, __guard__(__guard__(rawActivity['ServiceEvent'] != null ? rawActivity['ServiceEvent'][0] : undefined, x3 => x3['Description']), x2 => x2[0]));
        if ((details != null) && (timestamp != null)) {
          details = details.slice(-1) === '.' ? details.slice(0, +-2 + 1 || undefined) : details;
          const activity = {timestamp, location, details};
          activities.push(activity);
        }
        if (!status) {
          status = this.presentStatus(__guard__(__guard__(rawActivity['ServiceEvent'] != null ? rawActivity['ServiceEvent'][0] : undefined, x5 => x5['EventCode']), x4 => x4[0]));
        }
      }
      return {activities, status};
    }

    getDestination(shipment) {
      const destination = __guard__(__guard__(shipment['DestinationServiceArea'] != null ? shipment['DestinationServiceArea'][0] : undefined, x1 => x1['Description']), x => x[0]);
      if (destination == null) { return; }
      return this.presentAddress(destination);
    }

    requestOptions({trackingNumber}) {
      return {
        method: 'POST',
        uri: 'http://xmlpi-ea.dhl.com/XMLShippingServlet',
        body: this.generateRequest(trackingNumber)
      };
    }
  };
  DhlClient.initClass();
  return DhlClient;
})();

module.exports = {DhlClient};


function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}