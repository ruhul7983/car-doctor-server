const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
// Middle Wire
app.use(cors({
  origin: [
    'https://car-doctor-fec9d.web.app',
    'https://car-doctor-fec9d.firebaseapp.com',
    'http://localhost:5173',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// const logger = async (req, res, next) => {
//   console.log('called: ', req.host, req.originalUrl);
//   next();
// }

// const verifyToken = async (req, res, next) => {
//   const token = req.cookies?.token;
//   console.log("Value of token in middleware", token);
//   if (!token) {
//     return res.status(401).send({ message: "Access Denied" })
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       console.log(err);
//       return res.status(401).send({ message: "Unauthorized" })
//     }
//     console.log("value in the token", decoded);
//     req.user=decoded;
//     next();

//   })
// }

const logger = (req, res, next) => {
  console.log('called: ', req.host, req.originalUrl);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log( "Token in middle Layer: ",token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Unauthorized" })
    }
    req.user = decoded;
    next();

  })
}

//

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rsqtl7q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("booking");

    // auth
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });

    })


    app.post("logout", async (req, res) => {
      // const user = req.body;
      // console.log("logout user", user);
      res
        .clearCookie("token", { maxAge: 0 })
        .send({ success: true })
    })

    // Services
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    })

    // Bookings

    app.get("/bookings", logger, verifyToken, async (req, res) => {
      // console.log("Token ", req.cookies.token);
      // const token = req.cookies.token;
      // // console.log("Token: ", req.cookies.token);
      console.log("user in valid token", req.user);

      if(req.query.email !== req.user?.email){
        return res.status(403).send({message:"Forbidden Access"});
      }
      
      console.log("Cookkies in bookings ", req.cookies);

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);

    })
    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      console.log(bookings);
      const result = await bookingCollection.insertOne(bookings);
      res.send(result);

    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("Doctor server is running");
})



app.listen(port, () => {
  console.log("Running port ", port);
});