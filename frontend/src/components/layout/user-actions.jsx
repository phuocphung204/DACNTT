import { Dropdown, Image } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import { useGetMyProfileQuery } from "services/auth-service";
import { logout } from "#redux";
import catAvatar from "#assets/images/cat-avatar.jpg";

const UserActions = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { data = {} } = useGetMyProfileQuery({ skip: isAuthenticated === false });

  const avatarUrl = data.dt?.avatar || catAvatar;
  const fullName = data.dt?.name || "User";

  const handleLogout = () => {
    dispatch(logout());
    navigate("/dang-nhap", { replace: true });
  };

  return (
    <Dropdown align="start" drop="up">
      <Dropdown.Toggle as="div" className="d-flex align-items-center dropdown-toggle-no-caret">
        <Image src={avatarUrl} className="me-2" roundedCircle width={40} height={40} alt={fullName} />
        <span className="d-flex flex-column">
          <span>Xin chào,</span>
          <span className="fw-bold">{fullName}</span>
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu as="ul">
        <Dropdown.Item as="li" href="#/action-1">Action</Dropdown.Item>
        <Dropdown.Item as="li" href="#/action-2">Another action</Dropdown.Item>
        <Dropdown.Item as="li" href="#/action-3">Something else</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item as="li" onClick={handleLogout}>
          Đăng xuất
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown >
  );
}

export default UserActions;