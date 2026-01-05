import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Container, Form, Image, Row, Spinner } from "react-bootstrap";
import { useSelector } from "react-redux";

import { useGetMyProfileQuery } from "services/auth-service";
import { useUpdateMyProfileMutation, useUploadMyAvatarMutation } from "services/account-services";

const UserProfilePage = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { data, isLoading, isError, refetch } = useGetMyProfileQuery(undefined, { skip: !isAuthenticated });
  const [updateProfile, { isLoading: isSaving, isError: isSaveError, isSuccess, error: saveError }] = useUpdateMyProfileMutation();
  const [uploadAvatar, { isLoading: isUploading, isError: isUploadError, isSuccess: isUploadSuccess, error: uploadError }] = useUploadMyAvatarMutation();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    gender: "",
    phone_number: "",
    avatar: "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarMessage, setAvatarMessage] = useState("");

  useEffect(() => {
    if (data?.dt) {
      setFormData({
        name: data.dt.name || "",
        email: data.dt.email || "",
        position: data.dt.position || "",
        gender: data.dt.gender || "",
        phone_number: data.dt.phone_number || "",
        avatar: data.dt.avatar || "",
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    setAvatarMessage("");
    setAvatarFile(file || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    await updateProfile(payload);
    refetch();
  };

  const handleUploadAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile) {
      setAvatarMessage("Vui lòng chọn ảnh trước khi tải lên.");
      return;
    }
    setAvatarMessage("");

    try {
      const response = await uploadAvatar(avatarFile).unwrap();
      const uploadedUrl = response?.dt?.avatar || formData.avatar;
      setFormData((prev) => ({ ...prev, avatar: uploadedUrl }));
      setAvatarFile(null);
      refetch();
    } catch (err) {
      setAvatarMessage(err?.em || err?.data?.em || "Tải ảnh thất bại, vui lòng thử lại.");
    }
  };

  if (isLoading) {
    return (
      <Container className="py-4">
        <div className="d-flex justify-content-center align-items-center">
          <Spinner animation="border" role="status" />
        </div>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container className="py-4">
        <Alert variant="danger">Không tải được thông tin cá nhân. Vui lòng thử lại.</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <Card.Title className="mb-0">Thông tin cá nhân</Card.Title>
              <Card.Text className="text-muted small mb-0">
                Xem và cập nhật thông tin tài khoản của bạn.
              </Card.Text>
            </Card.Header>
            <Card.Body>
              {isSuccess && <Alert variant="success">Cập nhật thành công.</Alert>}
              {isSaveError && (
                <Alert variant="danger">
                  {saveError?.data?.em || "Có lỗi xảy ra, vui lòng thử lại."}
                </Alert>
              )}
              {isUploadSuccess && <Alert variant="success">Ảnh đại diện đã được cập nhật.</Alert>}
              {(avatarMessage || isUploadError) && (
                <Alert variant="danger">
                  {avatarMessage || uploadError?.data?.em || "Tải ảnh thất bại, vui lòng thử lại."}
                </Alert>
              )}
              <Form onSubmit={handleSubmit}>
                <Row className="mb-3">
                  <Col md={3} className="text-center">
                    {formData.avatar ? (
                      <Image src={formData.avatar} roundedCircle width={96} height={96} alt="Avatar" />
                    ) : (
                      <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 96, height: 96 }}>
                        <span className="text-muted">No avatar</span>
                      </div>
                    )}
                    <Form.Group controlId="avatarUpload" className="mt-3">
                      <Form.Label className="fw-semibold">Cập nhật ảnh</Form.Label>
                      <Form.Control type="file" accept="image/*" onChange={handleAvatarFileChange} />
                    </Form.Group>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="mt-2"
                      onClick={handleUploadAvatar}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" /> Đang tải...
                        </>
                      ) : (
                        "Tải ảnh"
                      )}
                    </Button>
                  </Col>
                  <Col md={9}>
                    <Form.Group className="mb-3" controlId="name">
                      <Form.Label>Họ và tên</Form.Label>
                      <Form.Control
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Nhập họ và tên"
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Email công việc"
                        disabled
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group controlId="position">
                      <Form.Label>Chức vụ</Form.Label>
                      <Form.Control
                        name="position"
                        value={formData.position}
                        // onChange={handleChange}
                        disabled
                        placeholder="Ví dụ: Nhân viên hỗ trợ"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="gender">
                      <Form.Label>Giới tính</Form.Label>
                      <Form.Select name="gender" value={formData.gender} onChange={handleChange}>
                        <option value="">Chọn giới tính</option>
                        <option value="Male">Nam</option>
                        <option value="Female">Nữ</option>
                        <option value="Other">Khác</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group controlId="phone_number">
                      <Form.Label>Số điện thoại</Form.Label>
                      <Form.Control
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder="Nhập số điện thoại"
                      />
                    </Form.Group>
                  </Col>
                  {/* <Col md={6}>
                    <Form.Group controlId="avatar">
                      <Form.Label>Ảnh đại diện (URL)</Form.Label>
                      <Form.Control
                        name="avatar"
                        value={formData.avatar}
                        onChange={handleChange}
                        placeholder="Dán liên kết ảnh"
                      />
                    </Form.Group>
                  </Col> */}
                </Row>

                {data?.dt?.department_id?.name && (
                  <Form.Group className="mb-3">
                    <Form.Label>Phòng ban</Form.Label>
                    <Form.Control value={data.dt.department_id.name} readOnly />
                  </Form.Group>
                )}

                <div className="d-flex justify-content-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" /> Đang lưu...
                      </>
                    ) : (
                      "Lưu thay đổi"
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UserProfilePage;
