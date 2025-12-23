import { Badge, Button, Form, OverlayTrigger, Popover, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { BsFilterCircle } from "react-icons/bs";
import { useRenderCount } from "#custom-hooks/use-render-count";
import { useDispatch, useSelector } from "react-redux";
import DateRangePicker from "react-bootstrap-daterangepicker";

import { resetFilterValue, setActiveState, setValuesState } from "#redux/filter-slice";
import { CLIENT_FILTERS } from "#components/variables";
import styles from "./filter.module.scss";

const FilterClient = ({
  selectedFilterOptions = ["timeRange", "priority", "status"],
  onSubmit,
  isFetching = false,
}) => {
  const dispatch = useDispatch();
  const activeFilters = useSelector(state => state.filter.activeFilters);
  const filterValues = useSelector(state => state.filter.filterValues);
  const filterChilds = useSelector(state => state.filter.filterChilds);

  // Handle Functions
  const handleValueChange = (optionKey) => (nextValue) => {
    dispatch(setValuesState({ param: optionKey, values: [nextValue] }));
  };

  const handleCheckboxValueChange = (optionKey) => (e) => {
    const { value, checked } = e.target;
    // console.log(value, checked);
    const currentValues = filterValues[optionKey] || [];
    let nextValues = [];
    if (checked) {
      nextValues = [...currentValues, value];
    } else {
      nextValues = currentValues.filter(v => v !== value);
    }
    dispatch(setValuesState({ param: optionKey, values: nextValues }));
  };

  const handleResetValue = (optionKey) => {
    dispatch(resetFilterValue({ param: optionKey }));
  };

  const handleApplyFilters = () => {
    const returnedFilterValues = {};
    // Lấy các giá trị bộ lọc đã chọn
    selectedFilterOptions.forEach((optionKey) => {
      const option = CLIENT_FILTERS[optionKey];
      returnedFilterValues[optionKey] = filterValues[optionKey];
      if (option.childValues) {
        Object.keys(option.childValues).forEach((childKey) => {
          const pendingParentValue = filterValues[childKey]?.pendingParentValue;
          const parentValue = filterValues[optionKey];
          if (parentValue.includes(pendingParentValue)) {
            returnedFilterValues[childKey] = filterValues[childKey];
          }
        })
      }
    });
    // Gọi hàm onSubmit với các giá trị bộ lọc đã chọn
    onSubmit?.(returnedFilterValues);
  }

  // Render Functions
  const renderChildValues = (type, childValues, optionKey) => {
    const elementKey = `${optionKey}-child-${type}`;
    if (type === "date") {
      const date = new Date(filterValues.date?.value?.[0] || new Date());
      return (
        <Form.Control
          key={`${elementKey}-input`}
          type="date"
          value={date.toISOString().split("T")[0]}
          onChange={(e) => {
            const newDate = e.target.value;
            // console.log("Selected date:", newDate);
            dispatch(setValuesState({
              param: "date",
              values: { parent: "timeRange", pendingParentValue: "date", value: [newDate] },
            }));
          }}
        />
      )
    } else if (type === "dateRange") {
      // console.log("Render date range picker");
      const startDate = new Date(filterValues.startDate?.values?.[0] || new Date());
      const endDate = new Date(filterValues.endDate?.values?.[0] || new Date());
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
            dispatch(setValuesState({
              param: "startDate",
              values: { parent: "timeRange", pendingParentValue: "dateRange", value: [startDate.format("YYYY-MM-DD")] },
            }));
            dispatch(setValuesState({
              param: "endDate",
              values: { parent: "timeRange", pendingParentValue: "dateRange", value: [endDate.format("YYYY-MM-DD")] },
            }));
          }}
        >
          <input id="dateRangeInput" type="text" className="form-control" />
        </DateRangePicker>
      )
    }
    return null;
  }

  const renderFilterValues = (type, values, optionKey) => {
    const childs = filterValues[optionKey]?.map(v => filterChilds[v] ? filterChilds[v] : null).filter(c => c !== null);
    // console.log("Render filter values:", optionKey, option, childs);
    const valuesArr = filterValues[optionKey] || [];
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
          <div className={`mt-2 ${childs.length > 0 ? "" : "d-none"}`}>
            {childs.map((child) => renderChildValues(child.childType, child.childValues, optionKey))}
          </div>
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
              checked={valuesArr.includes(val.value)}
              onChange={handleCheckboxValueChange(optionKey)}
            />
          ))}
        </>
      )

    }
  }

  // TODO: các debug cần xóa
  // Start debug
  useRenderCount("FilterClient");
  // End debug

  return (
    <section className={`${styles.parentFontSizeContainer} d-flex g-2 align-items-center w-100`}>
      {selectedFilterOptions.map(
        (optionKey) => {
          const isActive = activeFilters[optionKey] || false;
          const filterOption = CLIENT_FILTERS[optionKey];
          const type = filterOption.multiselect ? "checkbox" : "radio";
          const filterCount = filterValues[optionKey]?.length || 0;
          return (
            <OverlayTrigger
              key={`olt-${filterOption.param}`}
              delay={{ show: 250, hide: 0 }}
              trigger="click"
              onToggle={(nextShow) => dispatch(setActiveState({ param: optionKey, nextActive: nextShow }))}
              placement="bottom-start"
              rootClose
              overlay={
                <Popover style={{ maxWidth: "300px" }} className={`${styles.parentFontSizeContainer}`}>
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
                active={isActive || filterCount > 0}
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
      <BsFilterCircle
        className={`${styles.btnApplyFilters}`}
        title="Áp dụng bộ lọc"
        style={{
          fontSize: "1.5em",
        }}
        onClick={handleApplyFilters}
      />
    </section>
  )
};

export default FilterClient;