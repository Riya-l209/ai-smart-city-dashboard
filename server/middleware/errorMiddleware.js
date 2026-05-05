const errorHandler = (err, req, res, next) => {
  const status = res.statusCode === 200 ? 500 : res.statusCode;
  console.error("❌", err.message);
  res.status(status).json({
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

module.exports = { errorHandler, notFound };