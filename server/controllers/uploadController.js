const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const Upload = require("../models/Upload");

exports.uploadAndProcess = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const filePath = req.file.path;
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath), req.file.originalname);

    const mlRes = await axios.post(
      `${process.env.ML_API_URL}/predict`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const { mask_base64, overlay_base64, stats } = mlRes.data;

    const upload = await Upload.create({
      user: req.user._id,
      originalImage: `/uploads/${req.file.filename}`,
      maskImage: mask_base64,
      overlayImage: overlay_base64,
      stats,
      location: {
        lat: req.body.lat ? parseFloat(req.body.lat) : 28.6139,
        lng: req.body.lng ? parseFloat(req.body.lng) : 77.209,
      },
    });

    res.status(201).json(upload);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};