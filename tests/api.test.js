import 'regenerator-runtime/runtime'

const request = require('supertest');
const app = require("../app");
const updater = require("../src/js/updater");
const uploader = require("../src/js/uploader");
const { Hashes } = require('../src/json/Hashes.json');
const { testStrings } = require('../src/json/Dummy.json');

let session_id;



describe('Unit test suite', () => {
    describe('unit_test_01', () => {
        it('tests (POST) /createsession endpoint', async() => {
            const response = await request(app).post("/createsession");
            expect(Object.keys(response.body).length).toEqual(1);
            expect(typeof(response.body.session_id)).toEqual("string");
            expect(response.statusCode).toBe(201);
            session_id = response.body.session_id;
        });
    })
    
    describe('unit_test_02', () => {
        it('tests (POST) /send endpoint - valid question', async() => {
            const response = await request(app).post("/send")
            .send({
                sessionId: session_id,
                message: 'What is cloud for financial services?'
            });
            expect(Object.keys(response.body).length).toBeGreaterThanOrEqual(1);
            expect(Object.keys(response.body).length).toBeLessThanOrEqual(5);
            expect(typeof(response.body[0].id)).toEqual("string");
            expect(typeof(response.body[0].header)).toEqual("string");
            expect(typeof(response.body[0].text)).toEqual("string");
            expect(typeof(response.body[0].confidence)).toEqual("number");
            expect(response.body[0].confidence).toBeGreaterThanOrEqual(0);
            expect(response.body[0].confidence).toBeLessThanOrEqual(1);
            expect(response.statusCode).toBe(200);
        });

        it('tests (POST) /send endpoint - invalid sessionId', async() => {
            const response = await request(app).post("/send")
            .send({
                message: 'What is cloud for financial services?'
            });
            expect(Object.keys(response.body).length).toEqual(1);
            expect(typeof(response.body.err)).toEqual("string");
            expect(response.body.err).toEqual("Session Id is missing");
            expect(response.statusCode).toBe(500);
        })

        it('tests (POST) /send endpoint - invalid message', async() => {
            const response = await request(app).post("/send")
            .send({
                sessionId: session_id
            });
            expect(Object.keys(response.body).length).toEqual(1);
            expect(typeof(response.body.err)).toEqual("string");
            expect(response.body.err).toEqual("Message is missing");
            expect(response.statusCode).toBe(500);
        })

        it('tests (POST) /send endpoint - empty string message', async() => {
            const response = await request(app).post("/send")
            .send({
                sessionId: session_id,
                message: ''
            });
            expect(Object.keys(response.body).length).toEqual(1);
            expect(typeof(response.body.err)).toEqual("string");
            expect(response.body.err).toEqual("Message is missing");
            expect(response.statusCode).toBe(500);
        })

        it('tests (POST) /send endpoint - random letter message', async() => {
            const response = await request(app).post("/send")
            .send({
                sessionId: session_id,
                message: 'jaksgnfdpsfgpohklbj'
            });
            expect(Object.keys(response.body).length).toEqual(1);
            expect(typeof(response.body[0].text)).toEqual("string");
            expect(response.body[0].text).toEqual("I searched my knowledge base, but did not find anything related to your query.");
            expect(response.statusCode).toBe(200);
        })
    })

    describe('unit_test_03', () => {
        test('tests checkHash function for connectivity with GitHub', () => {
            const updateData = Hashes[0];
            updater.checkHash(updateData, hash => {
                expect(typeof(hash)).toEqual("string");
            });
        });
    })

    describe('unit_test_04', () => {
        test('tests getFile function for retrieving files from GitHub', () => {
            const updateData = Hashes[0];
            updater.getFile(updateData, data => {
                expect(typeof(data)).toEqual("string");
            });
        });
    })

    describe('unit_test_05', () => {
        test('tests uploadSplitDocument function for uploading files to Discovery', async() => {
            const testFile = testStrings.testStringFormatted;
            const DocumentId = "ff5a9263-9377-39ea-2840-dbad819362f8";
            const name = "Overview_page.json";
            const result = await uploader.uploadSplitDocument(DocumentId, name, testFile);
            expect(result).toEqual(true);
            await uploader.deleteDocument(DocumentId)
        });

        test('tests uploadSplitDocument function with missing file data', async() => {
            const testFile = "";
            const DocumentId = "ff5a9263-9377-39ea-2840-dbad819362f8";
            const name = "Overview_page.json";
            const result = await uploader.uploadSplitDocument(DocumentId, name, testFile);
            expect(result).toEqual(false);
            await uploader.deleteDocument(DocumentId)        
        });

        test('tests uploadSplitDocument function with missing document ID', async() => {
            const testFile = testStrings.testStringFormatted;
            const DocumentId = "";
            const name = "Overview_page.json";
            const result = await uploader.uploadSplitDocument(DocumentId, name, testFile);
            await uploader.deleteDocument(DocumentId)
        });

        test('tests uploadSplitDocument function with missing name', async() => {
            const testFile = testStrings.testStringFormatted;
            const DocumentId = "ff5a9263-9377-39ea-2840-dbad819362f8";
            const name = "";
            const result = await uploader.uploadSplitDocument(DocumentId, name, testFile);
            expect(result).toEqual(false);
            await uploader.deleteDocument(DocumentId)
        });
    })

    describe('unit_test_06', () => {
        it('tests sending a rating to a query to Watson Discovery when the query is relevant', async() => {
            const query = testStrings.testQuery;
            const DocumentId = testStrings.testQueryId;
            const relevant = true;
            const oldRelevant = null;

            const response = await request(app).post("/rate")
            .send({
                query: query,
                documentId: DocumentId,
                relevant: relevant,
                oldRelevant: oldRelevant
            })
            expect(response.statusCode).toBe(204);

        }, 10000);

        it('tests sending a rating to a query to Watson Discovery when the query is irrelevant', async() => {
            const query = testStrings.testQuery;
            const DocumentId = testStrings.testQueryId;
            const relevant = false;
            const oldRelevant = null;

            const response = await request(app).post("/rate")
            .send({
                query: query,
                documentId: DocumentId,
                relevant: relevant,
                oldRelevant: oldRelevant
            })
            expect(response.statusCode).toBe(204);
        });

        it('tests sending a rating to a query to Watson Discovery when the query is irrelevant when past query was relevant', async() => {
            const query = testStrings.testQuery;
            const DocumentId = testStrings.testQueryId;
            const relevant = false;
            const oldRelevant = true;

            const response = await request(app).post("/rate")
            .send({
                query: query,
                documentId: DocumentId,
                relevant: relevant,
                oldRelevant: oldRelevant
            })
            expect(response.statusCode).toBe(204);
        });

        it('tests sending a rating to a query to Watson Discovery when the query is relevant when past query was irrelevant', async() => {
            const query = testStrings.testQuery;
            const DocumentId = testStrings.testQueryId;
            const relevant = true;
            const oldRelevant = false;

            const response = await request(app).post("/rate")
            .send({
                query: query,
                documentId: DocumentId,
                relevant: relevant,
                oldRelevant: oldRelevant
            })
            expect(response.statusCode).toBe(204);
        });

        it('tests sending a rating to a query to Watson Discovery when the query is irrelevant when past query was irrelevant', async() => {
            const query = testStrings.testQuery;
            const DocumentId = testStrings.testQueryId;
            const relevant = false;
            const oldRelevant = false;

            const response = await request(app).post("/rate")
            .send({
                query: query,
                documentId: DocumentId,
                relevant: relevant,
                oldRelevant: oldRelevant
            })
            expect(response.statusCode).toBe(204);
        });

        it('tests sending a rating to a query to Watson Discovery when the query is relevant when past query was relevant', async() => {
            const query = testStrings.testQuery;
            const DocumentId = testStrings.testQueryId;
            const relevant = true;
            const oldRelevant = true;

            const response = await request(app).post("/rate")
            .send({
                query: query,
                documentId: DocumentId,
                relevant: relevant,
                oldRelevant: oldRelevant
            })
            expect(response.statusCode).toBe(204);
        });
    })

    // Insert other tests below this line

    // Insert other tests above this line
});