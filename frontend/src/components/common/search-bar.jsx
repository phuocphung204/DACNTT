import { useEffect, useRef, useState } from "react";
import { Form, InputGroup } from "react-bootstrap";
import { BsSearch } from "react-icons/bs";
import { useSearchParams } from "react-router-dom";

import styles from "./search-bar.module.scss";
import { useRenderCount } from "#custom-hooks/use-render-count";
import { updateParams } from "#utils";

const SearchBar = ({
  placeholder = "Tìm kiếm...",
  searchQueryParamKey = "q",
  onChange,
  onSubmit,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [value, setValue] = useState(
    () => searchParams.get(searchQueryParamKey) || ""
  );
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl");
  const inputRef = useRef(null);

  // useEffect(() => {
  //   setValue(searchParams.get(searchQueryParamKey) || "");
  // }, [searchParams, searchQueryParamKey]);

  // Tạo sự kiện phím tắt Ctrl + K hoặc Cmd + K để focus vào thanh tìm kiếm
  useEffect(() => {
    const handleKeydown = (event) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    setShortcutLabel(isMac ? "Cmd" : "Ctrl");
  }, []);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    setValue(nextValue);
    // updateQueryParam(nextValue);
    // onChange?.(nextValue);
    if (nextValue === "" || nextValue == null) { // k

    }
  };

  const handleSubmitClick = () => {
    const trimmed = value?.trim?.() ?? "";
    setValue(trimmed);
    let nextParams = new URLSearchParams(searchParams);
    nextParams = updateParams(nextParams, searchQueryParamKey, trimmed);
    if (onSubmit) {
      onSubmit(nextParams);
    } else {
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const trimmed = value?.trim?.() ?? "";
      setValue(trimmed);
      let nextParams = new URLSearchParams(searchParams);
      nextParams = updateParams(nextParams, searchQueryParamKey, trimmed);
      if (onSubmit) {
        onSubmit(nextParams);
      } else {
        setSearchParams(nextParams, { replace: true });
      }
    }
  };

  // Start debug
  useRenderCount("SearchBar");
  // End debug

  return (
    <div className={styles.searchBarContainer}>
      <InputGroup className={styles.searchInputGroup}>
        <InputGroup.Text className={styles.searchIcon}>
          <BsSearch size={14} />
        </InputGroup.Text>
        <Form.Control
          ref={inputRef}
          id="search-input"
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          aria-label={placeholder}
          className="fw-normal"
          onKeyDown={handleKeyDown}
        />
        {value && (
          <InputGroup.Text className={styles.searchAction}>
            <button
              type="button"
              className={styles.searchActionBtn}
              onClick={handleSubmitClick}
              aria-label="Thực hiện tìm kiếm"
            >
              Tìm
            </button>
          </InputGroup.Text>
        )}
        <InputGroup.Text
          className={styles.shortcutHint}
          title={`${shortcutLabel} + K`}
        >
          <span className={styles.shortcutLabel}>{shortcutLabel}</span>
          <span className={styles.shortcutKey}>K</span>
        </InputGroup.Text>
      </InputGroup>
    </div>
  );
};

export default SearchBar;
