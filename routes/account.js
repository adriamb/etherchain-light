var express = require('express');
var router = express.Router();

var async = require('async');
var Web3 = require('web3');

router.get('/:account', async function(req, res, next) {
  
  var config = req.app.get('config');  
  var web3 = new Web3();
  web3.setProvider(config.provider);
  
  var db = req.app.get('db');
  var txdb = req.app.get('txdb');
  
  var data = {};
  
  data.address = req.params.account
  data.balance = await web3.eth.getBalance(req.params.account)
  data.code = await web3.eth.getCode(req.params.account)
  data.isContract = data.code !== "0x"
  data.contractState = []
  data.blocks = [];
  
  try {
    source = await db.get(req.params.account.toLowerCase());
    data.source = JSON.parse(source);
    var abi = JSON.parse(data.source.abi);
    var contract = new web3.eth.Contract(abi,req.params.account);

    for (let func of abi) {
      if (func.type === "function" && func.inputs.length === 0 && func.constant) {
         try {
           result = await (contract.methods[func.name]().call())
           data.contractState.push({
             name: func.name,
             result: result
          });
         } catch (e) {  
           console.log(e)   
         }
      }
    }
  } catch (e) {
    console.log(e)
  }
    
  if (data.source) {
    data.name = data.source.name;
  } else if (config.names[data.address]) {
    data.name = config.names[data.address];
  }

  let lastIndex = -1
  let lastTxList = []
  
  addr = data.address.toLowerCase()

  try {
      lastIndex = await txdb.get(addr+"INDEX")
      console.log("LASTINDEX",lastIndex)
  } catch (err) {
  }

  if (lastIndex >= 0) {
    lastTxList = JSON.parse(await txdb.get(addr+""+lastIndex))
    if (lastIndex  >= 1 ) {
      beforelastTxList = JSON.parse(await txdb.get(addr+""+(lastIndex-1)))
      lastTxList = lastTxList.concat(beforelastTxList)
    }
  }

  data.txs = lastTxList

  console.log(lastTxList)

  res.render('account', { account: data });

});

module.exports = router;
