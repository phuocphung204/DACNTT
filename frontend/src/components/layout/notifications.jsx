import { useState } from "react";
import { Badge, OverlayTrigger, Popover } from "react-bootstrap";
import { BsBellFill } from "react-icons/bs";

import styles from "./notifications.module.scss";
import { Link } from "react-router-dom";

const Notifications = () => {
  const [numOfNotifications] = useState(0);
  const [limitNumOfNotifications] = useState(20);
  const [notifications] = useState([]);

  return (
    <OverlayTrigger
      rootClose
      trigger="click"
      placement="bottom-end"
      popperConfig={{
        modifiers: [
          {
            name: 'offset',
            options: {
              // [Skidding, Distance]
              // Skidding: 0 (không trượt dọc)
              // Distance: 20 (cách xa nút bấm 20px)
              offset: [10, 20],
            },
          },
        ],
      }}
      overlay={
        <Popover className={`${styles.popover} fw-normal d-flex flex-column`}>
          <Popover.Header as="p" className="bg-light">Thông báo</Popover.Header>
          <Popover.Body className="d-flex flex-column h-100 p-0 flex-grow-1 py-1">
            {numOfNotifications === 0 && (
              <p className="text-center">Không có thông báo mới</p>
            )}
            <hr className="mt-auto mb-1" />
            <Link className="text-muted text-center">Xem tất cả</Link>
          </Popover.Body>
        </Popover>
      }
    >
      <div className={styles.notificationButton}>
        <BsBellFill size={20} />
        {numOfNotifications > 0 &&
          (<Badge bg="warning"
            className={`${styles.notificationBadge} fw-normal text-center`} text="dark"
          >
            {numOfNotifications < limitNumOfNotifications ? numOfNotifications : `+${limitNumOfNotifications}`}
          </Badge>)
        }
      </div>
    </OverlayTrigger>
  )
};

export default Notifications;