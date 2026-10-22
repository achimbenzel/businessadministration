// Empty state: an icon, a sentence, an action.
export default function Empty({ icon: Icon, title, children, action, compact = false }) {
  return (
    <div className={`empty ${compact ? 'empty-compact' : ''}`}>
      {Icon && <Icon size={compact ? 24 : 30} />}
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
