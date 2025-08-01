const HDDCell = ({ hdd_sizes }: { hdd_sizes: string }) => {
  const hddList = hdd_sizes.split(',').map(s => s.trim()).sort((a, b) => {
    const numA = parseInt(a.match(/disk-(\d+)/)?.[1] || '0', 10);
    const numB = parseInt(b.match(/disk-(\d+)/)?.[1] || '0', 10);
    return numA - numB;
  });

  return (
    <td className="px-6 py-4 text-center narrow-col">
      {hddList.length > 1 ? hddList.map((disk, i) => <div key={i}>{disk}</div>) : hdd_sizes}
    </td>
  );
};

export default HDDCell;
