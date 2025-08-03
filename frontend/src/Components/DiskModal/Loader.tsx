const Loader = () => (
  <span
    className="loader"
    aria-label="Loader"
    style={{
      display: 'block',
      position: 'relative',
      height: '20px',
      width: '140px',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '20px auto',
      backgroundPosition: '0 0, 40px 0, 80px 0, 120px 0',
      animation: 'pgfill 1s linear infinite'
    }}
  />
);

export default Loader;
