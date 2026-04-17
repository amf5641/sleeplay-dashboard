interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = "📋", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold font-heading text-brand-black dark:text-[#F1F0EE] mb-1">{title}</h3>
      {description && <p className="text-brand-gray dark:text-[#9CA3AF] text-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
