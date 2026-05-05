require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

const app = express();
connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => res.json({ status: "Smart City API running 🚀" }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/history", require("./routes/historyRoutes"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));