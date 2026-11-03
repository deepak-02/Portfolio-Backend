import 'dotenv/config';
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const app = express();

var corsOptions = {
    origin: "*"
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the application." });
});

// Import routes
import contactRoutes from "./routes/contact.routes.js";

// app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);

// ---------------------------------------------------------------
// MongoDB — optional. The server and email sending never depend on it.
// ---------------------------------------------------------------
mongoose.set("bufferCommands", false); // fail fast instead of queueing queries while disconnected

const MONGO_URI = process.env.MONGODB_URI;
let mongoRetryMs = 5000;

async function connectMongo() {
  if (!MONGO_URI) {
    console.warn("MONGODB_URI not set — running without database (emails still work)");
    return;
  }
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    mongoRetryMs = 5000;
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error(`MongoDB connection failed (emails still work): ${err.message}. Retrying in ${mongoRetryMs / 1000}s`);
    setTimeout(connectMongo, mongoRetryMs).unref();
    mongoRetryMs = Math.min(mongoRetryMs * 2, 5 * 60 * 1000);
  }
}
mongoose.connection.on("error", (err) => console.error("MongoDB error (emails still work):", err.message));
mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected (emails still work)"));
connectMongo();

// Never let a stray error take the whole server (and email sending) down.
process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/.`);
});
