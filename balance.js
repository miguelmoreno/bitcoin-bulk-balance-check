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
const papa = require('papaparse');
const forEach = require("for-each");
const addressValidator = require('wallet-address-validator');


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

const address_properties = {
	"Device": walletName,
	"Coin": coinName,
	"BIP": bip,
	"isHardened": hardened,
	"hasPassword": password
};

// Settings (change these if needed)
//const fields = ["walletName", "coinName", "bip", "isHardened", "has25Password", "balance"];
//const opts = { fields };

var save_to_file			= true; // save results to file
var log_to_console			= true; // show results in console
var delay_between_checks	= 1000; // 1000 is one second
var force_update_balance	= true; // true or false if you want it to grab balances for addresses that you've already checked before
var exit_on_failure			= true; // true or false if you want the script to exit on a invalid response from the balance query

// Set up variables 
var url_prefix = "https://blockchain.info/q/addressbalance/";

//prepares the file name based on its sets of properties
var file_name_descriptor = "";

for (var key in address_properties) {
	file_name_descriptor += key + address_properties[key] + ".";
}
	
var address_list_file = __dirname + '\\addresses\\' + file_name_descriptor + "csv";
var address_list_file_out = __dirname + '\\addresses\\_' + file_name_descriptor + "output.csv";

var processing = false;

fastcsv.fromPath(address_list_file, { renameHeaders:true, headers:["Path", "Address", "Coin", "BIP", "isHardened", "hasPassword", "Balance"], discardUnmappedColumns:true })
	.transform(function (data) {
		data.Coin = address_properties.Coin;
		data.BIP = address_properties.BIP;
		data.isHardened = address_properties.isHardened;
		data.hasPassword = address_properties.hasPassword;
		return data;
	})
	.validate(function (data) {
		return addressValidator.validate(data.Address, data.Coin);
	})
	.on("data-invalid", function (data) {
		console.log(err);
	})
	.on("data", function (data) {
		AddressLookUp(data.Address, address_list_file_out);
	})
	.on("end", function () {
		console.log("done");
	});
	
function AddressLookUp(address, output_file) {
	deasync.sleep(delay_between_checks); // wait the specified amount of time between addresses

	while (processing) {
		deasync.sleep(1);
	}

	if (force_update_balance) {
		// file doesn't exist
		var balance = 'n/a';

		request(url_prefix + address, function (err, response) {
			balance = response.body;
		});

		while (balance == 'n/a') {
			deasync.sleep(1);
		}

		if (/^\d+$/.test(balance)) {
			if (save_to_file) {

				var output_contents = json2csv(address_properties, opts);

				if (balance == "0") { balance += ".0000000" };

				try {
					fs.writeFileSync(output_file, address_header, "UTF-8")
					fs.appendFile(output_file, output_csingle_address, "UTF-8");
				} catch (err) {
					console.error(err);
				}
			}

			if (log_to_console) {
				balance = (balance / 100000000).toFixed(8);
				console.log(address, balance);
			}

		} else {
			if (exit_on_failure) {
				console.log('FAILED!', balance);
				process.exit(1);
			}
		}
		processing = false;
	} else {
		// file exists
		console.log("Skipping " + address);
		var balance = fs.readFileSync(csv_file).toString();
		balance = (balance / 100000000).toFixed(8);
		console.log(address, balance);
		processing = false;
	}
};

/*
function isValidBitcoinAddress(stringBitCoinID: String) -> Bool {
	let fullAddress = stringBitCoinID.components(separatedBy: ":")

	guard fullAddress.count == 2, fullAddress[0] == "bitcoin" else {
		return false
	}

	let r = fullAddress[1]
	let pattern = "^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$"

	let bitCoinIDTest = NSPredicate(format: "SELF MATCHES %@", pattern)
	let result = bitCoinIDTest.evaluate(with: r)

	return result
}*/