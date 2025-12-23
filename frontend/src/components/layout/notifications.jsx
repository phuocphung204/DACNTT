import { useEffect, useMemo, useState } from "react";
import { Badge, Button, ListGroup, OverlayTrigger, Popover, Spinner, Stack } from "react-bootstrap";
import { BsBellFill, BsCheck2All, BsInboxFill } from "react-icons/bs";
import { toast } from "react-toastify";

import { useGetMyNotificationsQuery, useGetUnreadNotificationsCountQuery, useMarkAllNotificationsAsReadMutation, useMarkNotificationAsReadMutation } from "#services";
import { NOTIFICATION_TYPES } from "../variables";
import { formatDateTime } from "#utils/format";
import styles from "./notifications.module.scss";

const MAX_DISPLAY = 10;

const Notifications = () => {
  const [showPopover, setShowPopover] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const { data: unreadData, refetch: refetchUnread } = useGetUnreadNotificationsCountQuery();
  const unreadCount = unreadData?.dt?.count ?? 0;

  const {
    data: notificationsData,
    isFetching: isLoadingList,
    refetch: refetchList,
  } = useGetMyNotificationsQuery(
    { limit: MAX_DISPLAY },
    { skip: !showPopover }
  );

  const [markNotificationAsRead, { isLoading: isMarking }] = useMarkNotificationAsReadMutation();
  const [markAllNotificationsAsRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsAsReadMutation();

  useEffect(() => {
    if (showPopover) {
      setHasOpened(true);
    }
  }, [showPopover]);

  const notifications = useMemo(
    () => notificationsData?.dt?.notifications ?? [],
    [notificationsData]
  );

  const renderNotificationContent = (notification) => {
    if (notification.type === NOTIFICATION_TYPES.REQUEST_ASSIGNED) {
      const senderName = notification.senders?.[0]?.name || "Hệ thống";
      const subject = notification.data?.request_subject || "yêu cầu mới";
      return (
        <>
          <div className="d-flex align-items-center gap-2">
            <BsInboxFill className="text-primary" />
            <div className="fw-semibold text-dark">Được phân công xử lý</div>
          </div>
          <div className="small text-muted">
            {senderName} đã giao: <span className="fw-semibold text-dark">{subject}</span>
          </div>
        </>
      );
    }

    return (
      <div className="small text-muted fst-italic">
        Loại thông báo này sẽ được hỗ trợ sau
      </div>
    );
  };

  const handleToggle = (next) => {
    setShowPopover(next);
    if (next) {
      refetchList();
      refetchUnread();
    }
  };

  const handleMarkAsRead = async (notification) => {
    if (!notification?._id) return;
    try {
      await markNotificationAsRead(notification._id).unwrap();
      toast.info("Đã xem thông báo");
      refetchList();
      refetchUnread();
    } catch (error) {
      toast.error(error?.em || "Không thể đánh dấu đã đọc");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead().unwrap();
      toast.success("Đã đánh dấu tất cả thông báo");
      refetchList();
      refetchUnread();
    } catch (error) {
      toast.error(error?.em || "Không thể đánh dấu tất cả");
    }
  };

  const badgeContent = unreadCount > MAX_DISPLAY ? `+${MAX_DISPLAY}` : unreadCount;

  const popover = (
    <Popover className={`${styles.popover} fw-normal d-flex flex-column`}>
      <Popover.Header as="div" className="bg-light d-flex align-items-center justify-content-between py-2 px-3">
        <span className="fw-semibold">Thông báo</span>
        <Button
          variant="link"
          size="sm"
          className="text-decoration-none d-flex align-items-center gap-1"
          onClick={handleMarkAllAsRead}
          disabled={isMarkingAll || notifications.length === 0}
        >
          <BsCheck2All />
          <span>{isMarkingAll ? "Đang xử lý..." : "Đánh dấu tất cả đã đọc"}</span>
        </Button>
      </Popover.Header>
      <Popover.Body className="d-flex flex-column h-100 p-0 flex-grow-1">
        {isLoadingList && (
          <div className="d-flex justify-content-center align-items-center py-4">
            <Spinner animation="border" size="sm" />
            <span className="ms-2">Đang tải...</span>
          </div>
        )}

        {!isLoadingList && notifications.length === 0 && (
          <div className="text-center text-muted py-4">
            {hasOpened ? "Không có thông báo" : "Nhấn chuông để xem thông báo"}
          </div>
        )}

        {!isLoadingList && notifications.length > 0 && (
          <ListGroup variant="flush" className="overflow-auto" style={{ maxHeight: 260 }}>
            {notifications.slice(0, MAX_DISPLAY).map((notification) => (
              <ListGroup.Item
                key={notification._id}
                action
                onClick={() => handleMarkAsRead(notification)}
                className={`py-2 ${notification.is_read ? "" : "bg-light"}`}
              >
                <Stack direction="horizontal" gap={2}>
                  <div className="flex-grow-1">
                    {renderNotificationContent(notification)}
                    <div className="small text-muted mt-1">{formatDateTime(notification.created_at)}</div>
                  </div>
                  {!notification.is_read && (
                    <Badge bg="primary" pill>New</Badge>
                  )}
                </Stack>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Popover.Body>
    </Popover>
  );

  return (
    <OverlayTrigger
      rootClose
      trigger="click"
      placement="bottom-end"
      show={showPopover}
      onToggle={handleToggle}
      popperConfig={{
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [10, 20],
            },
          },
        ],
      }}
      overlay={popover}
    >
      <div
        className={styles.notificationButton}
        role="button"
        aria-label="Thông báo"
        onClick={() => handleToggle(!showPopover)}
      >
        <BsBellFill size={20} />
        {unreadCount > 0 && (
          <Badge
            bg="warning"
            className={`${styles.notificationBadge} fw-normal text-center`}
            text="dark"
          >
            {badgeContent}
          </Badge>
        )}
      </div>
    </OverlayTrigger>
  );
};

export default Notifications;
