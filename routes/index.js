var express = require('express');
var router = express.Router();

var async = require('async');
var Web3 = require('web3');

var cliqueSigner = require('../utils/cliqueSigner');

router.get('/', async function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  const lastBlock = await web3.eth.getBlock("latest", false)
  var blocks = [];
  var blockCount = 10;

  if (lastBlock.number - blockCount < 0) {
    blockCount = lastBlock.number + 1;
  }
  for (n=0;n<blockCount;n++) {
    blocks.push(web3.eth.getBlock(lastBlock.number - n, true))
  }
  for (n=0;n<blocks.length;n++) {
    blocks[n] = await blocks[n]
    blocks[n].miner=cliqueSigner(blocks[n])
  }

  let txs = []

  try {
    const txdb = req.app.get('txdb');
    txs = JSON.parse(await txdb.get("lasttx"))
  } catch (err) { }

  res.render('index', { blocks: blocks, txs: txs });

});

module.exports = router;
