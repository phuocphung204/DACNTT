import React from 'react';
import './day-timeline.scss';

const DayTimeline = () => {
  const items = [
    { time: '08:30', title: 'REQ-001 - Xin xác nhận giấy tờ tốt nghiệp' },
    { time: '09:15', title: 'REQ-002 - Xem lại điểm môn MMDS' },
    { time: '10:00', title: 'REQ-003 - Xin hoãn nộp học phí' },
  ];

  return (
    <div className="day-timeline">
      <div className="day-timeline__header">
        <h5>Chi tiết yêu cầu trong ngày</h5>
        <div className="day-timeline__filters">
          <button className="day-timeline__chip day-timeline__chip--active">
            Tất cả
          </button>
          <button className="day-timeline__chip">Học vụ</button>
          <button className="day-timeline__chip">Học phí</button>
          <button className="day-timeline__chip">Giấy tờ</button>
        </div>
      </div>

      <div className="day-timeline__list">
        {items.map((item, index) => (
          <div key={index} className="day-timeline__row">
            <div className="day-timeline__time">{item.time}</div>
            <div className="day-timeline__line" />
            <div className="day-timeline__content">{item.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DayTimeline;
