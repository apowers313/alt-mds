var b64url = require("base64url");
var uuid = require('node-uuid');
var express = require('express');
var fs = require("fs");
var fse = require("fs-extra");
var url = require("url");
var rs = require("jsrsasign");
var dateFormat = require("dateformat");
var jwt = require("jsonwebtoken");
var app = express();

// conifg
// TODO: move this to an external JSON file
var entryPath = "/metadata/";
var httpHost = "localhost";
var httpPort = "8080";
var httpProtocol = "http";
var privateKeyTxtFile = __dirname + "/ca/intermediate/private/intermediate.key.txt";
var privateKeyPemFile = __dirname + "/ca/intermediate/private/intermediate.key.pem";
var signingCertFile = __dirname + "/ca/intermediate/certs/intermediate.cert.pem";
var rootCertFile = __dirname + "/ca/root/certs/ca.cert.pem";
var dbdir = __dirname + "/database/"; // TODO: if doesn't exist, fail
var mddir = __dirname + entryPath;

// override defaults for Heroku if env variables are defined
httpPort = process.env.PORT ? process.env.PORT : httpPort; 
httpHost = process.env.HOST ? process.env.HOST : httpHost;
console.log ("Host:",httpHost,"; Port:", httpPort);

// serve static files (metadata entries)
app.use(entryPath, express.static(mddir));

// serve TOC
app.get('/', function(req, res) {
	res.setHeader("Content-Disposition", "inline");
	res.setHeader("Content-Type", "application/octet-stream");
	console.log ("Serving up:\n" + mdsJwt);
	res.send(mdsJwt);
});

// get a list of all metadata records
var files = fs.readdirSync(dbdir).map(function(file) {
	return dbdir + file;
});
console.log(files);

// TODO: load old TOC

// create TOC with extra fields
var rawMdsToc = buildRawMdsToc(files);

// verify records, create files, add http routes, etc.
mdsTocActions(rawMdsToc);

// create a clean TOC
var mdsToc = cleanMdsToc(rawMdsToc);
console.log(require("util").inspect(mdsToc, {
	depth: null
}));

// create JWT
var x5c = [];
// x5c is the cert chain without the PEM -----BEGIN/END headers
x5c[0] = fs.readFileSync(signingCertFile, {
	encoding: "utf8"
}).toString().match(/^[^-\s]+$/gm).join(""); 
x5c[1] = fs.readFileSync(rootCertFile, {
	encoding: "utf8"
}).toString().match(/^[^-\s]+$/gm).join("");
console.log("x5c:", x5c);

// TODO: private key functions should be performed by HSM
// TODO: could probably use jsrsasign rather than yet-another library...
// sadly, jsrsasign can't read OpenSSL's EC Private Key PEM so we had to save it as a OpenSSL text dump and do some formatting here...
// var pkHex = fs.readFileSync(privateKeyTxtFile).toString().match(/^priv:\n[\s:0-9a-fA-F]+$/gm)[0].replace(/[^0-9a-fA-F]+/g,"");
// console.log (pkHex);
var pkPem = fs.readFileSync(privateKeyPemFile, {
	encoding: "utf8"
}).toString();
console.log(pkPem);

var mdsJwt = jwt.sign(mdsToc, pkPem, {
	algorithm: "ES256",
	headers: {x5c: x5c}
});
console.log("MDS JWT:\n" + mdsJwt);

pkPem = null; // good bye private key

// save JWT to disk

function buildRawMdsToc(files) {
	var toc = {};

	// read array of entries from files
	var mdsRawEntries = files.map(function(file) {
		var ret = {};
		ret.srcFile = file;
		ret.raw = require(file);
		ret.parsed = JSON.parse(ret.raw);
		ret.guid = uuid.v4();
		ret.b64 = b64url.encode(ret.raw);
		ret.officialFile = mddir + ret.guid;
		ret.url = url.format({
			protocol: httpProtocol,
			host: httpHost + ":" + httpPort,
			pathname: entryPath + ret.guid // TODO: maybe it'd be nice to use AAID instead of guid
		});
		ret.hash = hashB64Record(ret.b64);

		ret.timeOfLastStatusChange = dateFormat(fs.statSync(ret.srcFile).mtime, "yyyy-mm-dd");
		// only one of the next three items is going to be defined, but that's okay
		ret.aaid = ret.parsed.aaid;
		ret.attestationCertificateKeyIdentifiers = ret.parsed.attestationCertificateKeyIdentifiers;
		ret.aaguid = ret.parsed.aaguid;
		ret.statusReports = [{
			status: "NOT_FIDO_CERTIFIED",
			url: "",
			certificate: "",
			effectiveDate: ret.timeOfLastStatusChange
		}];


		return ret;
	});

	toc.nextUpdate = "2016-12-25";
	toc.no = "1";
	toc.entries = mdsRawEntries;
	console.log(require("util").inspect(mdsRawEntries, {
		depth: null
	}));

	return toc;
}

function hashB64Record(record) {
	var md = new KJUR.crypto.MessageDigest({
		alg: "sha256",
		prov: "cryptojs"
	});
	md.updateString(record);
	var mdHex = md.digest();
	return rs.hextob64u(mdHex);
}

function mdsTocActions(toc) {
	var i, entry;
	for (i = 0; i < toc.entries.length; i++) {
		entry = toc.entries[i];

		// TODO: verify metadata

		// save file for future serving
		fse.outputFileSync(entry.officialFile, entry.b64);
	}
}

function cleanMdsToc(toc) {
	toc.entries = toc.entries.map(function(entry) {
		var ret = {};
		ret.url = entry.url;
		ret.timeOfLastStatusChange = entry.timeOfLastStatusChange;
		ret.hash = entry.hash;
		ret.aaid = entry.aaid;
		ret.attestationCertificateKeyIdentifiers = entry.attestationCertificateKeyIdentifiers;
		ret.aaguid = entry.aaguid;
		ret.statusReports = entry.statusReports;
		return ret;
	});

	return toc;
}

// fire up webserver
app.listen(httpPort);