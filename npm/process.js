const { spawn } = require('child_process');
const path = require('path');
const platform = require('os').platform();

const bin = './to-littlein' + (platform === 'win32' ? '.exe' : '');
const ready = /(\w+\.\w+\.littlein\.\w+)/;
const inUse = /address already in use/;

let processPromise, activeProcess;

/*
	ngrok process runs internal ngrok api
	and should be spawned only ONCE 
	(respawn allowed if it fails or .kill method called)
*/

async function getProcess(opts) {
	if (processPromise) return processPromise; 
	try {
		processPromise = startProcess(opts);
		return await processPromise;
	}
	catch(ex) {
		processPromise = null;
		throw ex;
	}
}

async function startProcess (opts) {
	let dir = __dirname + '/bin';
	const start = ['start', '--none', '--log=stdout'];
	if (opts.region) start.push('--region=' + opts.region);
	if (opts.configPath) start.push('--config=' + opts.configPath);
	if (opts.binPath) dir = opts.binPath(dir);
	
	const ngrok = spawn(bin, [opts], {cwd: dir})
	
	let resolve, reject;
	const apiUrl = new Promise((res, rej) => {   
		resolve = res;
		reject = rej;
	});

	ngrok.stdout.on('data', data => {
		const msg = data.toString();
		const addr = msg.match(ready);
		// console.log(addr)
		if (addr) {
			resolve(`https://${addr[0]}`);
		} else if (msg.match(inUse)) {
			reject(new Error(msg.substring(0, 10000)));
		}
	});  

	ngrok.stderr.on('data', data => {
		const msg = data.toString().substring(0, 10000);
		reject(new Error(msg));
	});

	ngrok.on('exit', () => {
		processPromise = null;
		activeProcess = null;
	});

	process.on('exit', async () => await killProcess());

	try {
		const url = await apiUrl;
		activeProcess = ngrok;
		return url;      
	}
	catch(ex) {
		ngrok.kill();
		throw ex;
	}
	finally {
		ngrok.stdout.removeAllListeners('data');
		ngrok.stderr.removeAllListeners('data');
	}
}

function killProcess ()  {
	if (!activeProcess) return;
	return new Promise(resolve => {
		activeProcess.on('exit', () => resolve());
		activeProcess.kill();
	});
}

module.exports = {
	getProcess,
	killProcess,
};