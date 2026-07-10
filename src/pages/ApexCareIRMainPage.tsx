import { BarChart3, Boxes, ShieldCheck, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ApexCareIRShell from '../layouts/apexcareir/ApexCareIRShell';

const foundationItems = [
  {
    title: 'Modular Architecture',
    description: 'Frontend and backend are split by domain to keep features isolated and scalable.',
    icon: Boxes,
  },
  {
    title: 'Secure Access Layer',
    description: 'JWT authentication and permission-driven APIs are configured as the security foundation.',
    icon: ShieldCheck,
  },
  {
    title: 'Business Modules',
    description: 'Inventory, sales, suppliers, finance, reports, and dashboard modules are scaffolded.',
    icon: Users,
  },
  {
    title: 'Analytics-Ready',
    description: 'Data pipeline structure is prepared for insights, charts, and operational reporting.',
    icon: BarChart3,
  },
];

export default function ApexCareIRMainPage() {
  return (
    <ApexCareIRShell>
      <div>
        <div className="mb-10 rounded-3xl border border-apex-primary/20 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-apex-primary">
            Apex Care IR Inventory & Business Management
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 md:text-4xl">
            Apexcareir main
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            This section is the dedicated entry point for the complete business system.
            Milestone 1 initializes the architecture, package setup, and secure foundation for all modules.
          </p>
          <div className="mt-6">
            <Link
              to="/apexcareir-main/login"
              className="inline-flex items-center rounded-lg bg-apex-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Open Business Login
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {foundationItems.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <item.icon className="mb-4 h-6 w-6 text-apex-primary" />
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </ApexCareIRShell>
  );
}
