import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, ListGroup, OverlayTrigger, Popover, Spinner, Stack } from "react-bootstrap";
import { BsBellFill, BsCheck2All, BsInboxFill } from "react-icons/bs";
import { toast } from "react-toastify";

import { useGetMyNotificationsQuery, useGetUnreadNotificationsCountQuery, useMarkAllNotificationsAsReadMutation, useMarkNotificationAsReadMutation } from "#services";
import { NOTIFICATION_TYPES, WEB_SOCKET_EVENTS } from "../_variables";
import { formatDateTime } from "#utils/format";
import styles from "./notifications.module.scss";
import { socket } from "services/axios-config";
import { useNavigate } from "react-router-dom";

const MAX_DISPLAY = 10;

const Notifications = () => {
  const navigate = useNavigate();
  const [showPopover, setShowPopover] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const { data: unreadData, isSuccess: isUnreadSuccess, refetch: refetchUnread } = useGetUnreadNotificationsCountQuery();
  const [unreadCount, setUnreadCount] = useState(0);

  const {
    data: notificationsData,
    isFetching: isLoadingList,
    isSuccess: isListSuccess,
    refetch: refetchList,
  } = useGetMyNotificationsQuery(
    { limit: MAX_DISPLAY },
  );
  const [notifications, setNotifications] = useState([]);

  const [markNotificationAsRead, { isLoading: isMarking }] = useMarkNotificationAsReadMutation();
  const [markAllNotificationsAsRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsAsReadMutation();
  const canRefetch = useRef(true);

  const handleUpdateNotifications = useCallback((data) => {
    const { notification, unread_count } = data;
    const _id = notification?._id;
    setUnreadCount(unread_count || 0);
    if (!_id) return;
    const idx = notifications.findIndex((n) => n._id === _id);
    if (idx === -1) {
      const newNotifications = [notification, ...notifications];
      setNotifications(newNotifications);
      return;
    };
    const newNotifications = [...notifications];
    newNotifications[idx] = notification;
    setNotifications(newNotifications);
  }, [notifications]);

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
    if (next && canRefetch.current) {
      refetchList?.();
      refetchUnread?.();
    }
  };

  const handleMarkAsRead = async (notification) => {
    if (!notification?._id) return;
    try {
      switch (notification.type) {
        case NOTIFICATION_TYPES.REQUEST_ASSIGNED:
          // Chuyển trang đến request
          const requestId = notification?.entity_id;
          if (!requestId) {
            toast.error("Không tìm thấy yêu cầu");
            break;
          }
          navigate(`/yeu-cau/${requestId}`, { replace: false });
          break;
        default:
          break;
      }
      await markNotificationAsRead(notification._id).unwrap();
      toast.info("Đã xem thông báo");
      // refetchList();
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

  useEffect(() => {
    if (isListSuccess && notificationsData?.dt?.notifications) {
      setNotifications(notificationsData.dt.notifications);
    }
  }, [isListSuccess, notificationsData]);

  useEffect(() => {
    if (isUnreadSuccess && unreadData?.dt?.count !== undefined) {
      setUnreadCount(unreadData.dt.count);
    }
  }, [isUnreadSuccess, unreadData]);

  useEffect(() => {
    if (showPopover) {
      setHasOpened(true);
    }
  }, [showPopover]);

  useEffect(() => {
    socket.on(WEB_SOCKET_EVENTS.NEW_NOTIFICATION, (data) => {
      console.log("Có thông báo mới:", data);
      canRefetch.current = false;
      handleUpdateNotifications(data);
    });
    return () => socket.off(WEB_SOCKET_EVENTS.NEW_NOTIFICATION);
  }, [handleUpdateNotifications]);



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
