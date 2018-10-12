var web3 = require('web3');
var net = require('net');

var config = function () {

  this.logFormat = "combined";
  this.provider = new web3.providers.HttpProvider(process.env.ETHERCHAIN_GETHRPC);
  this.bootstrapUrl = "https://maxcdn.bootstrapcdn.com/bootswatch/3.3.7/yeti/bootstrap.min.css";

  this.names = {
	"0x5d03df716ebf0e11bfb3e178fb39ed672c59ee6d" : "UABnode",
	"0xf979deb61f2e982761ac22b2a647cafdc5263ffc" : "GUIFInode",
	"0x4106b08c56e3ba2b8ee908ce14eae4c38ef5b7cc" : "WHGnode",
	"0xcf093386e24d2923444f4244eb5d357b1fb40daf" : "UPCnode",
	"0x6b0827552cee38be8e24809bb5c30f674aab33ab" : "ETHDEVBCNnode",
	"0xafc8c48a963b52725baa37314c62de3c12054d59" : "DEVCENTRALnode"
  }

}

module.exports = config;
