
const fs = require("fs/promises");
const { Readable } = require("stream")
const DiscoveryV2 = require("ibm-watson/discovery/v1");
const { IamAuthenticator } = require("ibm-watson/auth");

// Initialize Discovery
const DiscoveryEnvironmentId = "8417abb8-ac0e-4576-b24b-a4c42be9010c"
const DiscoveryCollectionId = "cfc05e8d-9526-4d0f-bff0-36a41b5bdfc1"
const discovery = new DiscoveryV2({
  version: "2020-08-30",
  authenticator: new IamAuthenticator({
    apikey: "mX_B5TCqyDo99vl3YUuB-rC5qfLodj6fNt4wqLsNFgH7",
  }),
  serviceUrl:
    "https://api.eu-gb.discovery.watson.cloud.ibm.com/instances/ed97e2db-2a2a-4965-afd7-119eaaa5f34d",
})

/**
 * Upload a split-up file or document to Discovery 
 * @param {string} baseDocumentId The id of the document
 * @param {string} baseDocumentName The name of the document
 * @param {object} data The data to upload in JSON form. Each key-value pair will be uploaded as a seperate document.
 */
 async function uploadSplitDocument(baseDocumentId, baseDocumentName, data) {
    try {
      // Get info from last time the document was uploaded
      const CurrentDocumentPath = `src/json/${baseDocumentName}`
      const currentDocument = await fs.readFile(CurrentDocumentPath, {
        encoding: "utf-8"
      })
      const currentDocumentJSON = JSON.parse(currentDocument)
      const documentCount = Object.keys(currentDocumentJSON).length;
  
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
  
        uploadDocument(splitDocumentId, baseDocumentName, Readable.from(JSON.stringify(splitDocument)), "application/json")
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
    } catch (err) {
      console.error(err)
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
        environmentId: DiscoveryEnvironmentId,
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
      discovery.deleteDocument({
        environmentId: DiscoveryEnvironmentId,
        collectionId: DiscoveryCollectionId,
        documentId: documentId
      })
     } catch (err) {
       console.error(err)
     }
  }

module.exports = {
    uploadDocument: uploadDocument,
    uploadSplitDocument: uploadSplitDocument,
    deleteDocument: deleteDocument
}