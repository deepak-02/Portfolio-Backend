import 'dotenv/config';
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const app = express();

var corsOptions = {
    origin: "*"
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the application." });
});

// Import routes
import contactRoutes from "./routes/contact.routes.js";

// app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/portfolio")
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
    });

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/.`);
});
