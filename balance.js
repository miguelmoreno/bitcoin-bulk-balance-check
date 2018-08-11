'use strict';

// Required modules
const _					= require('underscore');
const fs				= require('fs-extra');
const deasync			= require('deasync');
const request			= require('request');
const csv				= require("csvtojson/v2");
const bitcoin			= require("bitcoinjs-lib");
const buildOptions		= require('minimist-options');
const minimist			= require('minimist');
const json2csv			= require('json2csv').parse;
const jsonfile			= require('jsonfile');

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
var file_name_descriptor = address_properties.walletName + "_" + address_properties.coinName + "_B" + address_properties.bip + "_H" + address_properties.isHardened + "_P" + address_properties.has25Password;
var address_list_file = __dirname + '\\addresses\\' + file_name_descriptor + ".csv";

var processing = false;

console.log(address_list_file);

csv(
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
		AddressLookUp(jsonObj, opts, address_properties, file_name_descriptor);
	});
	
function AddressLookUp(address_list, opts, address_properties, file_name_descriptor) {
	_.each(address_list, function (address, index) {

		deasync.sleep(delay_between_checks); // wait the specified amount of time between addresses

		while (processing) {
			deasync.sleep(1);
		}

		processing = true;

		//var 
		var address_list_filename = address.address + ".csv";

		var check_url = url_prefix + address.address;
		var csv_file = __dirname + '\\balances\\' + file_name_descriptor +"_" + address.address + '.csv';

		fs.stat(csv_file, function (err, stats) {
			if (err || force_update_balance) {
				// file doesn't exist
				var balance = 'n/a';

				request(check_url, function (err, response) {
					balance = response.body;
				});

				while (balance == 'n/a') {
					deasync.sleep(1);
				}

				if (/^\d+$/.test(balance)) {
					if (save_to_file) {
						if (balance == "0") { balance += ".0000000" };

						var balance_file = __dirname + "\\balances\\" + file_name_descriptor + "_" + address.address + "_" + balance + '.txt';

						try {
							var address_detail		= json2csv(address_properties, opts);

							fs.writeFileSync(balance_file, address_detail, "UTF-8")
							fs.appendFile(balance_file, balance, "UTF-8");
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

		});
	});
}