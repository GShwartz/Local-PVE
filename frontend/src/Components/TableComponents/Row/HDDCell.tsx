const HDDCell = ({ hdd_sizes }: { hdd_sizes: string }) => {
  const hddList = hdd_sizes
    .split(',')
    .map(s => s.trim())
    .sort((a, b) => {
      // Match controller pattern (e.g., scsi0, scsi1, ide0, sata0, etc.)
      const matchA = a.match(/([a-zA-Z]+)(\d+)/);
      const matchB = b.match(/([a-zA-Z]+)(\d+)/);

      if (matchA && matchB) {
        const [ , ctrlA, numA ] = matchA;
        const [ , ctrlB, numB ] = matchB;

        // First sort by controller type alphabetically (scsi, ide, sata...)
        if (ctrlA !== ctrlB) {
          return ctrlA.localeCompare(ctrlB);
        }

        // Then by controller number numerically
        return parseInt(numA, 10) - parseInt(numB, 10);
      }

      return a.localeCompare(b);
    });

  let displayList: string[] = [];
  let extraCount = 0;

  if (hddList.length > 2) {
    displayList = hddList.slice(0, 2);
    extraCount = hddList.length - 2;
  } else {
    displayList = hddList;
  }

  return (
    <td className="px-6 py-4 text-center narrow-col">
      {displayList.map((disk, i) => (
        <div key={i}>{disk}</div>
      ))}
      {extraCount > 0 && <div>{`+${extraCount}`}</div>}
    </td>
  );
};

export default HDDCell;
