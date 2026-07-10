import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import FloatingMedicalBg from '../components/animations/FloatingMedicalBg';
import FadeIn from '../components/animations/FadeIn';
import { blogPosts, doctor } from '../data/content';

export default function BlogPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero-gradient py-20">
        <FloatingMedicalBg variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="gold-line mx-auto mb-4" />
            <h1 className="section-heading">Biopsy Insights</h1>
            <p className="mt-4 text-navy/60 max-w-2xl mx-auto">
              Expert articles about biopsies by {doctor.name}, interventional radiologist serving patients across Kenya.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="section-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post, i) => (
              <FadeIn key={post.slug} delay={i * 0.08}>
                <Link to={`/blog/${post.slug}`} className="card block h-full group">
                  <div className="h-40 rounded-xl bg-gradient-to-br from-sky-pad to-sky/10 mb-5 flex items-end p-4">
                    <span className="text-xs font-medium text-navy/40 bg-white/80 px-2 py-1 rounded-full">
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-semibold text-navy mb-2 group-hover:text-gold transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-navy/60 leading-relaxed mb-4">{post.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-gold group-hover:gap-2 transition-all">
                    Read article <ArrowRight size={14} />
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
