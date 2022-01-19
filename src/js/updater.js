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
const testString = x = `{{site.data.keyword.attribute-definition-list}}

# What is {{site.data.keyword.cloud_notm}} for Financial Services?
    {: #what-is-fscloud}

{{site.data.keyword.cloud_notm}} for Financial Services is a solution platform and ecosystem program built on an industry-informed framework of controls, architectures, and operations that mitigates systemic risk in using public cloud for mission-critical workloads with client-sensitive data.
{: shortdesc}

To view all services that are Financial Services Validated in {{site.data.keyword.cloud_notm}}, go to the [catalog](https://cloud.ibm.com/catalog?search=label%3Afs_ready#services) and select the **Financial Services Validated** filter in the Compliance section.

However, there are required services to use to maintain an {{site.data.keyword.cloud_notm}} for Financial Services solution. Others are optional. The following services are required for a validated architecture when using {{site.data.keyword.vpc_full}} services.

* {{site.data.keyword.cloud_notm}} Activity Tracking (requires the use of {{site.data.keyword.cos_full_notm}})
* {{site.data.keyword.cloud_notm}} {{site.data.keyword.alb_full}}
* {{site.data.keyword.cloud_notm}} {{site.data.keyword.fl_full}}
* {{site.data.keyword.iamlong}}
* {{site.data.keyword.cos_full_notm}} or {{site.data.keyword.block_storage_is_full}}
* {{site.data.keyword.tg_full_notm}}
* {{site.data.keyword.vpc_full}}
* {{site.data.keyword.cloud_notm}} {{site.data.keyword.vpe_full}}
* {{site.data.keyword.cloud_notm}} {{site.data.keyword.vpn_full}} or {{site.data.keyword.dl_full_notm}} (Connect and Dedicated 2.0)
* {{site.data.keyword.IBM_notm}} {{site.data.keyword.hscrypto}}
* {{site.data.keyword.openshiftlong_notm}} or {{site.data.keyword.vsi_is_full}}

For the most security, it's recommended that you use the {{site.data.keyword.cloud_notm}} CLI to create resources by using [private endpoints](/docs/cli?topic=cli-service-connection).
{: tip}

You can also set your team up to be alerted if they are creating a service that is not Financial Services Validated by enabling the Financial Services Validated setting in your account. For more information, see [Validate financial services for your account](/docs/account?topic=account-enabling-fs-validated).

To learn more about {{site.data.keyword.cloud_notm}} for Financial Services, see the [product page](https://www.ibm.com/cloud/financial-services).`

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
//Tested - Works
function replaceString(string, pattern, replacement){
    return string.replace(pattern, replacement)
}


function removeSingleHandlebars(string) {
    const pattern = /{:.*}/
    const replacement = ''
    while (string.match(pattern)){
        string = replaceString(string, pattern, replacement)
    }
    return string
}

// Tested - Works
function removeLinks(string){
    for (const link of string.matchAll((/\[(.*)\]\(.*\)/g))){
        string = string.replace(link[0], link[1])
        console.log()
    }
    return string
}

//Tested - Works
function removeSpaces(string){
    while (string.includes('\n\n\n')) {
        string = string.replace('\n\n\n', '\n\n')
    }
    return string
}
// Tested - Works
function parseString(string){
    for (const x of [...string.matchAll(/{{[^{}]*}}/g)]){
        console.log(x)
        string = string.replace(x, replacementDictionary[x])
    }
    return string
}

function all(string){
    return removeSpaces(parseString(removeLinks(removeSingleHandlebars(string)))).trim()
}