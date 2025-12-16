const Header = ({ handleToggleSidebar }) => {

  return (
    <nav className="app-header navbar navbar-expand bg-body">
      <div className="container-fluid">
        <ul className="navbar-nav">
          <li className="nav-item">
            <button type="button" className="nav-link btn btn-link px-2 nav-link-toggle" onClick={handleToggleSidebar}>
              <i className="bi bi-list"></i>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Header;