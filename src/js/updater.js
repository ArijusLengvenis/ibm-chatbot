const fetch = require('node-fetch')

const TIME = 86400*1000;
let { Hashes } = require('../json/Hashes.json');
const exec = require('child_process').exec;

function CheckHash(updateData, cb)
{
    exec(`git ls-remote ${updateData.repoUrl}`,
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

// Parser Functions
const replacementDictionary = {
    '{{site.data.keyword.attribute-definition-list}}': '',
    '{{site.data.keyword.cloud_notm}}': 'IBM Cloud',
    '{{site.data.keyword.cos_full_notm}}': 'IBM Cloud Object Storage',
    '{{site.data.keyword.alb_full}}':'Application Load Balancer for VPC',
    '{{site.data.keyword.vpc_full}}':'IBM Cloud® Virtual Private Cloud',
    '{{site.data.keyword.iamlong}}':'IBM Cloud® Identity and Access Management',
    '{{site.data.keyword.fl_full}}':'Flow Logs for VPC',
    '{{site.data.keyword.block_storage_is_full}}':'IBM® Cloud Block Storage for Virtual Private Cloud',
    '{{site.data.keyword.tg_full_notm}}':'IBM Cloud Transit Gateway',
    '{{site.data.keyword.vpe_full}}':'Virtual Private Endpoint (VPE) for VPC',
    '{{site.data.keyword.vpn_full}}':'Virtual Private Network (VPN) for VPC',
    '{{site.data.keyword.dl_full_notm}}':'IBM Cloud Direct Link',
    '{{site.data.keyword.IBM_notm}}':'IBM',
    '{{site.data.keyword.hscrypto}}':'Hyper Protect Crypto Services',
    '{{site.data.keyword.openshiftlong_notm}}':'Red Hat OpenShift on IBM Cloud',
    '{{site.data.keyword.vsi_is_full}}':'IBM Cloud® Virtual Servers for Virtual Private Cloud'
}

function replaceString(string, pattern, replacement){
    return string.replace(pattern, replacement)
}

function eliminateSingleHandleBars(string) {
    const pattern = /{:.*}/
    const replacement = ''
    return replaceString(string, pattern, replacement)
}

// This one isn't finished, will do soon.
function removeLinks(string){
    return string
}

// def removeLinks(string):
//     for x, y in zip(re.findall('\[.*\]\(.*\)', string), re.findall('\[(.*)\]\(.*\)', string)):
//         string = string.replace(x, y)
//     return string

function removeSpaces(string){
        while (string.includes('\n\n\n')) {
            string = string.replace('\n\n\n', '\n\n')
        }
        return string
}

function parseString(string){
        for (const x in string.matchAll(/{{[^{}]*}}/) ){
            string = string.replace(x, replacementDictionary[x])
        }
        return string
}

function all(string){
    return removeSpaces(parseString(removeLinks(eliminateSingleHandleBars(string)))).trim()
}