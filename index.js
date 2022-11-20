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

        app.get('/v2/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            const options = await appointments_options_collection.aggregate([
                {
                    $lookup: {
                        from: 'booking',
                        localField: 'name',
                        foreignField: 'treatment',
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$appointmentDate', date]
                                    }
                                }
                            }
                        ],
                        as: 'booked'
                    }
                },
                {
                    $project: {
                        name: 1,
                        slots: 1,
                        booked: {
                            $map: {
                                input: '$booked',
                                as: 'book',
                                in: '$$book.slot'
                            }
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        slots: {
                            $setDifference: ['$slots', '$booked']
                        }
                    }
                }
            ]).toArray();
            res.send(options);
        })

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