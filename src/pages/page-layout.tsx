interface PageLayoutProps {
  pageTitle: string;
  pageDescription: string;
  children: React.ReactNode;
}

export function PageLayout({ pageTitle, pageDescription, children }: PageLayoutProps) {
  return (
    <div className="h-full flex flex-col p-4">
      <div>
        <p className="text-xl font-bold">{pageTitle}</p>
        <p className="text-lg">{pageDescription}</p>
      </div>
      <div className="flex-1  min-h-0 space-y-4 pt-4">{children}</div>
    </div>
  );
}
