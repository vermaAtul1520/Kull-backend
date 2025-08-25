class BaseController {
  constructor(model) {
    this.model = model;
  }

  getAll = async (req, res, next) => {
    try {
      const { filter, sort, projection, skip, limit, page } = req.parsedQuery;
      const docs = await this.model.find(filter).select(projection || "").sort(sort).skip(skip).limit(limit);
      const total = await this.model.countDocuments(filter);

      res.status(200).json({ success: true, total, page, limit, count: docs.length, data: docs });
    } catch (err) {
      next(err);
    }
  };

  getOne = async (req, res, next) => {
    try {
      const doc = await this.model.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  };

  createOne = async (req, res, next) => {
    try {
      const doc = await this.model.create(req.body);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  };

  updateOne = async (req, res, next) => {
    try {
      const doc = await this.model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  };

  deleteOne = async (req, res, next) => {
    try {
      const doc = await this.model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: "Not found" });
      res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = BaseController;
