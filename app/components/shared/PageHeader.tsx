type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="type-page-title">{title}</h1>
        {description && (
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

type SectionHeaderProps = {
  title: string;
  description?: React.ReactNode;
  as?: 'h2' | 'h3';
};

export function SectionHeader({ title, description, as: Tag = 'h2' }: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <Tag className="type-section-title">{title}</Tag>
      {description && (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
