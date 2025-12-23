import { useEffect, memo } from "react";
import { useImmer } from "use-immer";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Form, OverlayTrigger, Popover, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { BsCalendar3 } from "react-icons/bs";
import { useRenderCount } from "#custom-hooks/use-render-count";
import DateRangePicker from "react-bootstrap-daterangepicker";

import { getParamsWithArrays, updateParams } from "#utils";

import styles from "./filter.module.scss";

const FilterOptions = {
  timeRange: {
    label: "Thời gian",
    param: "timeRange",
    icon: <BsCalendar3 size={13} />,
    multiselect: false,
    defaultValue: ["today"],
    values: [
      { label: "Hôm nay", value: "today" },
      { label: "Tuần này", value: "weekly" },
      { label: "Tháng này", value: "monthly" },
      { label: "Chọn ngày", value: "date", },
      { label: "Chọn khoảng", value: "dateRange", type: "dateRange", },
    ],
    childValues: {
      date: [
        { label: "Ngày", param: "date", value: new Date(), type: "date" },
      ],
      dateRange: [
        { label: "Từ ngày", param: "startDate", type: "date", value: new Date() },
        { label: "Đến ngày", param: "endDate", type: "date", value: new Date() },
      ],
    }
  },
  priority: {
    label: "Độ ưu tiên",
    param: "priority",
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
  status: {
    label: "Trạng thái",
    param: "status",
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
  // Fields for accounts
  role: {
    label: "Vai trò",
    param: "role",
    icon: <BsCalendar3 size={13} />,
    multiselect: true,
    defaultValue: null,
    values: [
      { label: "Cán bộ", value: "Officer" },
      { label: "Nhân viên", value: "Staff" },
      { label: "Quản trị viên", value: "Admin" },
    ],
  },
  work_status: {
    label: "Trạng thái công việc",
    param: "work_status",
    icon: <BsCalendar3 size={13} />,
    multiselect: true,
    defaultValue: null,
    values: [
      { label: "Đang làm việc", value: "Active" },
      { label: "Nghỉ phép", value: "OnLeave" },
      { label: "Đã nghỉ hưu", value: "Retired" },
    ],
  },
  active: {
    label: "Trạng thái hoạt động",
    param: "active",
    icon: <BsCalendar3 size={13} />,
    multiselect: true,
    defaultValue: null,
    values: [
      { label: "Đang hoạt động", value: "true" },
      { label: "Vô hiệu hóa", value: "false" },
    ],
  },
};

const Filter = memo(({
  selectedFilterOptions = ["timeRange", "priority", "status"],
  onSubmit,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [paramStates, setParamStates] = useImmer(() => {
    const initialStates = {};
    selectedFilterOptions.forEach((optionKey) => {
      const option = FilterOptions[optionKey];
      const paramValues = searchParams.getAll(option.param) || [];
      initialStates[option.param] = {
        active: false,
        values: paramValues.length > 0 ? paramValues : option.defaultValue || [], // loại bỏ trùng lặp
      }
      if (option.childValues) { // Nếu có child values thì khởi tạo trạng thái cho chúng
        Object.keys(option.childValues).forEach(childKey => {
          const child = option.childValues[childKey];
          child.forEach(childItem => {
            const childParamValue = searchParams.getAll(childItem.param);
            initialStates[childItem.param] = {
              parent: option.param,
              pendingParentValue: childKey,
              values: childParamValue || [],
            }
          });
        });
      };
    });

    return initialStates;
  });

  const [filterChildState, setFilterChildState] = useImmer(() => {
    const initial = {};
    selectedFilterOptions.forEach((optionKey) => {
      const option = FilterOptions[optionKey];
      if (option.childValues) {
        const childs = option.childValues;
        Object.keys(childs).forEach(childKey => {
          const child = childs[childKey];
          initial[childKey] = {
            show: false,
            childValues: child,
            childType: childKey,
          }
        });
      }
    });
    return initial;
  });

  // Handle Functions
  const handleValueChange = (optionKey) => (nextValue) => {
    setParamStates(draft => {
      draft[optionKey].values = [nextValue];
    });
  };

  const handleCheckboxValueChange = (optionKey) => (e) => {
    const { value, checked } = e.target;
    // console.log(value, checked);
    setParamStates(draft => {
      if (checked) {
        draft[optionKey].values.push(value);
      } else {
        draft[optionKey].values = draft[optionKey].values.filter(v => v !== value);
      }
    });
  }

  const handleResetValue = (optionKey) => {
    const defaultValue = FilterOptions[optionKey].defaultValue || [];
    setParamStates(draft => {
      draft[optionKey].values = Array.isArray(defaultValue) ? defaultValue : (defaultValue ? [defaultValue] : []);
    })
    setFilterChildState(draft => {
      draft.show = false;
      draft.childValues = [];
      draft.childType = "";
    });
  };

  const handleApplyFilters = () => {
    let nextParams = new URLSearchParams(searchParams);
    Object.entries(paramStates).forEach(([param, state]) => {
      const hasParent = state.hasOwnProperty("parent");
      if (!hasParent) {
        nextParams = updateParams(nextParams, param, state.values);
        return;
      } else {
        const pendingParentValue = state.pendingParentValue || null;
        const currentParentValue = paramStates[state.parent]?.values || [];
        // console.log(param, state, pendingParentValue, currentParentValue);
        if (currentParentValue.includes(pendingParentValue)) {
          nextParams = updateParams(nextParams, param, state.values);
          return;
        }
      }
      // xóa param nếu không thỏa điều kiện
      nextParams.delete(param);
    });
    const queryParams = getParamsWithArrays(nextParams);
    console.log("Applying filters with params:", queryParams);
    if (onSubmit) {
      onSubmit(nextParams);
    } else {
      setSearchParams(nextParams);
    }
  }

  // Render Functions
  const renderChildValues = (type, childValues, optionKey) => {
    const elementKey = `${optionKey}-child-${type}`;
    if (type === "date") {

    } else if (type === "dateRange") {
      // console.log("Render date range picker");
      const startDate = new Date(paramStates.startDate?.values?.[0] || new Date());
      const endDate = new Date(paramStates.endDate?.values?.[0] || new Date());
      return (
        <DateRangePicker
          key={`${elementKey}-drp`}
          initialSettings={{
            showDropdowns: true,
            startDate: startDate,
            endDate: endDate,
            locale: {
              format: "DD/MM/YYYY",
            },
          }}
          onApply={(_, picker) => {
            const { startDate, endDate } = picker;
            // console.log("Selected date range:", startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD"));
            setParamStates(draft => {
              // draft["startDate"] = { parent: "timeRange", pendingParentValue: "dateRange", values: [startDate.format("YYYY-MM-DD")] };
              // draft["endDate"] = { parent: "timeRange", pendingParentValue: "dateRange", values: [endDate.format("YYYY-MM-DD")] };
              draft["startDate"].values = [startDate.format("YYYY-MM-DD")];
              draft["endDate"].values = [endDate.format("YYYY-MM-DD")];
            });
          }}
        >
          <input id="dateRangeInput" type="text" className="form-control" />
        </DateRangePicker>
      )
    }
    return null;
  }

  const renderFilterValues = (type, values, optionKey) => {
    // const showChild = paramChildStates.show;
    const option = paramStates[optionKey];
    const childs = option.values.map(v => filterChildState[v] ? filterChildState[v] : null).filter(c => c !== null);
    // console.log("Render filter values:", optionKey, option, childs);
    const valuesArr = option.values;
    if (type === "radio") {
      const value = valuesArr[0];
      return (
        <>
          <ToggleButtonGroup
            type="radio"
            className="d-flex gap-2 flex-wrap"
            name={optionKey}
            value={value}
            onChange={handleValueChange(optionKey)}
          >
            {values.map((val) => (
              <ToggleButton
                className="rounded-pill p-1"
                key={`tb-${val.value}`}
                id={`tb-${val.value}`}
                variant="outline-success"
                value={val.value}
              >
                {val.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {childs.map((child) => renderChildValues(child.childType, child.childValues, optionKey))}
        </>
      )
    }
    else if (type === "checkbox") {
      return (
        <>
          {values.map((val) => (
            <Form.Check
              key={`fc-${val.value}`}
              type="checkbox"
              id={`fc-${val.value}`}
              label={val.label}
              value={val.value}
              checked={option.values.includes(val.value)}
              onChange={handleCheckboxValueChange(optionKey)}
            />
          ))}
        </>
      )

    }
  }

  // TODO: các debug cần xóa
  // Start debug
  useRenderCount("Filter");
  useEffect(() => {
    console.log(paramStates, typeof paramStates);
  }, [paramStates]);
  // useEffect(() => { setSearchParams({ sang: ["test"] }) }, [setSearchParams]);
  useEffect(() => {
    // console.log(filterChildState)
  }, [filterChildState]);
  // End debug

  return (
    <section className="d-flex g-2">
      {selectedFilterOptions.map(
        (optionKey) => {
          const isActive = paramStates[optionKey].active;
          const filterOption = FilterOptions[optionKey];
          const type = filterOption.multiselect ? "checkbox" : "radio";
          const filterCount = paramStates[optionKey].values.length;
          return (
            <OverlayTrigger
              key={`olt-${filterOption.param}`}
              delay={{ show: 250, hide: 0 }}
              trigger="click"
              onToggle={(nextShow) => setParamStates(draft => { draft[optionKey].active = nextShow })}
              placement="bottom-start"
              rootClose
              overlay={
                <Popover style={{ maxWidth: "300px" }} className={styles.parentFontSizeContainer}>
                  <Popover.Body className="d-flex flex-column py-2">
                    <div>
                      {renderFilterValues(type, filterOption.values, optionKey)}
                    </div>
                    <Button variant="link" className="me-2 text-danger"
                      onClick={() => handleResetValue(optionKey)}>
                      Đặt lại
                    </Button>
                  </Popover.Body>
                </Popover>
              }
            >
              <Button variant=""
                className={`${styles.btnFilterOption} rounded-pill d-flex align-items-center`}
                active={isActive}
              >
                {filterOption.icon}
                {filterOption.label}
                <Badge bg="danger"
                  className={`${styles.badgeFilterCount} rounded-circle ${filterCount > 1 ? "" : "text-danger"} ${filterCount === 0 ? "opacity-0" : ""}`}
                >
                  {filterCount}
                </Badge>
              </Button>
            </OverlayTrigger>
          )
        }
      )}
      <Button variant="outline-success" className="ms-auto" onClick={handleApplyFilters}>Áp dụng</Button>
    </section>
  )
});

export default Filter;