const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());
//ACCESS_TOKEN

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3njemyu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function varifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(403).send({ message: "unauthorized Access" });
    } else {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
            if (err) {
                return res.status(403).send({ message: "Forbiden Access" });
            } else {
                req.decoded = decoded;
                next();
            }
        })
    }

}

async function run() {
    try {
        const appointments_options_collection = client.db("Doctors_portal").collection("appointmentOptions");
        const booking_collection = client.db("Doctors_portal").collection("booking");
        const users_collection = client.db("Doctors_portal").collection("users");

        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            const options = await appointments_options_collection.find({}).toArray();

            const booking_query = { appointmentDate: date };
            const already_booked = await booking_collection.find(booking_query).toArray();

            options.forEach(option => {
                const option_booker = already_booked.filter(booked => booked.treatment === option.name);
                const booked_slots = option_booker.map(booked => booked.slot);

                remaning_slots = option.slots.filter(slot => !booked_slots.includes(slot));
                option.slots = remaning_slots;
            })

            res.send(options);
        });

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;

            const query = { email: email };
            const user = await users_collection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '5h' });
                res.send({ accessToken: token });
            } else {
                res.status(401).send({ message: "unauthorized Access" });
            }
        })

        app.get('/bookings', varifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                res.status(403).send({ message: "Forbiden Access" });
            } else {
                const query = { email: email };
                const bookings = await booking_collection.find(query).toArray();
                res.send(bookings);
            }
        });

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await users_collection.find(query).toArray();
            res.send(users);

        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await users_collection.findOne(query)
            res.send({ isAdmin: user?.role === 'admin' })
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await booking_collection.insertOne(booking);
            res.json(result);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await users_collection.insertOne(user);
            res.send(result);
        });

        app.put('/users/admin/:id', varifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await users_collection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: "Forbiden Access" });
            }
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = { $set: { role: 'admin' } };
            const result = await users_collection.updateOne(filter, updatedDoc, options);
            res.send(result);
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