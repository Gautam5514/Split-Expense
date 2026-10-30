import styles from "./SectionHeading.module.css";

export default function SectionHeading({ eyebrow, title, secondary, description, id }) {
  return <header className={styles.header}>
    <p className={styles.eyebrow}>{`// ${eyebrow}`}</p>
    <h2 id={id} className={styles.title}>{title}{secondary && <><br /><span>{secondary}</span></>}</h2>
    {description && <p className={styles.description}>{description}</p>}
  </header>;
}
