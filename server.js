require("dotenv").config({ path: "./configs/.env" });
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const databaseConnection = require("./configs/db");
const UserRouter = require("./routers/user");
const StripeRouter = require("./routers/stripe");

app.use("uploads", express.static(path.resolve(__dirname, "uploads")));

app.use("/api/v1/stripe", StripeRouter);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "*",
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  return res.status(200).json({ message: "App is running" });
});

databaseConnection();

app.use("/api/v1/user", UserRouter);

app.listen(process.env.PORT, () => {
  console.log(`App is running on ${process.env.PORT}`);
});
