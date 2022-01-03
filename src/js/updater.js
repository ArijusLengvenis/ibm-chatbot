const fetch = require('node-fetch')

const TIME = 86400*1000;
let { Hashes } = require('../json/Hashes.json');
const exec = require('child_process').exec;

function CheckHash(updateData, cb)
{
    exec(`git ls-remote ${updateData.gitLink}`,
        function (error, stdout, stderr) {
            let arr = stdout.split('HEAD');
            cb(arr[0].trim());
    });
}

function GetFile(updateData, cb)
{
    const data = [];
    updateData.fileUrls.forEach(async (fileUrl, i) => {
        const url = "https://raw.githubusercontent.com/ibm-cloud-docs/overview/master/fscloud.md";
        const response = await fetch(url);
        const newData = await response.text();
        data.push(newData)
        if (i == updateData.fileUrls.length-1)
            cb(data);
    });
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    AutoUpdater: async function ()
    {
        while (true)
        {
            Hashes.forEach(updateData => {
                CheckHash(updateData, (hash) => {
                    if (!hash)
                        throw Error;
                    const found = (updateData.hash === hash);
                    if (!found)
                    {
                        GetFile(updateData, (files) => {
                            console.log(files);
                            if (!files)
                                throw Error;
                            console.log(files);
                            files.forEach(file => {
                                //const parsedFile = Parser(file)
                                //send to Disc
                                updateData.hash = hash;
                            })
                        });
                    }
                });
            })
            await timeout(TIME);
        }
    }
}