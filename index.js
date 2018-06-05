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
	const filename = outdir + '/' + url.parse(fileUrl).pathname.replace(/[^a-zA-Z0-9.]/g, '_').replace(/^_uploads_/, '');

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

	    try {
	    	await download(url);//.then(() => console.log('fooooffo'));
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
