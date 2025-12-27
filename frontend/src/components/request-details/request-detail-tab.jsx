import { useMemo, useState } from "react";
import { Badge, Button, ListGroup, Spinner } from "react-bootstrap";
import { BsPaperclip } from "react-icons/bs";
import { toast } from "react-toastify";

import { useDownloadAttachmentMutation } from "#services/request-services";
import { getErrorMessage } from "#components/request-details/request-details-utils";

const RequestDetailTab = ({ requestId, detail }) => {
  const [downloadingId, setDownloadingId] = useState("");
  const [downloadAttachment] = useDownloadAttachmentMutation();

  const attachments = useMemo(() => {
    if (!Array.isArray(detail?.attachments)) return [];
    return detail.attachments;
  }, [detail]);

  const handleDownloadAttachment = async (attachment) => {
    if (!attachment?._id) return;
    setDownloadingId(attachment._id);
    try {
      const blob = await downloadAttachment({
        requestId,
        attachmentId: attachment._id,
      }).unwrap();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.originalname || `attachment-${attachment._id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể tải tệp đính kèm"));
    } finally {
      setDownloadingId("");
    }
  };

  const labelValue = detail?.label || detail?.prediction?.label || "Chưa gán";

  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <div className="text-muted small mb-1">Tiêu đề</div>
        <div className="fw-semibold">{detail.subject}</div>
      </div>
      <div>
        <div className="text-muted small mb-1">Email sinh viên</div>
        <div className="fw-semibold">{detail.student_email}</div>
      </div>
      <div>
        <div className="text-muted small mb-1">Nhãn</div>
        <Badge bg="info" text="dark">
          {labelValue}
        </Badge>
      </div>
      <div>
        <div className="text-muted small mb-1">Nội dung</div>
        <div className="border rounded p-3 bg-light">
          {detail.content || "Không có nội dung"}
        </div>
      </div>
      <div>
        <div className="d-flex align-items-center gap-2 mb-2">
          <BsPaperclip />
          <span className="fw-semibold">Tệp đính kèm</span>
        </div>
        {attachments.length === 0 ? (
          <div className="text-muted small">Không có tệp đính kèm</div>
        ) : (
          <ListGroup>
            {attachments.map((attachment, index) => (
              <ListGroup.Item
                key={attachment._id || `attachment-${index}`}
                className="d-flex justify-content-between align-items-center"
              >
                <div className="text-truncate me-2">
                  {attachment.originalname || "Tệp đính kèm"}
                </div>
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => handleDownloadAttachment(attachment)}
                  disabled={downloadingId === attachment._id}
                >
                  {downloadingId === attachment._id ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    "Tải xuống"
                  )}
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </div>
    </div>
  );
};

export default RequestDetailTab;
