const {UpsClient} = require('./ups');
const {FedexClient} = require('./fedex');
const {UspsClient} = require('./usps');
const {LasershipClient} = require('./lasership');
const {DhlClient} = require('./dhl');
const {OnTracClient} = require('./ontrac');
const {UpsMiClient} = require('./upsmi');
const {AmazonClient} = require('./amazon');
const {A1Client} = require('./a1');
const {CanadaPostClient} = require('./canada_post');
const {DhlGmClient} = require('./dhlgm');
const {PrestigeClient} = require('./prestige');
const guessCarrier = require('./guessCarrier');

module.exports = {
  UpsClient,
  FedexClient,
  UspsClient,
  LasershipClient,
  DhlClient,
  OnTracClient,
  UpsMiClient,
  AmazonClient,
  A1Client,
  CanadaPostClient,
  DhlGmClient,
  PrestigeClient,
  guessCarrier
};
