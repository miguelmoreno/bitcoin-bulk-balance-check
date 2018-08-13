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

const fastcsv			= require("fast-csv");
const addressValidator	= require('wallet-address-validator');


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

	hasPassword: {
		type: 'boolean',
		alias: 'p'
	}
});

const args = minimist(process.argv.slice(2), options);

const walletName	= args['walletName'];
const coinName		= args['coinName'];
const bip			= args['bip'];
const hardened		= args['hardened'];
const password		= args['hasPassword'];

var address_properties = {
	"Device": walletName,
	"Coin": coinName,
	"BIP": bip,
	"isHardened": hardened,
	"hasPassword": password
};

var save_to_file			= true; // save results to file
var log_to_console			= true; // show results in console
var delay_between_checks	= 1000; // 1000 is one second
var force_update_balance	= true; // true or false if you want it to grab balances for addresses that you've already checked before

// Set up variables 
var url_prefix = "https://blockchain.info/q/addressbalance/";

//prepares the file name based on its sets of properties
var file_name_descriptor = "";

for (var key in address_properties) {
	file_name_descriptor += key + address_properties[key] + ".";
}
	
var address_list_file = __dirname + '\\addresses\\' + file_name_descriptor + "csv";

var processing = false;
var final_data = [];

var data_stream = fs.createReadStream(address_list_file).on("finish", function () {
	console.log("done... reading data_stream from memory!");
});

fastcsv.fromStream(data_stream, { renameHeaders: true, headers: ["Path", "Address", "Coin", "BIP", "isHardened", "hasPassword", "Balance"], discardUnmappedColumns: true })

	.validate(function (data) {
		return addressValidator.validate(data.Address, data.Coin);;
	})

	.on("data-invalid", function (data) {
		console.log("Address " + data.Address + " failed validation. InnerException: " + err);
	})

	.transform(function (data) {
		data.Coin = address_properties.Coin;
		data.BIP = address_properties.BIP;
		data.isHardened = address_properties.isHardened;
		data.hasPassword = address_properties.hasPassword;
		return data;
	})

	.on("data", function (data) {
		data.Balance = AddressBalanceLookUp(data.Address);
		console.log("Address " + data.Address + " successfully validated at derivation path: " + data.Path + ", shows a Current balance: BTC " + data.Balance);
	})
	.on("finish", function () {
		console.log("DONE!");
	})

	.pipe(fastcsv.createWriteStream({ headers: true }))
	.pipe(fs.createWriteStream(address_list_file + "_out.csv", { encoding: "utf8" }));

function AddressBalanceLookUp(address) {
	deasync.sleep(delay_between_checks);

	while (processing) {
		deasync.sleep(1);
	}

	if (force_update_balance) {
		var balance = 'n/a';

		request(url_prefix + address, function (err, response) {
			balance = response.body;
		});

		while (balance == 'n/a') {
			deasync.sleep(1);
		}

		if (/^\d+$/.test(balance)) {
			balance = (balance / 100000000).toFixed(8);
		}
		return balance;
	}
};