import { useState } from "react";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { BsArrowLeft, BsCheckCircleFill, BsEye, BsEyeSlash } from "react-icons/bs";

import { useConfirmResetPasswordMutation, useResetPasswordRequestMutation } from "#services/auth-service";
import { resetPasswordRequestSchema, resetPasswordSchema } from "#schemas";
import CountDown from "#components/common/count-down";

import "./auth.scss";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const isTokenMode = token && token.length > 0;
  const navigate = useNavigate();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [requestReset, { isLoading: isRequesting, isSuccess: isRequestSuccess }] = useResetPasswordRequestMutation();
  const [confirmReset, { isLoading: isConfirming, isSuccess: isConfirmSuccess }] = useConfirmResetPasswordMutation();

  const requestForm = useForm({
    resolver: zodResolver(resetPasswordRequestSchema),
    mode: "all",
    defaultValues: { email: "" },
  });

  const resetForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: "all",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const handleRequestSubmit = requestForm.handleSubmit((values) => {
    requestReset({ email: values.email });
  });

  const handleResetSubmit = resetForm.handleSubmit((values) => {
    confirmReset({ token, newPassword: values.newPassword });
  });

  const renderLeftPanel = () => (
    <div className="reset-card__side">
      <div className="reset-pill">An toàn &amp; riêng tư</div>
      <h3>Khôi phục mật khẩu của bạn</h3>
      <p>
        Chúng tôi giúp bạn lấy lại quyền truy cập chỉ trong vài bước nhỏ.
        Liên kết đặt lại có hiệu lực <strong>2 phút</strong> để đảm bảo an toàn.
      </p>
      <ul className="reset-steps">
        <li>
          <span className="reset-steps__index">1</span>
          <div>
            <strong>Nhập email</strong>
            <p>Gửi yêu cầu lấy lại mật khẩu</p>
          </div>
        </li>
        <li>
          <span className="reset-steps__index">2</span>
          <div>
            <strong>Kiểm tra hộp thư</strong>
            <p>Nhấp vào liên kết đặt lại mật khẩu</p>
          </div>
        </li>
        <li>
          <span className="reset-steps__index">3</span>
          <div>
            <strong>Tạo mật khẩu mới</strong>
            <p>Hoàn tất và đăng nhập lại</p>
          </div>
        </li>
      </ul>
      <div className="reset-note">
        Không thấy email? Kiểm tra mục thư rác hoặc liên hệ bộ phận hỗ trợ.
      </div>
      <Link to="/login" className="reset-back-link">
        <BsArrowLeft /> Quay lại đăng nhập
      </Link>
    </div>
  );

  const renderRequestForm = () => (
    <div className="reset-card__form">
      <div className="reset-heading">
        <h2>Quên mật khẩu?</h2>
        <p>Nhập email để nhận liên kết đặt lại, liên kết chỉ dùng được trong 2 phút.</p>
      </div>

      {isRequestSuccess && (
        <div className="reset-status reset-status--success">
          <BsCheckCircleFill />
          <div>
            <p className="title">Đã gửi email xác nhận</p>
            <p>Kiểm tra <Link target="_self" to="https://mail.google.com/mail/u/0/#search/%C4%91%E1%BA%B7t+l%E1%BA%A1i+m%E1%BA%ADt+kh%E1%BA%A9u">hộp thư</Link> và nhấp vào liên kết để đặt lại mật khẩu.</p>
          </div>
        </div>
      )}

      <Form noValidate onSubmit={handleRequestSubmit} className="reset-form">
        <Form.Group className="mb-3">
          <Form.Label htmlFor="email">Email đăng ký</Form.Label>
          <InputGroup>
            <Form.Control
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              isInvalid={!!requestForm.formState.errors.email}
              {...requestForm.register("email")}
            />
          </InputGroup>
          <Form.Control.Feedback type="invalid" className="d-block">
            {requestForm.formState.errors.email?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <div className="d-flex align-items-center justify-content-between mb-3 reset-meta">
          <span>Liên kết sẽ hết hạn sau 2 phút</span>
          {/* <span className="reset-tag">Miễn phí</span> */}
        </div>

        <Button type="submit" className="w-100" disabled={isRequesting}>
          {isRequesting ? "Đang gửi..." : "Gửi liên kết đặt lại"}
        </Button>
      </Form>
    </div>
  );

  const renderResetForm = () => (
    <div className="reset-card__form">
      <div className="reset-heading">
        <p className="reset-heading__eyebrow">Bước cuối</p>
        <h2>Tạo mật khẩu mới</h2>
        <p>Nhập mật khẩu mới và xác nhận để hoàn tất đặt lại.</p>
      </div>

      {isConfirmSuccess && (
        <div className="reset-status reset-status--success">
          <BsCheckCircleFill />
          <div>
            <p className="title">Đặt lại mật khẩu thành công</p>
            <CountDown durationSeconds={4} callback={() => navigate("/login")}>
              {(currentSeconds) => <p>Chúng tôi sẽ chuyển bạn về trang đăng nhập trong {currentSeconds} giây.</p>}
            </CountDown>
          </div>
        </div>
      )}

      <Form noValidate onSubmit={handleResetSubmit} className="reset-form">
        <Form.Group className="mb-3">
          <Form.Label htmlFor="newPassword">Mật khẩu mới</Form.Label>
          <InputGroup>
            <Form.Control
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu mới"
              autoComplete="new-password"
              isInvalid={!!resetForm.formState.errors.newPassword}
              {...resetForm.register("newPassword")}
            />
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              className="reset-visibility-btn"
              aria-label="Hiển thị mật khẩu mới"
            >
              {showNewPassword ? <BsEyeSlash /> : <BsEye />}
            </Button>
          </InputGroup>
          <Form.Control.Feedback type="invalid" className="d-block">
            {resetForm.formState.errors.newPassword?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label htmlFor="confirmPassword">Xác nhận mật khẩu</Form.Label>
          <InputGroup>
            <Form.Control
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              isInvalid={!!resetForm.formState.errors.confirmPassword}
              {...resetForm.register("confirmPassword")}
            />
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="reset-visibility-btn"
              aria-label="Hiển thị xác nhận mật khẩu"
            >
              {showConfirmPassword ? <BsEyeSlash /> : <BsEye />}
            </Button>
          </InputGroup>
          <Form.Control.Feedback type="invalid" className="d-block">
            {resetForm.formState.errors.confirmPassword?.message}
          </Form.Control.Feedback>
        </Form.Group>

        <div className="reset-meta mb-3">
          <span>Mẹo: dùng chữ hoa, ký tự số và ký tự đặc biệt để mạnh hơn.</span>
        </div>

        <Button type="submit" className="w-100" disabled={isConfirming}>
          {isConfirming ? "Đang cập nhật..." : "Lưu mật khẩu mới"}
        </Button>
      </Form>
    </div>
  );

  return (
    <div className="tps-reset-page">
      <div className="tps-reset-page__overlay"></div>
      <div className="container">
        <Row className="justify-content-center">
          <Col xl={10} lg={11}>
            <div className="reset-card">
              <Row className="g-0">
                <Col lg={5}>{renderLeftPanel()}</Col>
                <Col lg={7}>
                  {isTokenMode ? renderResetForm() : renderRequestForm()}
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
