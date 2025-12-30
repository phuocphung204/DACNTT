import Request from "../models/Request.js";
import Department from "../models/Department.js";
import Account from "../models/Account.js";
import mongoose from "mongoose";

// Lọc theo thời gian
const buildTimeFilter = ({ annual, quarterly, monthly, weekly, startDate, endDate }) => {
  const today = new Date();
  let query = {};
  let createdAtFilter = {};

  if (startDate && endDate) {
    createdAtFilter.$gte = new Date(startDate);
    createdAtFilter.$lt = new Date(endDate);
  } else {
    const year = Number(annual) || today.getFullYear();
    let startOfPeriod = new Date(year, 0, 1);
    let endOfPeriod = new Date(year + 1, 0, 1);

    if (quarterly) {
      const q = Number(quarterly); // 1..4
      const startMonth = (q - 1) * 3;
      startOfPeriod = new Date(year, startMonth, 1);
      endOfPeriod = new Date(year, startMonth + 3, 1);
    }

    if (monthly) {
      const month = Number(monthly) - 1; // 0..11
      startOfPeriod = new Date(year, month, 1);
      endOfPeriod = new Date(year, month + 1, 1);
    }

    if (weekly && monthly) {
      const month = Number(monthly) - 1;
      const week = Number(weekly); // 1..5
      const startOfMonth = new Date(year, month, 1);
      startOfPeriod = new Date(startOfMonth);
      startOfPeriod.setDate(1 + (week - 1) * 7);

      endOfPeriod = new Date(startOfPeriod);
      endOfPeriod.setDate(startOfPeriod.getDate() + 7);

      const endOfMonth = new Date(year, month + 1, 1);
      endOfPeriod = endOfPeriod < endOfMonth ? endOfPeriod : endOfMonth;
    }

    createdAtFilter.$gte = startOfPeriod;
    createdAtFilter.$lt = endOfPeriod;
  }

  if (Object.keys(createdAtFilter).length > 0) {
    query.created_at = createdAtFilter;
  }
  return query;
};

// Nhóm timeline
function getTimelineGrouping({ annual, quarterly, monthly, weekly, startDate, endDate }) {
  if ((weekly && monthly) || (startDate && endDate)) {
    return {
      _id: { day: { $dayOfMonth: "$created_at" } },
      sort: { "day": 1 }
    };
  }

  if (monthly) {
    return {
      _id: {
        week: {
          $ceil: { $divide: [{ $dayOfMonth: "$created_at" }, 7] }
        }
      },
      sort: { "week": 1 }
    };
  }

  return {
    _id: { month: { $month: "$created_at" } },
    sort: { "month": 1 }
  };
}

// Skeleton timeline
function buildTimelineSkeleton(
  { annual, quarterly, monthly, weekly, startDate, endDate },
  timelineRaw,
  year,
  month,
  week,
  buildDefaultItem
) {
  const timeline = [];
  const makeDefault =
    typeof buildDefaultItem === "function"
      ? buildDefaultItem
      : (key, value) => ({
        [key]: value,
        total_revenue: 0,
        total_profit: 0,
        total_products_sold: 0
      });

  const resolvedYear = Number(year) || Number(annual) || (startDate ? new Date(startDate).getFullYear() : new Date().getFullYear());
  const resolvedMonth = Number(month) || Number(monthly) || (startDate ? new Date(startDate).getMonth() + 1 : null);
  const resolvedWeek = Number(week) || (weekly ? Number(weekly) : null);

  if (weekly && monthly) {
    const startOfMonth = new Date(resolvedYear, resolvedMonth - 1, 1);
    const startOfWeek = new Date(startOfMonth);
    startOfWeek.setDate(1 + (resolvedWeek - 1) * 7);

    const endOfWeekExclusive = new Date(startOfWeek);
    endOfWeekExclusive.setDate(startOfWeek.getDate() + 7);

    const endOfMonthExclusive = new Date(resolvedYear, resolvedMonth, 1);
    const endExclusive = endOfWeekExclusive < endOfMonthExclusive ? endOfWeekExclusive : endOfMonthExclusive;

    for (let d = new Date(startOfWeek); d < endExclusive; d.setDate(d.getDate() + 1)) {
      const day = d.getDate();
      const item = timelineRaw.find(t => t.day === day);
      timeline.push(item || makeDefault("day", day));
    }
  } else if (monthly) {
    const daysInMonth = new Date(resolvedYear, resolvedMonth, 0).getDate();
    const maxWeek = Math.ceil(daysInMonth / 7);
    for (let w = 1; w <= maxWeek; w++) {
      const item = timelineRaw.find(t => t.week === w);
      timeline.push(item || makeDefault("week", w));
    }
  } else if (quarterly) {
    const startMonth = (Number(quarterly) - 1) * 3 + 1;
    for (let m = startMonth; m < startMonth + 3; m++) {
      const item = timelineRaw.find(t => t.month === m);
      timeline.push(item || makeDefault("month", m));
    }
  } else if (annual) {
    for (let m = 1; m <= 12; m++) {
      const item = timelineRaw.find(t => t.month === m);
      timeline.push(item || makeDefault("month", m));
    }
  } else if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const endInclusive = new Date(end);
    endInclusive.setHours(23, 59, 59, 999);

    for (let d = new Date(start); d <= endInclusive; d.setDate(d.getDate() + 1)) {
      const day = d.getDate();
      const item = timelineRaw.find(t => t.day === day);
      timeline.push(item || makeDefault("day", day));
    }
  }

  return timeline;
}

// Controller
export const getDashboardAdvanced = async (req, res) => {
  try {
    const { annual, quarterly, monthly, weekly, start, end } = req.query;

    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    const timeQuery = buildTimeFilter({
      annual,
      quarterly,
      monthly,
      weekly,
      startDate,
      endDate
    });

    const timelineGroup = getTimelineGrouping({
      annual,
      quarterly,
      monthly,
      weekly,
      startDate,
      endDate
    });

    const stats = await Request.aggregate([
      { $match: { ...timeQuery, label: { $ne: null } } },

      {
        $facet: {
          total_requests: [{ $count: "count" }],

          by_status: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: { _id: 0, status: "$_id", count: 1 } }
          ],

          by_label: [
            { $group: { _id: "$label", count: { $sum: 1 } } },
            { $project: { _id: 0, label: "$_id", count: 1 } }
          ],

          timeline_label: [
            {
              $group: {
                _id: {
                  ...timelineGroup._id,
                  label: "$label"
                },
                count: { $sum: 1 }
              }
            },
            {
              $group: {
                _id: timelineGroup._id,
                labels: {
                  $push: { k: "$_id.label", v: "$count" }
                },
                total: { $sum: "$count" }
              }
            },
            {
              $project: {
                _id: 0,
                ...Object.keys(timelineGroup._id).reduce((acc, k) => {
                  acc[k] = `$_id.${k}`;
                  return acc;
                }, {}),
                labels: { $arrayToObject: "$labels" },
                total: 1
              }
            },
            { $sort: timelineGroup.sort }
          ]
        }
      }
    ]);

    const result = stats[0];

    const year = Number(annual) || (startDate ? startDate.getFullYear() : new Date().getFullYear());
    const month = Number(monthly) || (startDate ? startDate.getMonth() + 1 : null);
    const week = weekly ? Number(weekly) : null;

    const allLabels = (result.by_label || []).map(x => x.label).filter(Boolean);
    const zeroLabels = allLabels.reduce((acc, label) => {
      acc[label] = 0;
      return acc;
    }, {});

    const timelineLabelRaw = Array.isArray(result.timeline_label) ? result.timeline_label : [];
    const timeline_label = buildTimelineSkeleton(
      { annual, quarterly, monthly, weekly, startDate, endDate },
      timelineLabelRaw,
      year,
      month,
      week,
      (key, value) => ({ [key]: value, labels: { ...zeroLabels }, total: 0 })
    ).map(item => ({
      ...item,
      labels: { ...zeroLabels, ...(item.labels || {}) },
      total: typeof item.total === "number" ? item.total : 0
    }));

    res.json({
      ec: 200,
      em: "Lấy dashboard nâng cao thành công",
      dt: {
        total_requests: result.total_requests[0]?.count || 0,
        by_status: result.by_status,
        by_label: result.by_label,
        timeline_label
      }
    });

  } catch (error) {
    res.status(500).json({ ec: 500, em: error.message });
  }
};

export const getDashboardWithDepartmentID = async (req, res) => {
  try {
    const { department_id } = req.params;
    const { annual, quarterly, monthly, weekly, start, end } = req.query;

    if (!mongoose.Types.ObjectId.isValid(department_id)) {
      return res.status(400).json({ ec: 400, em: "Invalid department_id" });
    }

    const departmentObjectId = new mongoose.Types.ObjectId(department_id);

    const department = await Department.findById(departmentObjectId).select("_id");
    if (!department) {
      return res.status(404).json({ ec: 404, em: "Department not found" });
    }

    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    const timeQuery = buildTimeFilter({
      annual,
      quarterly,
      monthly,
      weekly,
      startDate,
      endDate
    });

    const timelineGroup = getTimelineGrouping({
      annual,
      quarterly,
      monthly,
      weekly,
      startDate,
      endDate
    });

    const stats = await Request.aggregate([
      { $match: { ...timeQuery, department_id: departmentObjectId } },
      {
        $facet: {
          total_requests: [{ $count: "count" }],

          total_overdue_requests: [
            { $match: { is_overdue: true } },
            { $count: "count" }
          ],

          overdue_by_assignee: [
            { $match: { is_overdue: true, assigned_to: { $ne: null } } },
            { $group: { _id: "$assigned_to", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            {
              $lookup: {
                from: "accounts",
                localField: "_id",
                foreignField: "_id",
                as: "account"
              }
            },
            { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                account_id: "$_id",
                count: 1,
                name: "$account.name",
                email: "$account.email",
                position: "$account.position",
                role: "$account.role"
              }
            }
          ],

          total_prediction_used: [
            { $match: { "prediction.is_used": true } },
            { $count: "count" }
          ],

          by_status: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: { _id: 0, status: "$_id", count: 1 } }
          ],

          by_label: [
            { $match: { label: { $ne: null } } },
            { $group: { _id: "$label", count: { $sum: 1 } } },
            { $project: { _id: 0, label: "$_id", count: 1 } }
          ],

          timeline_label: [
            { $match: { label: { $ne: null } } },
            {
              $group: {
                _id: {
                  ...timelineGroup._id,
                  label: "$label"
                },
                count: { $sum: 1 }
              }
            },
            {
              $group: {
                _id: timelineGroup._id,
                labels: {
                  $push: { k: "$_id.label", v: "$count" }
                },
                total: { $sum: "$count" }
              }
            },
            {
              $project: {
                _id: 0,
                ...Object.keys(timelineGroup._id).reduce((acc, k) => {
                  acc[k] = `$_id.${k}`;
                  return acc;
                }, {}),
                labels: { $arrayToObject: "$labels" },
                total: 1
              }
            },
            { $sort: timelineGroup.sort }
          ]
        }
      }
    ]);

    const result = stats[0] || {};

    const year = Number(annual) || (startDate ? startDate.getFullYear() : new Date().getFullYear());
    const month = Number(monthly) || (startDate ? startDate.getMonth() + 1 : null);
    const week = weekly ? Number(weekly) : null;

    const allLabels = (result.by_label || []).map(x => x.label).filter(Boolean);
    const zeroLabels = allLabels.reduce((acc, label) => {
      acc[label] = 0;
      return acc;
    }, {});

    const timelineLabelRaw = Array.isArray(result.timeline_label) ? result.timeline_label : [];
    const timeline_label = buildTimelineSkeleton(
      { annual, quarterly, monthly, weekly, startDate, endDate },
      timelineLabelRaw,
      year,
      month,
      week,
      (key, value) => ({ [key]: value, labels: { ...zeroLabels }, total: 0 })
    ).map(item => ({
      ...item,
      labels: { ...zeroLabels, ...(item.labels || {}) },
      total: typeof item.total === "number" ? item.total : 0
    }));

    return res.json({
      ec: 200,
      me: "Lấy dashboard theo phòng ban thành công",
      dt: {
        total_requests: result.total_requests?.[0]?.count || 0,
        total_overdue_requests: result.total_overdue_requests?.[0]?.count || 0,
        overdue_by_assignee: result.overdue_by_assignee || [],
        total_prediction_used: result.total_prediction_used?.[0]?.count || 0,
        by_status: result.by_status || [],
        by_label: result.by_label || [],
        timeline_label
      }
    });
  } catch (error) {
    res.status(500).json({ ec: 500, me: error.message });
  }
};