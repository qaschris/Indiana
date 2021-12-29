const cp = require('child_process');
// This script requires the 'request' node.js module.
// This section grabs required node modules not packaged with
// the Automation Host service prior to executing the script.
const req = async module => {
  try {
    require.resolve(module);
  } catch (e) {
    console.log(`=== could not resolve "${module}" ===\n=== installing... ===`);
    cp.execSync(`npm install ${module}`);
    await setImmediate(() => {});
    console.log(`=== "${module}" has been installed ===`);
  }
  console.log(`=== requiring "${module}" ===`);
  try {
    return require(module);
  } catch (e) {
    console.log(`=== could not include "${module}" ===`);
    console.log(e);
    process.exit(1);
  }
}

const formatSizeUnits = async (bytes) => {
    if (bytes > 0) {
        bytes = (bytes / 1048576).toFixed(4); 
    } else {
        bytes = 0;
    }
    return bytes;
}

const main = async () => {

    const { execSync } = await req("child_process");
    const fs = await req('fs');
    const path = await req('path');
    const request = await req('request');
    
    const pulseUri = 'https://pulse-us-east-1.qtestnet.com/webhook/eac385b4-4ae8-47ff-a6a5-74d1554ceb7e';   // Pulse parser webhook endpoint
    const projectId = '74528';  // target qTest Project ID
    const cycleId = '7903588';  // target qTest Test Cycle ID
    const projectName = 'demo'; // source Provar project name
    
    var result = '';
    
    
    // Build command line for test execution.  Place any scripts surrounding build/test procedures here.
    // Comment out this section if build/test execution takes place elsewhere.
    let command = 'xvfb-run ant -f /home/devprvrtemp/' + projectName + '/ANT/build.xml';
    
    console.log(`=== executing command ===`);
    console.log(command);
    execSync(command, {stdio: "inherit"});
    console.log(`=== command completed ===`);
    //Build section end.
   
    // Edit this to reflect your results file, be certain to escape back slashes (\).
    let resultsPath = '/home/devprvrtemp/' + projectName + '/ANT/Results/JUnit.xml';
    
    try {
        result = fs.readFileSync(resultsPath, 'ascii');
        console.log('=== read results file successfully ===');
    } catch(e) {
        console.log('=== error: ', e.stack, ' ===');
    }
    
    let buff = new Buffer.from(result);
    let base64data = buff.toString('base64');

    let payloadBody = {
            'projectId': projectId,
            'testcycle': cycleId,
            'result': base64data
        };

    let bufferSize = await formatSizeUnits(Buffer.byteLength(JSON.stringify(payloadBody), 'ascii'));

    console.log('=== info: payload size is ' + bufferSize + ' MB ===');
    if (bufferSize > 50) {
        console.log('=== error: payload size is greater than 50 MB cap, exiting ===');
        process.exit();
    }
    
    var opts = {
        url: pulseUri,
        json: true,
        body: payloadBody
    };
    
    console.log(`=== uploading results... ===`)
    return request.post(opts, function (err, response, resbody) {
        if (err) {
            Promise.reject(err);
        }
        else {
            //console.log(response);
            //console.log(resbody);
            Promise.resolve("Uploaded results successfully.");
        }
    });
};

main();