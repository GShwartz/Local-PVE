const TableWarningRow = () => (
  <tr>
    <td colSpan={11} className="bg-yellow-600 text-white text-center py-2 text-xs sm:text-sm">
      <span className="font-medium">
        CPU or RAM changes require the VM to be stopped. Please stop the VM before applying changes.
      </span>
    </td>
  </tr>
);

export default TableWarningRow;
