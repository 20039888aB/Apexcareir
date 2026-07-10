import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import FadeIn from '../components/animations/FadeIn';
import { blogPosts } from '../data/content';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <>
      <section className="bg-hero-gradient py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-navy/60 hover:text-gold transition-colors mb-6">
              <ArrowLeft size={14} /> Back to Blog
            </Link>
            <div className="flex items-center gap-3 text-xs text-navy/50 mb-4">
              <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
              <span>&middot;</span>
              <span>{new Date(post.date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-navy leading-tight">{post.title}</h1>
            <p className="mt-4 text-navy/60 text-lg">{post.excerpt}</p>
          </FadeIn>
        </div>
      </section>

      <section className="section-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <article className="prose-custom space-y-5">
              {post.content.map((para, i) => (
                <p key={i} className="text-navy/70 leading-relaxed text-base">{para}</p>
              ))}
            </article>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
