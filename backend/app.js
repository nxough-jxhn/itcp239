const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const multer = require("multer");
const config = require("./config");
const userRoutes = require("./routes/users");
const categoryRoutes = require("./routes/categories");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const stockAlertRoutes = require("./routes/stockAlerts");
const promoRoutes = require("./routes/promos");
const wishlistRoutes = require("./routes/wishlist");

const app = express();

// Respect X-Forwarded-* headers from Render's reverse proxy.
app.set("trust proxy", 1);

function resolveActionLabel(method, pathWithQuery = "") {
  const path = String(pathWithQuery || "").split("?")[0];
  const m = String(method || "").toUpperCase();

  if (path.endsWith("/health") && m === "GET") return "Health check";

  if (path.includes("/users/register") && m === "POST") return "Register user";
  if (path.includes("/users/login") && m === "POST") return "Login user";
  if (path.includes("/users/auth/google") && m === "POST") return "Google login";
  if (path.includes("/users/profile/image") && m === "PUT") return "Update profile image";
  if (path.includes("/users/profile") && m === "PUT") return "Update user profile";
  if (path.includes("/users/push-token") && m === "POST") return "Register push token";
  if (path.includes("/users/push-token") && m === "DELETE") return "Clear push token";
  if (/\/users\/[^/]+$/.test(path) && m === "GET") return "Load user profile";

  if (path.includes("/categories") && m === "GET") return "List categories";
  if (path.includes("/categories") && m === "POST") return "Create category";
  if (/\/categories\/[^/]+$/.test(path) && m === "PUT") return "Update category";
  if (/\/categories\/[^/]+$/.test(path) && m === "DELETE") return "Delete category";

  if (path.includes("/products/reviews/latest") && m === "GET") return "Load latest reviews";
  if (/\/products\/[^/]+\/reviews\/me$/.test(path) && m === "GET") return "Load my review";
  if (/\/products\/[^/]+\/reviews$/.test(path) && m === "GET") return "List product reviews";
  if (/\/products\/[^/]+\/reviews$/.test(path) && m === "POST") return "Create review";
  if (/\/products\/[^/]+\/reviews\/[^/]+$/.test(path) && m === "PUT") return "Update review";
  if (path.includes("/products") && m === "GET") return "List products";
  if (/\/products\/[^/]+$/.test(path) && m === "GET") return "Load product detail";
  if (path.endsWith("/products") && m === "POST") return "Create product";
  if (/\/products\/[^/]+$/.test(path) && m === "PUT") return "Update product";
  if (/\/products\/[^/]+$/.test(path) && m === "DELETE") return "Delete product";

  if (path.includes("/orders") && m === "GET") return "Load orders";
  if (path.endsWith("/orders") && m === "POST") return "Create order";
  if (/\/orders\/[^/]+$/.test(path) && m === "PUT") return "Update order status";
  if (/\/orders\/[^/]+\/notify$/.test(path) && m === "POST") return "Notify order user";

  if (path.includes("/stock-alerts") && m === "GET") return "Load stock alerts";

  if (path.includes("/promos/validate-voucher") && m === "POST") return "Validate voucher";
  if (path.includes("/promos/active-vouchers") && m === "GET") return "List active vouchers";
  if (path.includes("/promos/broadcast") && m === "POST") return "Broadcast promo";
  if (/\/promos\/[^/]+\/notify$/.test(path) && m === "POST") return "Notify promo users";
  if (/\/promos\/[^/]+\/deactivate$/.test(path) && m === "POST") return "Deactivate promo";
  if (/\/promos\/[^/]+\/reactivate$/.test(path) && m === "POST") return "Reactivate promo";
  if (path.includes("/promos") && m === "GET") return "Load promos";
  if (path.endsWith("/promos") && m === "POST") return "Create promo";
  if (/\/promos\/[^/]+$/.test(path) && m === "PUT") return "Update promo";

  if (path.includes("/wishlist/ids") && m === "GET") return "Load wishlist ids";
  if (path.includes("/wishlist") && m === "GET") return "Load wishlist";
  if (path.includes("/wishlist") && m === "POST") return "Add wishlist item";
  if (/\/wishlist\/[^/]+$/.test(path) && m === "DELETE") return "Remove wishlist item";

  return "API request";
}

morgan.token("action", (req) => {
  return resolveActionLabel(req.method, req.originalUrl || req.url || "");
});

morgan.token("statusIcon", (_req, res) => {
  const statusCode = Number(res.statusCode || 0);
  if (statusCode >= 500) return "ERR";
  if (statusCode >= 400) return "WARN";
  return "OK";
});

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(
    "[api][:statusIcon] :method :url :status :response-time ms | :action"
  )
);
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

app.use((err, _req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: `Image too large. Max size is ${config.maxFileSizeMb}MB.`,
      });
    }

    return res.status(400).json({ message: err.message || "Upload failed" });
  }

  return next(err);
});

module.exports = app;
