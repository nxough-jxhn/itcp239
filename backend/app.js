const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const config = require("./config");
const userRoutes = require("./routes/users");
const categoryRoutes = require("./routes/categories");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const stockAlertRoutes = require("./routes/stockAlerts");
const promoRoutes = require("./routes/promos");
const wishlistRoutes = require("./routes/wishlist");

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(`/${config.uploadDir}`, express.static(path.resolve(process.cwd(), config.uploadDir)));

app.use(`${config.apiPrefix}/users`, userRoutes);
app.use(`${config.apiPrefix}/categories`, categoryRoutes);
app.use(`${config.apiPrefix}/products`, productRoutes);
app.use(`${config.apiPrefix}/orders`, orderRoutes);
app.use(`${config.apiPrefix}/stock-alerts`, stockAlertRoutes);
app.use(`${config.apiPrefix}/promos`, promoRoutes);
app.use(`${config.apiPrefix}/wishlist`, wishlistRoutes);

app.get(`${config.apiPrefix}/health`, (_req, res) => {
  res.status(200).json({ ok: true, message: "Backend config scaffold is running." });
});

module.exports = app;
