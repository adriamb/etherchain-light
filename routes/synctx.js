var express = require('express');
var router = express.Router();

const level = require('level')
const Web3 = require('web3');
var sleep = require('sleep');
var promisify = require('../utils/promisify');

var asyncMutex = require('async-mutex').Mutex;

const appendAddress = async(txdb,block, addr,tx,inout) => {

    let lastIndex = -1
    let lastTxList = []

    try {
        lastIndex = await txdb.get(addr+"INDEX")
        lastTxList = JSON.parse(await txdb.get(addr+lastIndex))
    } catch (err) {
    }

    if (lastIndex == -1 || lastTxList.length > 25) {
        lastIndex++
        await txdb.put(addr+"INDEX",lastIndex)
        lastTxList = []
    }

    txinfo = {
        block: tx.blockNumber,
        hash : tx.hash,
        from : tx.from,
        inout : inout,
        to : tx.to,
        value : tx.value.toString(16)
    }

    lastTxList.push(txinfo)
    await txdb.put(addr+lastIndex,JSON.stringify(lastTxList))
}

const appendLastTxs = async(txdb,tx) => {

    const lastTxKey = "lasttx"

    let lastTxList = []
    try {
        lastTxList = JSON.parse(await txdb.get(lastTxKey))
    } catch (err) {
    }

    if (lastTxList.length > 25) {
        lastTxList = lastTxList.slice(0,-1)
    }

    txinfo = {
        block: tx.blockNumber,
        hash : tx.hash,
        from : tx.from,
        to : tx.to,
        value : tx.value.toString(16)
    }

    lastTxList = [txinfo,...lastTxList]

    await txdb.put(lastTxKey,JSON.stringify(lastTxList))
}

syncNextBlock = async (txdb,web3) => {

    let lastBlockchainBlock = await web3.eth.getBlockNumber()
    let lastDbBlock

    try {
        lastDbBlock = await txdb.get('lastblock')
    } catch (err) {
        console.log("Initializing...")
        await txdb.put('lastblock',0)
        lastDbBlock = await txdb.get('lastblock')
    }

    let txs = []

    if (lastDbBlock <= lastBlockchainBlock) {

        try {
            txs = JSON.parse(await txdb.get("lasttx"))
        } catch (err) { }

        const block = await web3.eth.getBlock(lastDbBlock,false)

        if (block.transactions.length > 0) {
            console.log("Block ",lastDbBlock, " with ", block.transactions.length, " txn")
        }

        let offset = 0
        while (offset < block.transactions.length) {

            let txn = offset

            queries = []
            for (txn = offset; txn-offset < 20 && txn<block.transactions.length;txn++) {
                const txid = block.transactions[txn]
                queries.push(web3.eth.getTransaction(txid))
            }
            for (i=0; i < queries.length;i++) {
                const tx = await queries[i]
                await appendAddress(txdb,block, tx.from.toLowerCase(), tx,"OUT")
                if (tx.to!=null) {
                    await appendAddress(txdb,block, tx.to.toLowerCase(), tx,"IN")
                }
                await appendLastTxs(txdb,tx)
            }

            offset = txn

        }

        lastDbBlock++
        await txdb.put('lastblock',lastDbBlock)

    }

    return {
        error: null,
        current : lastBlockchainBlock,
        last :lastDbBlock,
        txcount : txs.length
    }

}

const mutex = new asyncMutex();

router.get('/', async function(req, res, next) {

    try {
        const txdb = req.app.get('txdb');
        var config = req.app.get('config');
        var web3 = new Web3();
        web3.setProvider(config.provider);

        const release = await mutex.acquire();
        let result
        try {
            result = await syncNextBlock(txdb,web3)
        } finally {
            release()
        }
        res.send(result)
    } catch (err) {
        console.log(err)
        res.send( {
            error: err
        })
    }
})


module.exports = router;
