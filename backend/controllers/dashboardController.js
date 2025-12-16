import Request from "../models/Request.js";
import Department from "../models/Department.js";
import Account from "../models/Account.js";

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
  if ((weekly && monthly) || (startDate && endDate)) return { _id: { day: { $dayOfMonth: "$created_at" } }, sort: { day: 1 } };
  if (monthly) return { _id: { week: { $ceil: { $divide: [{ $dayOfMonth: "$created_at" }, 7] } } }, sort: { week: 1 } };
  if (quarterly || annual) return { _id: { month: { $month: "$created_at" } }, sort: { month: 1 } };
  return { _id: { month: { $month: "$created_at" } }, sort: { month: 1 } };
}

// Skeleton timeline
function buildTimelineSkeleton({ annual, quarterly, monthly, weekly, startDate, endDate }, timelineRaw, year, month, week) {
  let timeline = [];

  if (weekly && monthly) {
    const startOfMonth = new Date(year, month - 1, 1);
    const startOfWeek = new Date(startOfMonth);
    startOfWeek.setDate(1 + (week - 1) * 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    const lastDay = endOfWeek < new Date(year, month, 1) ? endOfWeek.getDate() : new Date(year, month, 0).getDate();

    for (let d = startOfWeek.getDate(); d < lastDay; d++) {
      const item = timelineRaw.find(t => t.day === d);
      timeline.push(item || { day: d, total_revenue: 0, total_profit: 0, total_products_sold: 0 });
    }
  } else if (monthly) {
    for (let w = 1; w <= 4; w++) {
      const item = timelineRaw.find(t => t.week === w);
      timeline.push(item || { week: w, total_revenue: 0, total_profit: 0, total_products_sold: 0 });
    }
  } else if (quarterly) {
    const startMonth = (Number(quarterly) - 1) * 3 + 1;
    for (let m = startMonth; m < startMonth + 3; m++) {
      const item = timelineRaw.find(t => t.month === m);
      timeline.push(item || { month: m, total_revenue: 0, total_profit: 0, total_products_sold: 0 });
    }
  } else if (annual) {
    for (let m = 1; m <= 12; m++) {
      const item = timelineRaw.find(t => t.month === m);
      timeline.push(item || { month: m, total_revenue: 0, total_profit: 0, total_products_sold: 0 });
    }
  } else if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = start.getDate(); d <= end.getDate(); d++) {
      const item = timelineRaw.find(t => t.day === d);
      timeline.push(item || { day: d, total_revenue: 0, total_profit: 0, total_products_sold: 0 });
    }
  }

  return timeline;
}

// Controller
// TODO: check
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
      { $match: { ...timeQuery } },

      {
        $facet: {

          // 1. Tổng số request
          total_requests: [
            { $count: "count" }
          ],

          // 2. Request theo STATUS
          by_status: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                status: "$_id",
                count: 1
              }
            }
          ],

          //  3. Request theo LABEL
          by_label: [
            {
              $group: {
                _id: "$label",
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                label: "$_id",
                count: 1
              }
            }
          ],

          //  4. Timeline + label
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
              $project: {
                _id: 0,
                label: "$_id.label",
                month: "$_id.month",
                week: "$_id.week",
                day: "$_id.day",
                count: 1
              }
            },
            { $sort: timelineGroup.sort }
          ]
        }
      }
    ]);

    const result = stats[0];

    res.json({
      ec: 200,
      me: "Lấy dashboard nâng cao thành công",
      dt: {
        total_requests: result.total_requests[0]?.count || 0,
        by_status: result.by_status,
        by_label: result.by_label,
        timeline_label: result.timeline_label
      }
    });

  } catch (error) {
    res.status(500).json({
      ec: 500,
      me: error.message
    });
  }
};