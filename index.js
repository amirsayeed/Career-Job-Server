const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send("Career Job is running")
})

app.listen(port, () => {
    console.log(`Career Job is running on port: ${port}`)
})