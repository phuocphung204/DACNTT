import { BsCalendar3 } from "react-icons/bs";

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
export const DEFAULT_PAGE_SIZE = 10;

export const TIME_RANGE = "timeRange";
export const PRIORITY = "priority";
export const STATUS = "status";

export const CLIENT_FILTERS = {
  [TIME_RANGE]: {
    label: "Thời gian",
    param: TIME_RANGE,
    icon: <BsCalendar3 size={13} />,
    multiselect: false,
    defaultValue: ["today"],
    values: [
      { label: "Hôm nay", value: "today" },
      { label: "Tuần này", value: "weekly" },
      { label: "Chọn ngày", value: "date", },
    ],
    childValues: {
      date: [
        { label: "Ngày", param: "date", value: new Date().toISOString(), type: "date" },
      ],
    }
  },
  [PRIORITY]: {
    label: "Độ ưu tiên",
    param: PRIORITY,
    icon: <BsCalendar3 size={13} />,
    multiselect: true,
    defaultValue: null,
    values: [
      { label: "Thấp", value: "1" },
      { label: "Trung bình", value: "2" },
      { label: "Cao", value: "3" },
      { label: "Rất cao", value: "4" },
    ],
  },
  [STATUS]: {
    label: "Trạng thái",
    param: STATUS,
    icon: <BsCalendar3 size={13} />,
    multiselect: true,
    defaultValue: null,
    values: [
      { label: "Đang chờ", value: "Pending" },
      { label: "Đang tiến hành", value: "InProgress" },
      { label: "Đã hoàn thành", value: "Completed" },
      { label: "Đã giải quyết", value: "Resolved" },
    ],
  },
};

export const NOTIFICATION_TYPES = Object.freeze({
  REQUEST_REPLY_STUDENT: "REQUEST_REPLY_STUDENT", // Thông báo trả lời request cho sinh viên
  REQUEST_ASSIGNED: "REQUEST_ASSIGNED",           // Thông báo được phân công request cho officer
  CHAT_MESSAGE: "CHAT_MESSAGE"                    // Thông báo tin nhắn chat
});

// account variables
export const GENDER_ENUM = Object.freeze({
  MALE: "Male",
  FEMALE: "Female"
});
export const GENDER = Object.freeze({
  [GENDER_ENUM.MALE]: { label: "Nam", value: "Male" },
  [GENDER_ENUM.FEMALE]: { label: "Nữ", value: "Female" }
});
export const ACCOUNT_ROLES_ENUM = Object.freeze({
  OFFICER: "Officer",
  STAFF: "Staff",
  ADMIN: "Admin"
});
export const ACCOUNT_ROLES = Object.freeze({
  [ACCOUNT_ROLES_ENUM.OFFICER]: { label: "Cán bộ", value: "Officer" },
  [ACCOUNT_ROLES_ENUM.STAFF]: { label: "Nhân viên", value: "Staff" },
  [ACCOUNT_ROLES_ENUM.ADMIN]: { label: "Quản trị viên", value: "Admin" }
});
export const WORK_STATUS_ENUM = Object.freeze({
  ACTIVE: "Active",
  ON_LEAVE: "OnLeave",
  RETIRED: "Retired"
});
export const WORK_STATUS = Object.freeze({
  [WORK_STATUS_ENUM.ACTIVE]: { label: "Đang làm việc", value: "Active", variant: "success" },
  [WORK_STATUS_ENUM.ON_LEAVE]: { label: "Nghỉ phép", value: "OnLeave", variant: "warning" },
  [WORK_STATUS_ENUM.RETIRED]: { label: "Đã nghỉ", value: "Retired", variant: "secondary" }
});

export const WEB_SOCKET_EVENTS = Object.freeze({
  NEW_NOTIFICATION: "new_notification",
});