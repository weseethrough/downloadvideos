const LineByLine = require('n-readlines');
const mkdirp = require('mkdirp');
const fs = require('fs');
const fetch = require('node-fetch');
const https = require('https');
const url = require('url');
const sleep = require('await-sleep');

const MAX_ATTEMPTS = 5;
const UPDATE_AFTER_FILES = 3;
const BASE_DELAY = 1500;

function countLines(urlsFile) {
	const liner = new LineByLine(urlsFile);
	
	let lines = 0, line;
	
	while (line = liner.next()) {
		if (line.toString('ascii').trim() != '')
	  	lines++;
	}
	
	return lines;
}

function download(fileUrl, outDir) {
	const filename = outDir + '/' + url.parse(fileUrl).pathname.replace(/[^a-zA-Z0-9.]/g, '_').replace(/^_uploads_/, '');

	//console.log(`downloading ${fileUrl} -> ${filename}`);
	
	const p = new Promise(function(resolve, reject) {
		//const resp = await fetch(url);
		const file = fs.createWriteStream(filename);
		
	  const request = https.get(fileUrl, function(response) {
		  //console.log(response.statusCode);
		  if (response.statusCode >= 400) {
			  reject('HTTP code ' + response.statusCode);
		  }
		  else {
			  response.pipe(file);
			}
		});

		request.on('error', function(err) {
			file.end();
		  reject(err);
		});

		request.on('close', function() {
		  file.end();
		  resolve();
		});
	});

	return p;
}

async function downloadStubbornly(fileUrl, outDir) {
	let e;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			await download(fileUrl, outDir);
			return;
		} catch (err) {
			e = err;
			const delay = BASE_DELAY * (attempt);
			console.warn(`failed to download on attempt ${attempt}. waiting ${delay / 1000} secs before next attempt...`);
			await sleep(delay);
		}
	}
	throw `failed to download ${fileUrl} after ${MAX_ATTEMPTS} attempts. Error: ${e}`;
}

async function main(urlsFile, outDir) {
	mkdirp(outDir);

	const errorsFile = urlsFile + '.err';

	const totalLines = countLines(urlsFile);
	console.log(`There are ${totalLines} files to download. Any failed downloads will appear in ${errorsFile}.`);

	const liner = new LineByLine(urlsFile);
	 
	let l, line;
	let lineNumber = 0;
	
	let successfulDownloads = 0;
	let failedDownloads = 0;

	if (fs.existsSync(errorsFile))
		fs.unlinkSync(errorsFile);

	while (l = liner.next()) {
			const url = l.toString('ascii').trim();
	    lineNumber++;

	    if (lineNumber % UPDATE_AFTER_FILES == 0) {
	    	console.log(`starting download ${lineNumber} of ${totalLines}... (${Math.round(lineNumber / totalLines * 10) / 10}% complete)`);
	    }

	    try {
	    	await downloadStubbornly(url, outDir);
	    	successfulDownloads++;
	    } catch (e) {
	    	failedDownloads++;
	    	console.error(`cannot download ${url}: ${e}`);
	    	fs.appendFileSync(errorsFile, url + '\n');
	    }
	}
	 
	console.log(`${successfulDownloads} files successfully downloaded to ${outDir}. ${failedDownloads} failures; see ${errorsFile}`);
}

if (process.argv.length < 4) {
	console.log('node fetchfiles <urlsfile> <outdir>');
	exit(1);
}

main(process.argv[2], process.argv[3]);
