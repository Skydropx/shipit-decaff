/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require('fs');
const assert = require('assert');
const should = require('chai').should();
const { expect } = require('chai');
const bond = require('bondjs');
const {DhlClient} = require('../lib/dhl');
const {ShipperClient} = require('../lib/shipper');
const {Builder, Parser} = require('xml2js');

describe("dhl client", function() {
  let _dhlClient = null;
  const _xmlParser = new Parser();
  const _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  before(() =>
    _dhlClient = new DhlClient({
      userId: 'dhl-user',
      password: 'dhl-pw'
    })
  );

  describe("generateRequest", () =>
    it("generates an accurate track request", function() {
      const trackXml = _dhlClient.generateRequest('1Z5678');
      return expect(trackXml).to.equal(`\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<req:KnownTrackingRequest xmlns:req="http://www.dhl.com">
  <Request>
    <ServiceHeader>
      <SiteID>dhl-user</SiteID>
      <Password>dhl-pw</Password>
    </ServiceHeader>
  </Request>
  <LanguageCode>en</LanguageCode>
  <AWBNumber>1Z5678</AWBNumber>
  <LevelOfDetails>ALL_CHECK_POINTS</LevelOfDetails>
</req:KnownTrackingRequest>`
      );
    })
  );

  describe("requestOptions", function() {
    let _options = null;
    let _generateReq = null;
    let _generateReqSpy = null;

    before(function() {
      _generateReqSpy = bond(_dhlClient, 'generateRequest');
      _generateReq = _generateReqSpy.through();
      return _options = _dhlClient.requestOptions({trackingNumber: '1ZMYTRACK123'});
    });

    after(() => _generateReqSpy.restore());

    return it("creates a POST request", () => _options.method.should.equal('POST'));
  });

  describe("validateResponse", function() {});

  return describe("integration tests", function() {
    let _package = null;

    describe("delivered package", function() {

      before(done =>
        fs.readFile('test/stub_data/dhl_delivered.xml', 'utf8', (err, doc) =>
          _dhlClient.presentResponse(doc, 'trk', function(err, resp) {
            should.not.exist(err);
            _package = resp;
            return done();
          })
        )
      );

      it("has a status of delivered", () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.DELIVERED));

      it("has a destination of Woodside, NY, USA", () => expect(_package.destination).to.equal('Woodside, NY, USA'));

      it("has a weight of 2.42 LB", () => expect(_package.weight).to.equal("2.42 LB"));

      return it("has 14 activities with timestamp, location and details", function() {
        expect(_package.activities).to.have.length(14);
        let act = _package.activities[0];
        expect(act.location).to.equal('Woodside, NY, USA');
        expect(act.details).to.equal('Delivered - Signed for by');
        expect(act.timestamp).to.deep.equal(new Date('2015-10-01T13:44:37Z'));
        act = _package.activities[13];
        expect(act.location).to.equal('London, Heathrow - United Kingdom');
        expect(act.details).to.equal('Processed');
        return expect(act.timestamp).to.deep.equal(new Date('2015-09-29T21:10:34Z'));
      });
    });

    return describe("delayed package", function() {

      before(done =>
        fs.readFile('test/stub_data/dhl_delayed.xml', 'utf8', (err, doc) =>
          _dhlClient.presentResponse(doc, 'trk', function(err, resp) {
            should.not.exist(err);
            _package = resp;
            return done();
          })
        )
      );

      it("has a status of delayed", () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.DELAYED));

      it("has a destination of Auckland, New Zealand", () => expect(_package.destination).to.equal('Auckland, New Zealand'));

      it("has a weight of 14.66 LB", () => expect(_package.weight).to.equal("14.66 LB"));

      return it("has 24 activities with timestamp, location and details", function() {
        expect(_package.activities).to.have.length(24);
        let act = _package.activities[0];
        expect(act.location).to.equal('Auckland, New Zealand');
        expect(act.details).to.equal('Clearance event');
        expect(act.timestamp).to.deep.equal(new Date('2015-10-08T02:33:00Z'));
        act = _package.activities[23];
        expect(act.location).to.equal('London, Heathrow - United Kingdom');
        expect(act.details).to.equal('Processed');
        return expect(act.timestamp).to.deep.equal(new Date('2015-09-18T20:18:58Z'));
      });
    });
  });
});
