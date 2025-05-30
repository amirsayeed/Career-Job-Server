const express = require('express');
const cors = require('cors');
const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config()

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tnmpmcr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        // await client.db("admin").command({
        //     ping: 1
        // });
        const jobsCollection = client.db("careerJob").collection("jobs");
        const applicationsCollection = client.db("careerJob").collection("applications");

        app.get('/jobs', async (req, res) => {
            const email = req.query.email;
            const query = {};

            if (email) {
                query.hr_email = email;
            }

            const result = await jobsCollection.find(query).toArray();
            res.send(result);
        })


        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            };
            const result = await jobsCollection.findOne(query);
            res.send(result);
        })

        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        })

        //job_applications

        app.get('/applications', async (req, res) => {
            const email = req.query.email;
            const query = {
                applicant: email
            };
            const result = await applicationsCollection.find(query).toArray();

            for (const application of result) {
                const jobId = application.jobId;
                const jobQuery = {
                    _id: new ObjectId(jobId)
                };
                const job = await jobsCollection.findOne(jobQuery);
                application.title = job.title;
                application.company = job.company;
                application.company_logo = job.company_logo;
            }
            res.send(result);
        })

        app.get('/applications/job/:job_id', async (req, res) => {
            const job_id = req.params.job_id;
            const query = {
                jobId: job_id
            };
            const result = await applicationsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/applications', async (req, res) => {
            const application = req.body;
            //console.log(application);
            const result = await applicationsCollection.insertOne(application);
            res.send(result);
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Career Job is running")
})

app.listen(port, () => {
    console.log(`Career Job is running on port: ${port}`)
})