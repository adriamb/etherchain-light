var express = require('express');
var router = express.Router();

var async = require('async');
var Web3 = require('web3');
var abi = require('ethereumjs-abi');
var abiDecoder = require('abi-decoder');

var promisify = require('../utils/promisify');
var chunkString = require('../utils/chunkString');

router.get('/pending', async function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);

  const txpool = await promisify( cb => web3.currentProvider.send({
    method: "txpool_content",
    params: [],
    jsonrpc: "2.0",
    id: "2"
  },cb))

  const pendingTxs = []
  const queuedTx = []

  for (let km in txpool.result.pending) {
     const kmitems = txpool.result.pending[km]
     for (let kmc in kmitems)  {
         pendingTxs.push(kmitems[kmc])
     }
  }

  res.render('tx_pending', { txs: pendingTxs });

});


router.get('/submit', function(req, res, next) {  
  res.render('tx_submit', { });
});

router.post('/submit', function(req, res, next) {
  if (!req.body.txHex) {
    return res.render('tx_submit', { message: "No transaction data specified"});
  }
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  async.waterfall([
    function(callback) {
      web3.eth.sendRawTransaction(req.body.txHex, function(err, result) {
        callback(err, result);
      });
    }
  ], function(err, hash) {
    if (err) {
      res.render('tx_submit', { message: "Error submitting transaction: " + err });
    } else {
      res.render('tx_submit', { message: "Transaction submitted. Hash: " + hash });
    }
  });
});

router.get('/:tx', async function(req, res, next) {
  
  var config = req.app.get('config');  
  var db = req.app.get('db');
  var web3 = new Web3();
  web3.setProvider(config.provider);

  // -- get tx & receipt

  const tx = await web3.eth.getTransaction(req.params.tx)
  if (tx == null) { 
    return next("Transaction not found")
  }

  const receipt = await web3.eth.getTransactionReceipt(req.params.tx)

  tx.gasUsed = receipt.gasUsed;
  if (receipt.status == '0x0') {
    tx.status = 'Failed'
  } else if (receipt.status == '0x1') {
   tx.status = 'Success'
  } else {
   tx.status = 'Unknown ('+receipt.status+')'
  }
 
  // -- get traces

  const txtrace = await promisify( cb => web3.currentProvider.send({
    method: "debug_traceTransaction",
    params: [tx.hash, {tracer: "callTracer"}],
    jsonrpc: "2.0",
    id: "2"
  },cb))

  function flattenlogs(x) {
    v = [JSON.parse(JSON.stringify(x))];
    if ('calls' in v[0]) {
      for (i=0;i<v[0].calls.length;i++) {
        v=v.concat(flattenlogs(v[0].calls[i]));
      }
      delete v[0]["calls"]
    }
    return v       
  }

  const traces  = flattenlogs(txtrace.result)

  // Get source if defined

  contracts = {}
  async function registerContract(addr)  {
    if (addr in contracts) {
      return contracts[addr]
    }
    addr = addr.toLowerCase()
    source = null
    decoder = false
    try {
      source = await db.get(addr)
      sourceobj = JSON.parse(source)
      var jsonAbi = JSON.parse(sourceobj.abi)
      abiDecoder.addABI(jsonAbi);
      decoder = true;
    } catch (e) {  }
    contracts[addr] = {
      source: source,
      decoder: decoder
    }
    return contracts[addr]
  }
  
  if (tx.to != null ) {
    let contract = await registerContract(tx.to)
    if (contract.source != null ) {
      tx.source = JSON.parse(contract.source);
    }
    if (contract.decoder != null) {
      tx.callInfo = abiDecoder.decodeMethod(tx.input); 
    }
  }	  

  // Parse logs

  tx.logs = []
  for (var i=0;i<receipt.logs.length;i++) {
    const log = receipt.logs[i]
    contract = await registerContract(log.address)
    if (contract.decoder) {
       tx.logs.push(abiDecoder.decodeLogs([log])[0]);
    } else {
       raw = log.data.substring(2)
       rawchunked = chunkString(raw,64)
       logentry = {
         address: log.address,
         name: "unknown",
         events : []
       }
       for (c=0;c<rawchunked.length;c++) {
         var event = {}
         event.name = '['+c+']'
         event.type = ''
         event.value = '0x'+rawchunked[c]
         logentry.events.push(event)
       }
       tx.logs.push(logentry)
    }
 }

  // Parse traces

  tx.traces = [];

  if (traces != null) {
    traces.forEach(function(trace) {
        tx.traces.push(trace);
        if (trace.error) {
          tx.failed = true;
          tx.error = trace.error;
        }
        if (trace.result && trace.result.gasUsed) {
          tx.gasUsed += parseInt(trace.result.gasUsed, 16);
        }
      });
  }
  res.render('tx', { tx: tx });

});

router.get('/raw/:tx', async function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  const txtrace_callTracer = await promisify( cb => web3.currentProvider.send({
    method: "debug_traceTransaction",
    params: [req.params.tx, {tracer: "callTracer"}],
    jsonrpc: "2.0",
    id: "2"
  },cb))

  const txtrace = await promisify( cb => web3.currentProvider.send({
    method: "debug_traceTransaction",
    params: [req.params.tx],
    jsonrpc: "2.0",
    id: "2"
  },cb))

  traces = {
    txid: req.params.tx,
    traces: {
      trace: txtrace_callTracer.result,
      vmTrace: txtrace.result,  
    }
  }
  res.render('tx_raw', { tx: traces });

});

module.exports = router;
