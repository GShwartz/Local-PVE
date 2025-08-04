import styles from '../../CSS/Loader.module.css';

const Loader = () => (
  <div className={styles.loader}>
    {[...Array(5)].map((_, i) => (
      <div key={i} className={styles.circle}>
        <div className={styles.dot}></div>
        <div className={styles.outline}></div>
      </div>
    ))}
  </div>
);

export default Loader;
