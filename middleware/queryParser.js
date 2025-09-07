function queryParser(opts = {}) {
  return (req, res, next) => {
    const { filter, sort, fields, page = 1, limit = 10 } = req.query;

    const parsedFilter = {};
    if (filter) {
      try {
        const f = JSON.parse(filter);
        for (const key of Object.keys(f)) {
          if (opts.allowFilterFields?.includes(key)) parsedFilter[key] = f[key];
        }
      } catch (err) {
        return res.status(400).json({ success: false, message: "Invalid filter" });
      }
    }

    const parsedSort = {};
    if (sort) {
      sort.split(",").forEach((s) => {
        const field = s.replace("-", "");
        if (opts.allowSortFields?.includes(field)) {
          parsedSort[field] = s.startsWith("-") ? -1 : 1;
        }
      });
    }

    const projection = fields
      ? fields
          .split(",")
          .filter((f) => opts.allowProjectFields?.includes(f))
          .join(" ")
      : null;

    const maxLimit = opts.maxLimit || 100;
    const finalLimit = Math.min(parseInt(limit, 10) || 10, maxLimit);
    const skip = (parseInt(page, 10) - 1) * finalLimit;

    req.parsedQuery = {
      filter: parsedFilter,
      sort: parsedSort,
      projection,
      limit: finalLimit,
      skip,
      page: parseInt(page, 10),
    };

    next();
  };
}

module.exports = { queryParser };
