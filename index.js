const LineByLine = require('n-readlines');
const mkdirp = require('mkdirp');
const fs = require('fs');
const fetch = require('node-fetch');
const https = require('https');
const url = require('url');

const outdir = 'files';

mkdirp(outdir);

function countLines(urlsFile) {
	const liner = new LineByLine(urlsFile);
	
	let lines = 0, line;
	
	while (line = liner.next()) {
		if (line.toString('ascii').trim() != '')
	  	lines++;
	}
	
	return lines;
}

function download(fileUrl) {
	const filename = url.parse(fileUrl).pathname.replace(/[^a-zA-Z0-9.]/g, '_');

	console.log(`downloading ${fileUrl} -> ${filename}`);
	
	const p = new Promise(function(resolve, reject) {
		//const resp = await fetch(url);
		const file = fs.createWriteStream(filename);
		
	  const request = https.get(fileUrl, function(response) {
		  response.pipe(file);
		  console.log(`downloaded ${fileUrl} -> ${filename}`);
		  resolve();
		});

		request.on('error', function(err) {
		  console.log(`failed to download ${fileUrl} -> ${filename}`);
			reject(err);
		});
	});

	return p;
}

async function main(urlsFile) {
	const totalLines = countLines(urlsFile);
	console.log(`There are ${totalLines} files to download.`);

	const liner = new LineByLine(urlsFile);
	 
	let l, line;
	let lineNumber = 0;
	
	let successfulDownloads = 0;
	let failedDownloads = 0;

	const errorsFile = urlsFile + '.err';

	if (fs.existsSync(errorsFile))
		fs.unlinkSync(errorsFile);

	while (l = liner.next()) {
	    const url = l.toString('ascii').trim();
	    lineNumber++;

	    //console.log(`downloading ${url} -> ...`);

	    try {
	    	await download(url);
	    	successfulDownloads++;
	    } catch (e) {
	    	failedDownloads++;
	    	console.error(`cannot download ${url}: ${e}`);
	    	fs.appendFileSync(errorsFile, url + '\n');
	    }
	}
	 
	console.log(`${successfulDownloads} files successfully downloaded to ${outdir}. ${failedDownloads} failures; see ${errorsFile}`);
}

if (process.argv.length < 3) {
	console.log('node fetchfiles <urlsfile>');
	exit(1);
}

main(process.argv[2]);
