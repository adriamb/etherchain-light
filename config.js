var web3 = require('web3');
var net = require('net');

var config = function () {

  this.logFormat = "combined";
  this.provider = new web3.providers.HttpProvider("http://95.216.138.30:8545");
  this.bootstrapUrl = "https://maxcdn.bootstrapcdn.com/bootswatch/3.3.7/yeti/bootstrap.min.css";

  this.names = {
  }

}

module.exports = config;