/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require('fs');
const async = require('async');
const assert = require('assert');
const moment = require('moment-timezone');
const should = require('chai').should();
const { expect } = require('chai');
const bond = require('bondjs');
const {AmazonClient} = require('../lib/amazon');
const {ShipperClient} = require('../lib/shipper');

describe("amazon client", function() {
  let _amazonClient = null;

  before(() => _amazonClient = new AmazonClient());

  return describe("integration tests", function() {
    let _package = null;

    describe("out-for-delivery package", function() {

      before(done =>
        fs.readFile('test/stub_data/amazon_out_for_del.html', 'utf8', (err, docs) =>
          _amazonClient.presentResponse(docs, 'request', function(err, resp) {
            should.not.exist(err);
            _package = resp;
            return done();
          })
        )
      );

      it("has a status of out-for-delivery", () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY));

      it("has an eta of Oct 3rd at 8pm", () => expect(_package.eta).to.deep.equal(new Date('2015-10-03T20:00:00Z')));

      it("has a destination of San Jose, California", () => expect(_package.destination).to.equal('San Jose, California'));

      describe("has last activity", function() {
        let _activity = null;

        before(function() {
          _activity = _package.activities[0];
          return should.exist(_activity);
        });

        it("with timestamp of Oct 2 2015 at 5:57 am", () => expect(_activity.timestamp).to.deep.equal(new Date('2015-10-02T05:57:00Z')));

        it("with details showing delivered", () => expect(_activity.details).to.equal('Out for delivery'));

        return it("with location Laurel, MD, US", () => expect(_activity.location).to.equal('San Jose, US'));
      });

      describe("has another activity", function() {
        let _activity = null;

        before(function() {
          _activity = _package.activities[1];
          return should.exist(_activity);
        });

        it("with timestamp of Oct 2 2015 at 3:05 am", () => expect(_activity.timestamp).to.deep.equal(new Date('2015-10-02T03:05:00Z')));

        it("with details showing delivered", () => expect(_activity.details).to.equal('Package arrived at a carrier facility'));

        return it("with location Laurel, MD, US", () => expect(_activity.location).to.equal('San Jose, US'));
      });

      return describe("has first activity", function() {
        let _activity = null;

        before(function() {
          _activity = _package.activities[2];
          return should.exist(_activity);
        });

        it("with timestamp of Oct 2 2015", () => expect(_activity.timestamp).to.deep.equal(new Date('2015-10-02T00:00:00Z')));

        it("with details showing out-for-del", () => expect(_activity.details).to.equal('Package has left seller facility and is in transit to carrier'));

        return it("with no location", () => expect(_activity.location).to.equal(''));
      });
    });


    describe("package delivered 2 days ago", function() {

      before(done =>
        fs.readFile('test/stub_data/amazon_delivered_2days_ago.html', 'utf8', (err, docs) =>
          _amazonClient.presentResponse(docs, 'request', function(err, resp) {
            should.not.exist(err);
            _package = resp;
            return done();
          })
        )
      );

      it("has a status of delivered", () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.DELIVERED));

      describe("has last activity", function() {
        let _activity = null;

        before(function() {
          _activity = _package.activities[0];
          return should.exist(_activity);
        });

        it("with timestamp of Oct 1 2015 at 10:23 am", () => expect(_activity.timestamp).to.deep.equal(new Date('2015-10-01T10:23:00Z')));

        it("with details showing delivered", () => expect(_activity.details).to.equal('Your package was delivered. The delivery was signed by: ALEFLER'));

        return it("with location Hurricane, WV, US", () => expect(_activity.location).to.equal('Hurricane, WV, US'));
      });

      describe("has second activity", function() {
        let _activity = null;

        before(function() {
          _activity = _package.activities[1];
          return should.exist(_activity);
        });

        it("with timestamp of Sep 30 2015 at 4:16 am", () => expect(_activity.timestamp).to.deep.equal(new Date('2015-09-30T04:16:00Z')));

        it("with details showing out-for-delivery", () => expect(_activity.details).to.equal('Out for delivery'));

        return it("with location Charleston", () => expect(_activity.location).to.equal('Charleston, WV, US'));
      });

      describe("has third activity", function() {
        let _activity = null;

        before(function() {
          _activity = _package.activities[2];
          return should.exist(_activity);
        });

        it("with timestamp of Sep 30 2015 at 4:13 am", () => expect(_activity.timestamp).to.deep.equal(new Date('2015-09-30T04:13:00Z')));

        it("with details showing package en-route", () => expect(_activity.details).to.equal('Package arrived at a carrier facility'));

        return it("with location Charleston", () => expect(_activity.location).to.equal('Charleston, WV, US'));
      });

      describe("has seventh activity", function() {
        let _activity = null;

        before(function() {
          _activity = _package.activities[6];
          return should.exist(_activity);
        });

        it("with timestamp of Sep 29 2015 at 5:22 pm", () => expect(_activity.timestamp).to.deep.equal(new Date('2015-09-29T17:22:00Z')));

        it("with details showing package en-route", () => expect(_activity.details).to.equal('Package arrived at a carrier facility'));

        return it("with location Chattanooga", () => expect(_activity.location).to.equal('Chattanooga, TN, US'));
      });


      return describe("has ninth activity", function() {
        let _activity = null;

        before(function() {
          _activity = _package.activities[8];
          return should.exist(_activity);
        });

        it("with timestamp of Sep 29 2015 at 2:13 pm", () => expect(_activity.timestamp).to.deep.equal(new Date('2015-09-29T14:13:00Z')));

        it("with details showing package en-route", () => expect(_activity.details).to.equal('Package has left seller facility and is in transit to carrier'));

        return it("with location US", () => expect(_activity.location).to.equal('US'));
      });
    });


    describe("package scheduled for delivery on Tuesday", function() {

      before(done =>
        fs.readFile('test/stub_data/amazon_last_update_today.html', 'utf8', (err, docs) =>
          _amazonClient.presentResponse(docs, 'request', function(err, resp) {
            should.not.exist(err);
            _package = resp;
            return done();
          })
        )
      );

      it("has a status of en-route", () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE));

      it("has an eta of Oct 6th", () => expect(_package.eta).to.deep.equal(new Date('2015-10-06T23:00:00Z')));

      it("has a destination of Hurricane, WV", () => expect(_package.destination).to.equal('Hurricane, WV'));

      return describe("has one activity", function() {
        let _activity = null;

        before(function() {
          _activity = _package.activities[0];
          return should.exist(_activity);
        });

        it("with timestamp of Oct 5 2015 at 7:47m", () => expect(_activity.timestamp).to.deep.equal(new Date('2015-10-03T07:47:00Z')));

        it("with location Grove City, OH, US", () => expect(_activity.location).to.equal('Grove City, OH, US'));

        return it("with details showing enroute", () => expect(_activity.details).to.equal('Package arrived at a carrier facility'));
      });
    });


    describe("package scheduled for delivery in a date range", function() {

      before(done =>
        fs.readFile('test/stub_data/amazon_eta_date_range.html', 'utf8', (err, docs) =>
          _amazonClient.presentResponse(docs, 'request', function(err, resp) {
            should.not.exist(err);
            _package = resp;
            return done();
          })
        )
      );

      it("has a status of en-route", () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE));

      it("has an eta of Oct 16th", () => expect(_package.eta).to.deep.equal(new Date('2015-10-16T23:00:00Z')));

      return it("has a destination of Hurricane, WV", () => expect(_package.destination).to.equal('Sanford, FL'));
    });


    return describe("package out-for-delivery but no clear 'last-status' string", function() {

      before(done =>
        fs.readFile('test/stub_data/amazon_out_for_del2.html', 'utf8', (err, docs) =>
          _amazonClient.presentResponse(docs, 'request', function(err, resp) {
            should.not.exist(err);
            _package = resp;
            return done();
          })
        )
      );

      return it("has a status of out-for-del", () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY));
    });
  });
});
