import Notifications from "./notifications";

const Header = ({ handleToggleSidebar }) => {

  return (
    <nav className="app-header navbar navbar-expand bg-body sticky-top">
      <div className="container-fluid">
        <ul className="navbar-nav d-flex align-items-center w-100">
          <li className="nav-item">
            <button type="button" className="nav-link btn btn-link px-2 nav-link-toggle" onClick={handleToggleSidebar}>
              <i className="bi bi-list"></i>
            </button>
          </li>

          <li className="nav-item ms-auto"></li>

          <li className="nav-item">
            <Notifications />
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Header;