import FilterClient from "#components/common/filter-cliend";

const sStaffRequestsPage = () => {
  const handleSubmitFilters = (filters) => {
    console.log("Applied Staff Requests Filters: ", filters);
  }
  return (
    <div>
      <FilterClient onSubmit={handleSubmitFilters} />
      <h1>Staff Requests</h1>
      {/* Additional content and components for staff requests can be added here */}
    </div>
  );
}

export default StaffRequestsPage;