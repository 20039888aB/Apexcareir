type ModulePlaceholderPageProps = {
  title: string;
  description: string;
};

export default function ModulePlaceholderPage({ title, description }: ModulePlaceholderPageProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
