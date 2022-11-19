const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()

const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3njemyu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {
    try {
        const appointments_options_collection = client.db("Doctors_portal").collection("appointmentOptions");
        const booking_collection = client.db("Doctors_portal").collection("booking");

        app.get('/appointmentOptions', async (req, res) => {
            const option = await appointments_options_collection.find({}).toArray();
            res.send(option);
        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await booking_collection.insertOne(booking);
            res.json(result);
        });
    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.listen(port, () => {
    console.log('Server started on port 5000');
});