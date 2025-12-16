import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Form, Spinner, Alert } from "react-bootstrap";
import { toast } from "react-toastify";

import "./auth.scss";

import { loginSchema } from "#schemas";
import { useRenderCount } from "custom-hooks/use-render-count";
import { useLoginMutation } from "services/auth-service";
import { useSelector } from "react-redux";

const LoginPage = () => {
  // useRenderCount("LoginPage");
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from?.pathname || "/";
  const [login, { isLoading }] = useLoginMutation();
  const [errorMessage, setErrorMessage] = useState("");
  const isAuthenticated = useSelector(state => Boolean(state.auth.isAuthenticated));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "all",
  });

  const onSubmit = (formValues) => {
    login({
      email: formValues.email,
      password: formValues.password,
    }).unwrap()
      .then(() => {
        toast.success("Đăng nhập thành công!");
        navigate(redirectPath, { replace: true });
      })
      .catch((error) => {
        if (error.ec === 401) {
          setErrorMessage(error.em);
          return;
        } else {
          setErrorMessage("Đã có lỗi xảy ra. Vui lòng thử lại sau.");
        }
      });
  };

  useEffect(() => { // chuyển hướng nếu đã đăng nhập
    if (isAuthenticated === true) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  return (
    <div className="auth-page">
      <div className="auth-bg"></div>
      <div className="auth-content container">
        <div className="row align-items-center min-vh-100">
          <div className="col-lg-6 d-none d-lg-block">
            <div className="auth-hero">
              <div className="auth-badge">2TPS Admin</div>
              <h2>Chào mừng quay lại bảng điều khiển</h2>
              <p>
                Đăng nhập bằng tài khoản quản trị để theo dõi đơn hàng, người dùng,
                sản phẩm và các chương trình khuyến mãi.
              </p>
              <ul>
                <li>Giám sát hoạt động bán hàng theo thời gian thực</li>
                <li>Quản lý kho và cập nhật tồn kho tức thì</li>
                <li>Phân quyền nhân sự và kiểm soát bảo mật</li>
              </ul>
            </div>
          </div>

          <div className="col-lg-6 col-md-10 ms-auto">
            <Card className="auth-card shadow-lg">
              <Card.Body>
                <div className="auth-header">
                  <div className="auth-logo">HelpD</div>
                  <div>
                    <p className="mb-0 text-muted">Khu vực quản trị</p>
                    <h3 className="fw-bold">Đăng nhập</h3>
                  </div>
                </div>

                <Form onSubmit={handleSubmit(onSubmit)} noValidate className="auth-form">
                  <Form.Group className="mb-3" controlId="adminEmail">
                    <Form.Label>Địa chỉ email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="dia-chi-email@gmail.com"
                      isInvalid={!!errors.email}
                      {...register("email")}
                      autoComplete="email"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email?.message}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="adminPassword">
                    <Form.Label>Mật khẩu</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Nhập mật khẩu đăng nhập"
                      isInvalid={!!errors.password}
                      {...register("password")}
                      autoComplete="current-password"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.password?.message}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <Form.Check
                      type="checkbox"
                      id="rememberAdmin"
                      label="Ghi nhớ đăng nhập"
                      className="text-muted"
                    />
                    <Link to="/forgot-password" className="auth-link">
                      Quên mật khẩu?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-100 auth-submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Spinner
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Đang xác thực...
                      </>
                    ) : (
                      "Đăng nhập"
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            {errorMessage && (
              <Alert variant="danger" className="mt-3">
                {errorMessage}
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
