'use strict';

// Required modules
const _				= require('underscore');
const fs			= require('fs-extra');
const deasync		= require('deasync');
const request		= require('request');
const csv			= require("csvtojson/v2");
const bitcoin		= require("bitcoinjs-lib");
const buildOptions	= require('minimist-options');
const minimist		= require('minimist');

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

let wallet = {
	name: walletName,
	coin: coinName,
	bip: bip,
	isHardened: hardened,
	hasPassword: password
};

// Settings (change these if needed)
var address_descriptor		= walletName + "_" + coinName + "_B" + bip + "_H" + hardened + "_P" + password;
var address_list_filename	= address_descriptor + ".csv";

var save_to_file			= true; // save results to file
var log_to_console			= true; // show results in console
var delay_between_checks	= 1000; // 1000 is one second
var force_update_balance	= true; // true or false if you want it to grab balances for addresses that you've already checked before
var exit_on_failure			= true; // true or false if you want the script to exit on a invalid response from the balance query

// Set up variables 
var url_prefix = 'https://blockchain.info/q/addressbalance/';
var address_list_file = __dirname + '\\addresses\\' + address_list_filename;
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
		
		var check_url = url_prefix + address.address;
		var csv_file = __dirname + '\\balances\\all\\' + address.address + '.txt';

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
					// it's a number, which means it's a valid reply

					if (save_to_file) {
						if ((balance * 1) > 0) {
							// balance found!
							var balance_file = __dirname + '\\balances\\non-zero\\' + walletName + "." + address.addres + '.txt';
						} else {
							var balance_file = __dirname + '\\balances\\zero\\' + walletName + "." + address.address + '.txt';
						}

						var address_details = "Device, Coin, BIP, isHardenedAddress, has25thWordPassword" + "\\r\\n" + address_descriptor + ": Balance: BTC" + balance;
						fs.writeFileSync(balance_file, address_details);
						fs.writeFileSync(csv_file, address_details);
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