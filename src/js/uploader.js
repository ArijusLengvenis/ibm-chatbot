/** @module uploader */

const fs = require("fs/promises")
const { Readable } = require("stream")
const DiscoveryV2 = require("ibm-watson/discovery/v2")
const { IamAuthenticator } = require("ibm-watson/auth")

// Initialize Discovery
const DiscoveryProjectId = "2c0357b0-0db4-4221-9232-603e2fa7620e"
const DiscoveryCollectionId = "83726344-5e20-0c2f-0000-017f5ab396dd"
const discovery = new DiscoveryV2({
    version: "2020-08-30",
    authenticator: new IamAuthenticator({
        apikey: "ULy11n-gyvIUsJTwaznF2vgAZi9b6_CF1sNujQL1h7vD"
    }),
    serviceUrl:
        "https://api.eu-gb.discovery.watson.cloud.ibm.com/instances/77e84b65-0ac2-484a-bb22-fdf65c95f54d"
})

/**
 * Upload a split-up file or document to Discovery
 * @instance
 * @param {string} baseDocumentId The id of the document
 * @param {string} baseDocumentName The name of the document
 * @param {object} data The data to upload in JSON form. Each key-value pair will be uploaded as a seperate document.
 */
async function uploadSplitDocument(baseDocumentId, baseDocumentName, data) {
    if (data == null || baseDocumentId == null || baseDocumentName == null) {
        return false
    }
    if (
        Object.keys(data) == 0 ||
        baseDocumentId == "" ||
        baseDocumentName == ""
    ) {
        return false
    }
    try {
        // Get info from last time the document was uploaded
        const CurrentDocumentPath = `src/json/${baseDocumentName}`
        const currentDocument = await fs.readFile(CurrentDocumentPath, {
            encoding: "utf-8"
        })
        const currentDocumentJSON = JSON.parse(currentDocument)
        const documentCount = Object.keys(currentDocumentJSON).length

        // Init dict to store the updated document
        let newDocument = {}

        // Loop through all key-value pairs of the data and upload each as an individual document
        let i = 0
        for (const [key, value] of Object.entries(data)) {
            const splitDocument = {
                question: [key],
                answer: [value]
            }
            const splitDocumentId = `${baseDocumentId}_${i}`
            newDocument[splitDocumentId] = splitDocument

            uploadDocument(
                splitDocumentId,
                baseDocumentName,
                Readable.from(JSON.stringify(splitDocument)),
                "application/json"
            )
            i += 1
        }

        // Delete all documents that no longer exist in the updated version
        while (i < documentCount) {
            const splitDocumentId = `${baseDocumentId}_${i}`
            deleteDocument(splitDocumentId)
            i += 1
        }

        // Update the info stored locally on the uploaded documents
        await fs.writeFile(CurrentDocumentPath, JSON.stringify(newDocument))
        return true
    } catch (err) {
        console.error(err)
        return false
    }
}

/**
 * Upload a file or document to Discovery
 * @instance
 * @param  {string} documentId The id of the document
 * @param  {string} name The name of the document
 * @param  {(NodeJS.ReadableStream|Buffer)} buffer The content of the document
 * @param  {string} mime The content type of the uploaded document
 * @returns {Promise<boolean>} Document successfully uploaded
 */
async function uploadDocument(documentId, name, buffer, mime) {
    try {
        await discovery.updateDocument({
            projectId: DiscoveryProjectId,
            collectionId: DiscoveryCollectionId,
            documentId: documentId,
            file: buffer,
            filename: name,
            fileContentType: mime
        })
        return true
    } catch (err) {
        return false
    }
}

/**
 * Delete a document from Discovery
 * @instance
 * @param {string} documentId The id of the document to delete
 */
async function deleteDocument(documentId) {
    try {
        await discovery.deleteDocument({
            projectId: DiscoveryProjectId,
            collectionId: DiscoveryCollectionId,
            documentId: documentId
        })
        return true
    } catch (err) {
        return false
    }
}

module.exports = {
    uploadDocument: uploadDocument,
    uploadSplitDocument: uploadSplitDocument,
    deleteDocument: deleteDocument
}
