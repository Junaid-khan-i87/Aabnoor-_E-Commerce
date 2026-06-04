import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useCart } from '../CartContext';
import { ProductCard } from '../components/ProductGrid';
import { SEO } from '../components/SEO';
import { useProducts } from '../ProductContext';
import { useSite } from '../SiteContext';

type QuizAnswer = {
  goal: string;
  skin: string;
  texture: string;
};

const QUESTIONS = [
  {
    id: 'goal',
    title: 'What result do you want first?',
    options: [
      { value: 'glow', label: 'Glow', terms: ['glow', 'bright', 'radiance', 'vitamin'] },
      { value: 'hydrate', label: 'Hydration', terms: ['hydrate', 'moisture', 'hyaluronic', 'cream'] },
      { value: 'acne', label: 'Acne Care', terms: ['acne', 'salicylic', 'clarify', 'pore'] },
      { value: 'hair', label: 'Hair Care', terms: ['hair', 'shampoo', 'conditioner', 'scalp'] },
      { value: 'fragrance', label: 'Fragrance', terms: ['perfume', 'fragrance', 'scent'] },
    ],
  },
  {
    id: 'skin',
    title: 'Choose your skin feel',
    options: [
      { value: 'normal', label: 'Balanced', terms: ['normal', 'daily', 'all skin'] },
      { value: 'dry', label: 'Dry', terms: ['dry', 'moisture', 'cream', 'repair'] },
      { value: 'oily', label: 'Oily', terms: ['oily', 'oil', 'pore', 'matte'] },
      { value: 'sensitive', label: 'Sensitive', terms: ['sensitive', 'calm', 'soothing', 'gentle'] },
    ],
  },
  {
    id: 'texture',
    title: 'What format do you prefer?',
    options: [
      { value: 'light', label: 'Lightweight', terms: ['serum', 'gel', 'mist', 'light'] },
      { value: 'cream', label: 'Creamy', terms: ['cream', 'lotion', 'balm'] },
      { value: 'makeup', label: 'Makeup Ready', terms: ['makeup', 'primer', 'shade'] },
      { value: 'simple', label: 'Simple Routine', terms: ['daily', 'cleanser', 'wash'] },
    ],
  },
] as const;

export function SkinQuizPage() {
  const { productsList } = useProducts();
  const { addToCart } = useCart();
  const { settings } = useSite();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer>(() => {
    try {
      return JSON.parse(localStorage.getItem('aabnoor_skin_quiz') || '{}');
    } catch {
      return { goal: '', skin: '', texture: '' };
    }
  });

  const currentQuestion = QUESTIONS[step];
  const isComplete = QUESTIONS.every((question) => Boolean(answers[question.id as keyof QuizAnswer]));

  const recommendedProducts = useMemo(() => {
    const selectedTerms = QUESTIONS.flatMap((question) => {
      const selectedValue = answers[question.id as keyof QuizAnswer];
      return question.options.find((option) => option.value === selectedValue)?.terms || [];
    });

    const activeProducts = productsList.filter((product) => (product.status || 'active') === 'active');
    const scored = activeProducts
      .map((product) => {
        const haystack = [
          product.name,
          product.category,
          product.subCategory,
          product.description,
          product.fullDetails,
          product.ingredients,
          ...(product.tags || []),
          ...(product.concerns || []),
          ...(product.skin_type || []),
        ].join(' ').toLowerCase();
        const score = selectedTerms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
        return { product, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || (b.product.rating || 0) - (a.product.rating || 0))
      .map((item) => item.product)
      .slice(0, 4);

    return scored.length > 0
      ? scored
      : [...activeProducts].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);
  }, [answers, productsList]);

  const chooseAnswer = (value: string) => {
    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);
    localStorage.setItem('aabnoor_skin_quiz', JSON.stringify(nextAnswers));
    if (step < QUESTIONS.length - 1) {
      setStep((current) => current + 1);
    }
  };

  if (settings.enableSkinQuiz === false) {
    return (
      <main className="min-h-screen bg-[#faf6f0] pt-40 pb-24">
        <SEO title="Skin Quiz | Aabnoor Beauty" description="Aabnoor Beauty skin quiz." canonicalPath="/skin-quiz" />
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#c97a82]">Routine Finder</p>
          <h1 className="font-serif text-5xl font-light leading-none text-[#2d2426]">Skin quiz is currently paused</h1>
          <p className="mt-5 font-sans text-sm leading-7 text-[#8a7070]">
            Our team is updating recommendations. You can still browse the full product catalog.
          </p>
          <Link to="/shop" className="mt-8 inline-flex rounded-full bg-[#2d2426] px-7 py-3.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-[#c97a82]">
            Shop Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf6f0] pt-40 pb-24">
      <SEO
        title="Skin Quiz | Aabnoor Beauty"
        description="Take the Aabnoor Beauty skin quiz and get product recommendations for your routine."
        canonicalPath="/skin-quiz"
      />
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-[8px] bg-[#2d2426] p-6 text-white shadow-xl sm:p-8">
            <p className="mb-3 inline-flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#f1d5cd]">
              <Sparkles className="h-4 w-4" />
              Routine Finder
            </p>
            <h1 className="font-serif text-5xl font-light leading-none">Take the Skin Quiz</h1>
            <p className="mt-5 font-sans text-sm leading-7 text-white/65">
              Answer a few quick questions and get a cleaner starting point for your Aabnoor routine.
            </p>
            <div className="mt-8 flex gap-2">
              {QUESTIONS.map((question, index) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`h-2 flex-1 rounded-full transition-colors ${index <= step ? 'bg-[#c97a82]' : 'bg-white/15'}`}
                  aria-label={`Go to quiz step ${index + 1}`}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-[#2d2426]/10 bg-[#fffaf7] p-6 shadow-sm sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a7070]">
                  Step {step + 1} of {QUESTIONS.length}
                </p>
                <h2 className="mt-2 font-serif text-4xl text-[#2d2426]">{currentQuestion.title}</h2>
              </div>
              {isComplete && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#c97a82]/10 px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[#c97a82]">
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {currentQuestion.options.map((option) => {
                const selected = answers[currentQuestion.id as keyof QuizAnswer] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => chooseAnswer(option.value)}
                    className={`rounded-[8px] border p-4 text-left transition-colors ${
                      selected
                        ? 'border-[#c97a82] bg-[#c97a82] text-white'
                        : 'border-[#2d2426]/10 bg-white text-[#2d2426] hover:border-[#c97a82]'
                    }`}
                  >
                    <span className="font-serif text-2xl">{option.label}</span>
                    <span className={`mt-2 block font-sans text-xs leading-5 ${selected ? 'text-white/75' : 'text-[#8a7070]'}`}>
                      Matches products tagged with {option.terms.slice(0, 3).join(', ')}.
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7070] transition-colors hover:text-[#2d2426] disabled:opacity-35"
              >
                Back
              </button>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-[#2d2426] px-5 py-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#c97a82]"
              >
                Shop All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>

        {isComplete && (
          <section className="mt-12">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-[#c97a82]">
                  Your Match
                </p>
                <h2 className="mt-2 font-serif text-4xl text-[#2d2426]">Recommended routine</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAnswers({ goal: '', skin: '', texture: '' });
                  setStep(0);
                  localStorage.removeItem('aabnoor_skin_quiz');
                }}
                className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7070] underline underline-offset-4 hover:text-[#2d2426]"
              >
                Retake Quiz
              </button>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
              {recommendedProducts.map((product) => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
