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
const {find} = require('underscore');
const moment = require('moment-timezone');
const {titleCase} = require('change-case');
const {ShipperClient} = require('./shipper');

var LasershipClient = (function() {
  let STATUS_MAP = undefined;
  LasershipClient = class LasershipClient extends ShipperClient {
    static initClass() {
  
      STATUS_MAP = {
        'Released': ShipperClient.STATUS_TYPES.DELIVERED,
        'Delivered': ShipperClient.STATUS_TYPES.DELIVERED,
        'OutForDelivery': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
        'Arrived': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'Received': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'OrderReceived': ShipperClient.STATUS_TYPES.SHIPPING,
        'OrderCreated': ShipperClient.STATUS_TYPES.SHIPPING
      };
    }

    constructor(options) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { this; }).toString();
        let thisName = thisFn.slice(thisFn.indexOf('{') + 1, thisFn.indexOf(';')).trim();
        eval(`${thisName} = this;`);
      }
      this.options = options;
      super(...arguments);
    }

    validateResponse(response, cb) {
      response = JSON.parse(response);
      if (response['Events'] == null) { return cb({error: 'missing events'}); }
      return cb(null, response);
    }

    presentAddress(address) {
      const city = address['City'];
      const stateCode = address['State'];
      const postalCode = address['PostalCode'];
      const countryCode = address['Country'];
      return this.presentLocation({city, stateCode, countryCode, postalCode});
    }

    presentStatus(eventType) {
      if (eventType != null) { return STATUS_MAP[eventType]; }
    }

    getActivitiesAndStatus(shipment) {
      const activities = [];
      let status = null;
      const rawActivities = shipment != null ? shipment['Events'] : undefined;
      for (let rawActivity of Array.from(rawActivities || [])) {
        var timestamp;
        const location = this.presentAddress(rawActivity);
        const dateTime = rawActivity != null ? rawActivity['DateTime'] : undefined;
        if (dateTime != null) { timestamp = moment(`${dateTime}Z`).toDate(); }
        const details = rawActivity != null ? rawActivity['EventShortText'] : undefined;
        if ((details != null) && (timestamp != null)) {
          const activity = {timestamp, location, details};
          activities.push(activity);
        }
        if (!status) {
          status = this.presentStatus(rawActivity != null ? rawActivity['EventType'] : undefined);
        }
      }
      return {activities, status};
    }

    getEta(shipment) {
      if ((shipment != null ? shipment['EstimatedDeliveryDate'] : undefined) == null) { return; }
      return moment(`${shipment['EstimatedDeliveryDate']}T00:00:00Z`).toDate();
    }

    getService(shipment) {}

    getWeight(shipment) {
      if (!__guard__(shipment != null ? shipment['Pieces'] : undefined, x => x.length)) { return; }
      const piece = shipment['Pieces'][0];
      let weight = `${piece['Weight']}`;
      const units = piece['WeightUnit'];
      if (units != null) { weight = `${weight} ${units}`; }
      return weight;
    }

    getDestination(shipment) {
      const destination = shipment != null ? shipment['Destination'] : undefined;
      if (destination == null) { return; }
      return this.presentAddress(destination);
    }

    requestOptions({trackingNumber}) {
      return {
        method: 'GET',
        uri: `http://www.lasership.com/track/${trackingNumber}/json`
      };
    }
  };
  LasershipClient.initClass();
  return LasershipClient;
})();


module.exports = {LasershipClient};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}