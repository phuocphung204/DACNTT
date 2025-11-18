import './calendar-overview.scss';

const CalendarOverview = () => {
  const days = [
    { date: '2025-11-01', count: 3 },
    { date: '2025-11-02', count: 15 },
    { date: '2025-11-03', count: 1 },
  ];

  return (
    <div className="calendar-overview">
      <div className="calendar-overview__header">
        <h5>Lịch tháng</h5>
        <div className="calendar-overview__legend">
          <span className="calendar-overview__legend-dot calendar-overview__legend-dot--low" /> 0–5
          &nbsp; yêu cầu
          <span className="calendar-overview__legend-dot calendar-overview__legend-dot--medium" /> 6–15
          &nbsp; yêu cầu
          <span className="calendar-overview__legend-dot calendar-overview__legend-dot--high" /> &gt; 15
          &nbsp; yêu cầu
        </div>
      </div>

      <div className="calendar-overview__grid">
        {days.map((d) => (
          <div key={d.date} className="calendar-overview__cell">
            <div className="calendar-overview__day-number">
              {new Date(d.date).getDate()}
            </div>
            <div className="calendar-overview__count">
              {d.count} yêu cầu
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CalendarOverview;
