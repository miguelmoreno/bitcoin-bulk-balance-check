'use strict'

// Required modules
var _			= require('underscore');
var fs			= require('fs-extra');
var deasync		= require('deasync');
var request		= require('request');
const csv		= require("csvtojson/v2");
const bitcoin	= require("bitcoinjs-lib");

const minimist		= require('minimist');
const buildOptions	= require('minimist-options');

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
		type: 'string', //Yes || No
		alias: 'h'
	},
	password: {
		type: 'string', //Yes || No
		alias: 'p'
	}
});

const args = minimist(process.argv.slice(2), options);

const walletName	= args['walletName'];
const coinName		= args['coinName'];
const bip			= args['bip'];
const hardened		= args['hardened'];
const password		= args['password'];

// Settings (change these if needed)
var address_list_filename = walletName + "_" + coinName + "_BIP" + bip + "_" + hardened + "Hardened_" + password + "25thWordPwd.csv";

var save_to_file			= true; // save results to file
var log_to_console			= true; // show results in console
var delay_between_checks	= 1000; // 1000 is one second
var force_update_balance	= true; // true or false if you want it to grab balances for addresses that you've already checked before
var exit_on_failure			= true; // true or false if you want the script to exit on a invalid response from the balance query

//////////////////////////////////////////////////////
// DO NOT EDIT BELOW THIS LINE
//////////////////////////////////////////////////////

// Make Directories (do not edit )
//if (save_to_file && !fs.existsSync(__dirname + '\\balances')) {
//	//fs.mkdirSync(__dirname + '\\balances');
//	fs.mkdirSync(__dirname + '\\balances\\all\\');
//	fs.mkdirSync(__dirname + '\\balances\\zero\\' + walletName);
//	fs.mkdirSync(__dirname + '\\balances\\non-zero\\' + walletName);
//}


// Set up variables 
var url_prefix = 'https://blockchain.info/q/addressbalance/';
var address_list_file = __dirname + '\\addresses\\' + address_list_filename;
var processing = false;
console.log(address_list_file);


csv(
	{
		flatKeys: true,
		colParser: {
			"path": "omit",
			"column2": "string",
			"public key": "omit",
			"private key": "omit"
		}
	})
	.fromFile(address_list_filename)
	.subscribe((jsonObj) => {
		AddressLookUp(jsonObj);
	});

// loop through each address, pulling the balance from blockchain.info
// NOTICE: blockchain.info has rate limits. Set the delay value above to the number in miliseconds to wait between each address balance check

function AddressLookUp(address_list) {
	_.each(address_list, function (address, index) {

		deasync.sleep(delay_between_checks); // wait the specified amount of time between addresses

		while (processing) {
			deasync.sleep(1);
		}

		processing = true;
		
		var check_url = url_prefix + address;
		var csv_file = __dirname + '\\balances\\all\\' + walletName + "." + address + '.txt';

		fs.stat(csv_file, function (err, stats) {
			if (err || force_update_balance) {
				// file doesn't exist
				var balance = 'n/a';

				request(check_url, function (err, response) {
					balance = response.body;
				})

				while (balance == 'n/a') {
					deasync.sleep(1);
				}

				if (/^\d+$/.test(balance)) {
					// it's a number, which means it's a valid reply

					if (save_to_file) {
						if ((balance * 1) > 0) {
							// balance found!
							var balance_file = __dirname + '\\balances\\non-zero\\' + walletName + "." + address + '.txt';
						} else {
							var balance_file = __dirname + '\\balances\\zero\\' + walletName + "." + address + '.txt';
						}

						fs.writeFileSync(balance_file, balance);
						fs.writeFileSync(csv_file, balance);
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