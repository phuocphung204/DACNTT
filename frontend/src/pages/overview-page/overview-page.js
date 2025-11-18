import React from 'react';
import { Row, Col } from 'react-bootstrap';

import CalendarOverview from '../../components/calendar-overview/calendar-overview';
import DayTimeline from '../../components/day-timeline/day-timeline';

function OverviewPage() {
  return (
    <div>
      <Row>
        <Col lg={7}>
          <CalendarOverview />
        </Col>
        <Col lg={5}>
          <DayTimeline />
        </Col>
      </Row>
    </div>
  );
}

export default OverviewPage;
