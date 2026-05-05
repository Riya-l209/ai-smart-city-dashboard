const Upload = require("../models/Upload");

exports.getHistory = async (req, res, next) => {
  try {
    const uploads = await Upload.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select("-maskImage -overlayImage"); // light list
    res.json(uploads);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const item = await Upload.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.deleteOne = async (req, res, next) => {
  try {
    const item = await Upload.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const uploads = await Upload.find({ user: req.user._id }).select("stats createdAt");
    const total = uploads.length;
    const avgCoverage =
      total === 0
        ? 0
        : uploads.reduce((s, u) => s + (u.stats?.road_coverage_percent || 0), 0) / total;
    const totalLength = uploads.reduce(
      (s, u) => s + (u.stats?.estimated_road_length_m || 0),
      0
    );
    const totalArea = uploads.reduce(
      (s, u) => s + (u.stats?.estimated_area_m2 || 0),
      0
    );
    res.json({
      totalUploads: total,
      avgCoverage: +avgCoverage.toFixed(2),
      totalLength: +totalLength.toFixed(2),
      totalArea: +totalArea.toFixed(2),
      timeline: uploads.map((u) => ({
        date: u.createdAt,
        coverage: u.stats?.road_coverage_percent || 0,
        length: u.stats?.estimated_road_length_m || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
};