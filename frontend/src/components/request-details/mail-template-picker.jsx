import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Col, ListGroup, Row, Spinner } from "react-bootstrap";

import { userModalDialogStore, useShallow } from "#custom-hooks";

const templateContext = require.context(
  "../../assets/mail-template",
  false,
  /\.html\.txt$/
);

const normalizeTemplateName = (value) => {
  if (!value) return "";
  return value.replace(/^\.\//, "").replace(/^.*[\\/]/, "");
};

const getTemplateLabel = (filename) => {
  const name = filename
    .replace(/\.html\.txt$/i, "")
    .replace(/\.txt$/i, "")
    .replace(/\.html$/i, "")
    .replace(/^\d+_/, "");
  return name.replace(/_/g, " ");
};

const getTemplateList = () =>
  Array.from(
    templateContext.keys().reduce((acc, key) => {
      const filename = normalizeTemplateName(key);
      if (acc.has(filename)) return acc;
      const imported = templateContext(key);
      const url = imported?.default || imported;
      acc.set(filename, { filename, url });
      return acc;
    }, new Map()).values()
  ).sort((a, b) => a.filename.localeCompare(b.filename));

const getEditedHtmlFromFrame = (frame, fallbackHtml) => {
  const doc = frame?.contentDocument;
  const html = doc?.documentElement?.outerHTML;
  if (!html) return fallbackHtml;
  return `<!doctype html>\n${html}`;
};

const MailTemplatePicker = ({ onSelect, initialTemplateName, initialTemplateHtml }) => {
  const { reset } = userModalDialogStore(
    useShallow((state) => ({
      reset: state.reset,
    }))
  );

  const previewFrameRef = useRef(null);
  const templates = useMemo(() => getTemplateList(), []);
  const normalizedInitialName = normalizeTemplateName(initialTemplateName);
  const [selectedTemplate, setSelectedTemplate] = useState(
    () =>
      templates.find((tpl) => tpl.filename === normalizedInitialName) ||
      templates[0] ||
      null
  );
  const [templateHtmlMap, setTemplateHtmlMap] = useState(() => {
    if (normalizedInitialName && initialTemplateHtml) {
      return { [normalizedInitialName]: initialTemplateHtml };
    }
    return {};
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (templates.length === 0) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const results = await Promise.all(
          templates.map(async (tpl) => {
            const res = await fetch(tpl.url);
            if (!res.ok) {
              throw new Error(`Không thể tải mẫu email: ${tpl.filename}`);
            }
            const html = await res.text();
            return [tpl.filename, html];
          })
        );
        if (cancelled) return;
        const loadedMap = Object.fromEntries(results);
        if (normalizedInitialName && initialTemplateHtml) {
          loadedMap[normalizedInitialName] = initialTemplateHtml;
        }
        setTemplateHtmlMap(loadedMap);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.message || "Không thể tải danh sách mẫu email");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [templates, normalizedInitialName, initialTemplateHtml]);

  const selectedHtml = selectedTemplate
    ? templateHtmlMap[selectedTemplate.filename]
    : "";

  const handleUseTemplate = () => {
    if (!selectedTemplate || !selectedHtml) return;
    const editedHtml = getEditedHtmlFromFrame(previewFrameRef.current, selectedHtml);
    onSelect?.({
      name: selectedTemplate.filename,
      html: editedHtml,
    });
    reset();
  };

  if (templates.length === 0) {
    return (
      <Alert variant="warning" className="mb-0">
        Không tìm thấy mẫu email trong thư mục <code>src/assets/mail-template</code>
      </Alert>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="text-muted small">
        Chọn một mẫu email để xem trước. Bạn có thể bấm vào phần nội dung trong
        xem trước để chỉnh sửa nhanh (nếu mẫu có vùng cho phép chỉnh sửa).
      </div>

      {loadError && (
        <Alert variant="danger" className="mb-0">
          {loadError}
        </Alert>
      )}

      <Row className="g-3">
        <Col md={4}>
          <ListGroup>
            {templates.map((tpl) => {
              const active = tpl.filename === selectedTemplate?.filename;
              return (
                <ListGroup.Item
                  key={tpl.filename}
                  action
                  active={active}
                  onClick={() => setSelectedTemplate(tpl)}
                >
                  <div className="fw-semibold">{getTemplateLabel(tpl.filename)}</div>
                  <div className="small opacity-75">{tpl.filename}</div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </Col>
        <Col md={8}>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : selectedHtml ? (
            <iframe
              ref={previewFrameRef}
              title="Xem trước mẫu email"
              className="w-100 border rounded"
              style={{ height: 420, background: "#fff" }}
              srcDoc={selectedHtml}
            />
          ) : (
            <div className="text-muted">Chọn mẫu email để xem trước.</div>
          )}

          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button variant="outline-secondary" type="button" onClick={reset}>
              Hủy
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleUseTemplate}
              disabled={loading || !selectedHtml}
            >
              Dùng mẫu này
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default MailTemplatePicker;
