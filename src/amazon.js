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
const {load} = require('cheerio');
const moment = require('moment-timezone');
const request = require('request');
const {titleCase, upperCaseFirst, lowerCase, upperCase} = require('change-case');
const {ShipperClient} = require('./shipper');

var AmazonClient = (function() {
  let STATUS_MAP = undefined;
  let DAYS_OF_THE_WEEK = undefined;
  AmazonClient = class AmazonClient extends ShipperClient {
    static initClass() {
      STATUS_MAP = {};
  
      DAYS_OF_THE_WEEK = {};
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
      STATUS_MAP[ShipperClient.STATUS_TYPES.DELAYED] = ['delivery attempted'];
      STATUS_MAP[ShipperClient.STATUS_TYPES.DELIVERED] = ['delivered'];
      STATUS_MAP[ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY] = ['out for delivery'];

      STATUS_MAP[ShipperClient.STATUS_TYPES.SHIPPING] = [
        'in transit to carrier',
        'shipping soon'
      ];

      STATUS_MAP[ShipperClient.STATUS_TYPES.EN_ROUTE] = [
        'on the way',
        'package arrived',
        'package received',
        'shipment departed',
        'shipment arrived'
      ];

      DAYS_OF_THE_WEEK['SUNDAY'] = 0;
      DAYS_OF_THE_WEEK['MONDAY'] = 1;
      DAYS_OF_THE_WEEK['TUESDAY'] = 2;
      DAYS_OF_THE_WEEK['WEDNESDAY'] = 3;
      DAYS_OF_THE_WEEK['THURSDAY'] = 4;
      DAYS_OF_THE_WEEK['FRIDAY'] = 5;
      DAYS_OF_THE_WEEK['SATURDAY'] = 6;
      super(...arguments);
    }

    validateResponse(response, cb) {
      const $ = load(response, {normalizeWhitespace: true});
      const rightNow = __guard__(/<!-- navp-.* \((.*)\) --?>/.exec(response), x => x[1]);
      return cb(null, {$, rightNow});
    }

    getService() {}

    getWeight() {}

    getDestination(data) {
      if (data == null) { return; }
      const {$, rightNow} = data;
      const dest = $(".delivery-address").text();
      if (dest != null ? dest.length : undefined) { return this.presentLocationString(dest); }
    }

    getEta(data) {
      let matches, numDays, timeComponent;
      if (data == null) { return; }
      const {$, rightNow} = data;
      const container = $(".shipment-status-content").children('span');
      if (!container.length) { return; }
      let deliveryStatus = $(container[0]).text().trim();
      if (/delivered/i.test(deliveryStatus)) { return; }
      if (!/arriving/i.test(deliveryStatus)) { return; }
      if (/.* by .*/i.test(deliveryStatus)) {
        matches = deliveryStatus.match(/(.*) by (.*)/, 'i');
        deliveryStatus = matches[1];
        timeComponent = matches[2];
      }
      matches = deliveryStatus.match(/Arriving (.*)/, 'i');
      let dateComponentStr = matches != null ? matches[1] : undefined;
      if (/-/.test(dateComponentStr)) {
        dateComponentStr = __guard__(__guard__(dateComponentStr.split('-'), x1 => x1[1]), x => x.trim());
      }
      let dateComponent = moment(rightNow);
      if (/today/i.test(dateComponentStr)) {
        numDays = 0;
      } else if (/tomorrow/i.test(dateComponentStr)) {
        numDays = 1;
      } else if (/day/i.test(dateComponentStr)) {
        const nowDayVal = DAYS_OF_THE_WEEK[upperCase(moment(rightNow).format('dddd'))];
        const etaDayVal = DAYS_OF_THE_WEEK[upperCase(dateComponentStr)];
        if (etaDayVal > nowDayVal) {
          numDays = etaDayVal - nowDayVal;
        } else {
          numDays = 7 + (etaDayVal - nowDayVal);
        }
      } else {
        if (!/20\d{2}/.test(dateComponentStr)) { dateComponentStr += ', 2015'; }
        numDays = ((moment(dateComponentStr) - moment(rightNow)) / (1000 * 3600 * 24)) + 1;
      }
      dateComponent = moment(rightNow).add(numDays, 'days');
      if (timeComponent == null) { timeComponent = "11pm"; }
      timeComponent = upperCase(timeComponent);
      const etaString = `${dateComponent.format('YYYY-MM-DD')} ${timeComponent} +00:00`;
      return moment(etaString, 'YYYY-MM-DD HA Z').toDate();
    }

    presentStatus(details) {
      let status = null;
      for (let statusCode in STATUS_MAP) {
        const matchStrings = STATUS_MAP[statusCode];
        for (let text of Array.from(matchStrings)) {
          const regex = new RegExp(text, 'i');
          if (regex.test(lowerCase(details))) {
            status = statusCode;
            break;
          }
        }
        if (status != null) { break; }
      }
      if (status != null) { return parseInt(status, 10); }
    }

    getActivitiesAndStatus(data) {
      const activities = [];
      let status = null;
      if (data == null) { return {activities, status}; }
      const {$, rightNow} = data;
      status = this.presentStatus($(".latest-event-status").text());
      const rows = $("div[data-a-expander-name=event-history-list] .a-box");
      for (let row of Array.from(rows)) {
        const columns = $($(row).find(".a-row")[0]).children('.a-column');
        if (columns.length === 2) {
          let timeOfDay = $(columns[0]).text().trim();
          if (timeOfDay === '--') { timeOfDay = '12:00 AM'; }
          const components = $(columns[1]).children('span');
          const details = ((components != null ? components[0] : undefined) != null) ? $(components[0]).text().trim() : '';
          let location = ((components != null ? components[1] : undefined) != null) ? $(components[1]).text().trim() : '';
          location = this.presentLocationString(location);
          const ts = `${dateStr} ${timeOfDay} +00:00`;
          const timestamp = moment(ts, 'YYYY-MM-DD H:mm A Z').toDate();
          if ((timestamp != null) && (details != null ? details.length : undefined)) {
            activities.push({timestamp, location, details});
            if (status == null) { status = this.presentStatus(details); }
          }
        } else {
          var date;
          var dateStr = $(row).text().trim()
            .replace('Latest update: ', '');
          if (/yesterday/i.test(dateStr)) {
            date = moment(rightNow).subtract(1, 'day');
          } else if (/today/i.test(dateStr)) {
            date = moment(rightNow);
          } else if (/day/.test(dateStr)) {
            date = moment(`${dateStr}, ${moment(rightNow).format('YYYY')}`);
          } else {
            date = moment(dateStr);
          }
          dateStr = date.format('YYYY-MM-DD');
        }
      }
      return {activities, status};
    }

    requestOptions({orderID, orderingShipmentId}) {
      return {
        method: 'GET',
        uri: "https://www.amazon.com/gp/css/shiptrack/view.html" +
          "/ref=pe_385040_121528360_TE_SIMP_typ?ie=UTF8" +
          `&orderID=${orderID}` +
          `&orderingShipmentId=${orderingShipmentId}` +
          "&packageId=1"
      };
    }
  };
  AmazonClient.initClass();
  return AmazonClient;
})();

module.exports = {AmazonClient};


function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}