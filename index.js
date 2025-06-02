const express = require('express');
const cors = require('cors');
const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config()

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


var admin = require("firebase-admin");

var serviceAccount = require("./firebase-admin-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const logger = (req, res, next) => {
    console.log('inside the middleware');
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    console.log('cookie in the middleware', token);
    if (!token) {
        return res.status(401).send({
            message: 'unauthorized access'
        })
    }

    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({
                message: 'unauthorized access'
            })
        }
        req.decoded = decoded
        console.log(decoded);
        next();
    })
}

const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({
            message: 'unauthorized access'
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        //console.log('decoded token', decoded);
        req.decoded = decoded;
        next();
    } catch (error) {
        return res.status(401).send({
            message: 'unauthorized access'
        });
    }
}

const verifyTokenEmail = (req, res, next) => {
    if (req.query.email !== req.decoded.email) {
        return res.status(403).send({
            message: 'forbidden access'
        })
    }
    next();
}

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

        //jwt token related api
        app.post('/jwt', async (req, res) => {
            const userData = req.body;
            const token = jwt.sign(userData, process.env.JWT_ACCESS_SECRET, {
                expiresIn: '1d'
            });

            res.cookie('token', token, {
                httpOnly: true,
                secure: false
            })

            res.send({
                success: true
            });
        })

        //jobs api
        app.get('/jobs', async (req, res) => {
            const email = req.query.email;
            const query = {};

            if (email) {
                query.hr_email = email;
            }

            const result = await jobsCollection.find(query).toArray();
            res.send(result);
        })


        app.get('/jobs/applications', verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
            const email = req.query.email;

            const query = {
                hr_email: email
            };

            const jobs = await jobsCollection.find(query).toArray();

            for (const job of jobs) {
                const applicationQuery = {
                    jobId: job._id.toString()
                };
                const application_count = await applicationsCollection.countDocuments(applicationQuery);
                job.application_count = application_count;
            }
            res.send(jobs);
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

        app.get('/applications', logger, verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
            const email = req.query.email;
            // if (email !== req.decoded.email) {
            //     return res.status(403).send({
            //         message: 'forbidden access'
            //     })
            // }
            // console.log('inside applications', req.cookies)

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

        app.patch('/applications/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id)
            };
            const updatedDoc = {
                $set: {
                    status: req.body.status
                }
            }
            const result = await applicationsCollection.updateOne(filter, updatedDoc);
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