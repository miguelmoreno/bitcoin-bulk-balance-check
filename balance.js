'use strict';

// Required modules
const _					= require('underscore');
const fs				= require('fs-extra');
const deasync			= require('deasync');
const request			= require('request');
const csvtojson			= require("csvtojson/v2");
const bitcoin			= require("bitcoinjs-lib");
const buildOptions		= require('minimist-options');
const minimist			= require('minimist');
const json2csv			= require('json2csv').parse;
const jsonfile			= require('jsonfile');
const csvdata			= require('csvdata');
const csv				= require('csv');
const parse				= require('csv-parse/lib/sync')
const csvparse			= require('csv-parse');
const fastcsv			= require("fast-csv");
const csvString			= require('csv-string');
//const parse				= require('..');
const papa = require('papaparse');


const options = buildOptions({
	walletName: {
		type: 'string',
		alias: 'w'
	},

	coinName: {
		type: 'string',
		alias: 'c'
	},

	bip: {
		type: 'string',
		alias: 'b'
	},

	hardened: {
		type: 'boolean',
		alias: 'h'
	},

	password: {
		type: 'boolean',
		alias: 'p'
	}
});

const args = minimist(process.argv.slice(2), options);

const walletName	= args['walletName'];
const coinName		= args['coinName'];
const bip			= args['bip'];
const hardened		= args['hardened'];
const password		= args['password'];

const address_properties = {
	"walletName": walletName,
	"coinName": coinName,
	"bip": bip,
	"isHardened": hardened,
	"has25Password": password
};

// Settings (change these if needed)
const fields = ["walletName", "coinName", "bip", "isHardened", "has25Password", "balance"];
const opts = { fields };

var save_to_file			= true; // save results to file
var log_to_console			= true; // show results in console
var delay_between_checks	= 1000; // 1000 is one second
var force_update_balance	= true; // true or false if you want it to grab balances for addresses that you've already checked before
var exit_on_failure			= true; // true or false if you want the script to exit on a invalid response from the balance query

// Set up variables 
var url_prefix = 'https://blockchain.info/q/addressbalance/';

var file_name_descriptor = address_properties.walletName + "." + address_properties.coinName + ".B" + address_properties.bip + ".H" + address_properties.isHardened + ".P" + address_properties.has25Password;
var address_list_file = __dirname + '\\addresses\\' + file_name_descriptor + ".csv";

var processing = false;

csvString.forEach(address_list_file, ',', function (row, index) {
	AddressLookUp(row, index);
});

//var poep = csvdata.load(address_list_file, { objName: 'address' })

var poep = papa.parse(address_list_file, {});
/*
var parser = parse({ delimiter: ';' }, function (err, data) {
	console.log(data);
});
*/
//var parse = require('../lib/sync');
//require('should');

//var input = '"key_1","key_2"\n"value 1","value 2"';
//var records = parse(input, { columns: true });
//records.should.eql([{ key_1: 'value 1', key_2: 'value 2' }]);


var k = fastcsv
	.fromPath(address_list_file)
	.on("data", function (data) {
		console.log(data.address);
	})
	.on("end", function () {
		console.log("done");
	});

//stream.pipe(csvStream);

var e = fastcsv.fromPath(address_list_file, { headers: true })
	.on("data", function (data) {
		AddressLookUp(data.address);
	})
	.on("end", function () {
		console.log("done");
	});

/*
csvtojson(
	{
		colParser: {
			"path": "omit",
			"column2": "string",
			"public key": "omit",
			"private key": "omit"
		}
	})
	.fromFile(address_list_file)

	.on('error', (err) => {
		console.log(err)
	})
	.then((jsonObj) => {
		var p = parse(jsonObj); 
		AddressLookUp(p, opts, _.values(address_properties));
	});
*/	
function AddressLookUp(row, index) {
	
};