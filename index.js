const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = 3000;
const admin = require("firebase-admin");
const serviceAccount = require("./firebaseService.json");
const cors = require("cors");
require("dotenv").config();
app.use(express.json());
app.use(cors());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.db_username}:${process.env.db_pass}@cluster0.8rgzblm.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {  



    // await   client.connect();



    const db = client.db("EcoMotion-db");
    const ecoEvents = db.collection("events");

    //  Only show upcoming events
    app.get("/events", async (req, res) => {
      try {
        const today = new Date();
        const result = await ecoEvents
          .find({ date: { $gt: today } }) // future events only
          .sort({ date: 1 }) // sort earliest first
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching upcoming events:", error);
        res.status(500).send({ success: false, message: "Server Error" });
      }
    });

    // {{{{event post}}}}

    app.post("/events", async (req, res) => {
      try {
        const data = req.body;

        const event = {
          ...data,
          createdByEmail: data.createdByEmail,
          joinedUsers: [data.createdByEmail],
          date: new Date(data.date),
        };

        const result = await ecoEvents.insertOne(event);
        res.send({ success: true, result });
      } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).send({ success: false, message: "Server Error" });
      }
    });

    // {{{{{{join event}}}}}}

    app.patch("/join/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { email } = req.body;

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $addToSet: { joinedUsers: email },
        };

        const result = await ecoEvents.updateOne(filter, updateDoc);
        res.send({ success: true, result });
      } catch (error) {
        console.error("Error joining event:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to join event" });
      }
    });

    app.get("/events/:id", async (req, res) => {
      const { id } = req.params;
      console.log(id);
      const result = await ecoEvents.findOne({ _id: new ObjectId(id) });
      res.send({
        result,
      });
    });

    // {{{{{joined router}}}}}

    app.get("/joined", async (req, res) => {
      try {
        const email = req.query.email;
        const result = await ecoEvents
          .find({
            $or: [{ createdByEmail: email }, { joinedUsers: { $in: [email] } }],
          })
          .sort({ date: 1 })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching joined events:", error);
        res.status(500).send({ success: false, message: "Server Error" });
      }
    });

    // {{{{{manage events}}}}}

    app.get("/manage", async (req, res) => {
      try {
        const email = req.query.email;
        const result = await ecoEvents
          .find({ createdByEmail: email })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching manage events:", error);
        res.status(500).send({ success: false, message: "Server Error" });
      }
    });

    app.put("/events/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const data = req.body;

        if (data._id) {
          delete data._id;
        }

        const result = await ecoEvents.updateOne(
          { _id: new ObjectId(id) },
          { $set: data }
        );

        res.send({ modifiedCount: result.modifiedCount });
      } catch (err) {
        console.error("UPDATE ERROR:", err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });
    //latest 6
    app.get("/latest", async (req, res) => {
      try {
        const result = await ecoEvents
          .find()
          .sort({ date: -1 })
          .limit(6)
          .toArray();

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({ success: false, message: "Server Error" });
      }
    });

    app.get("/search", async (req, res) => {
      const { search, eventType } = req.query;
      const query = {};

      //  Search by title (case-insensitive)
      if (search && search.trim() !== "") {
        query.title = { $regex: search.trim(), $options: "i" };
      }

      //  Filter by event type
      if (eventType && eventType !== "all") {
        query.eventType = eventType;
      }

      //  Only show events with future dates (upcoming)
      const today = new Date();
      query.date = { $gt: today };

      try {
        //  Sort by date (soonest first)
        const result = await ecoEvents.find(query).sort({ date: 1 }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ error: "Failed to fetch upcoming events" });
      }
    });

    // {{{{delete}}}}

    app.delete("/events/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await ecoEvents.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount > 0) {
          res.send({ success: true });
        } else {
          res.send({ success: false });
        }
      } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).send({ success: false });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Everything is fine");
});


app.listen(port, () => {
  console.log(`Example app listening in port ${port}`);
});
