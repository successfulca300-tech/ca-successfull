import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronDown, ChevronUp, Heart, Target, Users, TrendingUp, Clock, Star, FileText, ArrowRight } from "lucide-react";

const Mentorship = () => {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <Layout>
      {/* ==================== 1. HERO SECTION ==================== */}
      <section className="bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-primary-foreground py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"><div className="absolute w-96 h-96 bg-white rounded-full -top-48 -right-48"></div></div>
        <div className="absolute inset-0 opacity-10"><div className="absolute w-96 h-96 bg-white rounded-full -bottom-48 -left-48"></div></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block bg-white/20 px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white">✨ Expert Mentorship for Test Series</p>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-white drop-shadow-lg">
              Master Test Series<br/>with Expert Mentorship
            </h1>
            <p className="text-xl text-white/90 mb-6 leading-relaxed max-w-2xl mx-auto">
              Get detailed answer evaluation, personalized feedback, and proven strategies from mentors who guide your test series preparation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/95 font-semibold shadow-lg text-base py-6">
                Start Mentorship Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                onClick={() => navigate('/test-series')}
                className="border-2 border-white text-white hover:bg-white hover:text-primary font-semibold shadow-lg text-base py-6 bg-transparent"
              >
                View Test Series
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 2. WHY MENTORSHIP (Test Series Focused) ==================== */}
      <section className="py-20 bg-gradient-to-b from-background to-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Why Test Series Mentorship Works</h2>
            <p className="text-muted-foreground mt-4 text-lg">Test series alone isn't enough. Guided practice with feedback is.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Problem 1 */}
            <div className="p-8 bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 rounded-xl shadow-md hover:shadow-lg transition">
              <h3 className="font-bold text-red-900 mb-4 text-lg">❌ Without Mentorship</h3>
              <ul className="space-y-2 text-sm text-red-800">
                <li>• Attempt tests without knowing your weak areas</li>
                <li>• Get marks but no feedback on mistakes</li>
                <li>• Repeat same errors in next attempt</li>
                <li>• Don't know how to improve answer writing</li>
                <li>• Score stagnates despite multiple attempts</li>
              </ul>
            </div>

            {/* Solution 1 */}
            <div className="p-8 bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-xl shadow-md hover:shadow-lg transition">
              <h3 className="font-bold text-green-900 mb-4 text-lg">✅ With Test Mentorship</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Detailed answer sheet evaluation after each test</li>
                <li>• Subject-wise performance breakdown</li>
                <li>• Mentor feedback on improvement areas</li>
                <li>• Answer writing guidance & techniques</li>
                <li>• Proven improvement: 20-35% score increase</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 3. MENTORSHIP PLANS (Pricing Section) ==================== */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Mentorship Plans</h2>
            <p className="text-muted-foreground mt-4 text-lg">Choose your mentorship level and level up your scores</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plan 1: CA Successful Mentorship */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition transform hover:scale-105">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-6">
                <h3 className="text-2xl font-bold">Basic</h3>
                <p className="text-blue-100 mt-2 text-sm">For consistent learners</p>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <span className="text-4xl font-bold">₹1,499</span>
                  <p className="text-muted-foreground text-sm mt-2">per month</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Answer sheet evaluation (bi-weekly)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Detailed mentor feedback</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Performance analysis & tips</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Subject-wise insights</span>
                  </li>
                </ul>

                <Button className="w-full bg-blue-600 hover:bg-blue-700">Get Started</Button>
              </div>
            </div>

            {/* Plan 2: Golden Mentorship (POPULAR) */}
            <div className="bg-white border-2 border-amber-400 rounded-xl overflow-hidden shadow-2xl hover:shadow-2xl transition relative md:scale-105">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-1 text-sm font-semibold rounded-bl">⭐ POPULAR</div>
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 pt-10">
                <h3 className="text-2xl font-bold">Golden</h3>
                <p className="text-amber-100 mt-2 text-sm">Most effective mentorship</p>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <span className="text-4xl font-bold">₹2,999</span>
                  <p className="text-muted-foreground text-sm mt-2">per month</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">All Basic features</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Weekly answer evaluation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">1:1 strategy sessions (bi-weekly)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Personalized improvement plan</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Direct mentor access</span>
                  </li>
                </ul>

                <Button className="w-full bg-amber-600 hover:bg-amber-700">Choose Golden</Button>
              </div>
            </div>

            {/* Plan 3: Platinum Mentorship */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition transform hover:scale-105">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                <h3 className="text-2xl font-bold">Platinum</h3>
                <p className="text-purple-100 mt-2 text-sm">Premium personal mentorship</p>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <span className="text-4xl font-bold">₹4,999</span>
                  <p className="text-muted-foreground text-sm mt-2">per month</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">All Golden features</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Dedicated personal mentor</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Weekly 1:1 strategy calls</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Detailed answer evaluation weekly</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Customized study roadmap</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Priority support & guidance</span>
                  </li>
                </ul>

                <Button className="w-full bg-purple-600 hover:bg-purple-700">Choose Platinum</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 4. HOW TEST MENTORSHIP WORKS ==================== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">How Test Series Mentorship Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Simple, effective, results-driven process</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              {[
                { step: "1", title: "Attempt Test", desc: "Complete test series", icon: "📝" },
                { step: "2", title: "Submit Sheet", desc: "Upload answer sheet", icon: "📤" },
                { step: "3", title: "Get Feedback", desc: "Mentor evaluation", icon: "📊" },
                { step: "4", title: "Improve", desc: "Apply & retry", icon: "🚀" },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-5xl mb-3 transform hover:scale-110 transition">{item.icon}</div>
                  <div className="font-bold text-primary mb-2 text-lg">{item.title}</div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                  {idx < 3 && <div className="text-2xl text-primary/30 mt-4 hidden md:block">→</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200 hover:shadow-lg transition">
              <h3 className="font-bold text-primary mb-3 text-lg">📋 Answer Evaluation</h3>
              <p className="text-sm text-muted-foreground">
                Your mentor reviews your answer sheet in detail, marks you properly, and identifies where you went wrong.
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-200 hover:shadow-lg transition">
              <h3 className="font-bold text-purple-600 mb-3 text-lg">📈 Performance Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Get subject-wise analysis, topic-wise breakdown, and clear areas for improvement with each evaluation.
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-200 hover:shadow-lg transition">
              <h3 className="font-bold text-amber-700 mb-3 text-lg">💡 Strategic Guidance</h3>
              <p className="text-sm text-muted-foreground">
                Mentor provides specific tips, techniques, and personalized strategies to improve your next attempt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 5. WHO THIS IS FOR ==================== */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Who Should Join Test Series Mentorship</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">If any of these describe you, mentorship will help</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              "Students attempting our test series regularly",
              "Those scoring inconsistently despite multiple attempts",
              "Students wanting detailed answer sheet feedback",
              "People preparing strategically for CA exams",
              "Those struggling with specific subjects in tests",
              "Students aiming for score improvement",
              "Anyone needing personalized test guidance",
              "Those wanting expert mentorship with tests",
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 p-6 bg-white rounded-lg border border-gray-200 hover:border-primary/50 hover:shadow-lg transition">
                <Heart className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-base font-medium text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== 6. MENTOR SUPPORT & EVALUATION ==================== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Mentor Support & Evaluation Process</h2>
            <p className="text-lg text-muted-foreground">How we track and improve your performance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="space-y-6">
              <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Users className="text-primary" />
                  Mentor Interaction
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-primary font-bold">✓</span>
                    <span className="text-muted-foreground">Weekly 1:1 video sessions (30-45 min)</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-primary font-bold">✓</span>
                    <span className="text-muted-foreground">Chat support for quick doubts</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-primary font-bold">✓</span>
                    <span className="text-muted-foreground">Question clarification without delays</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-primary font-bold">✓</span>
                    <span className="text-muted-foreground">Strategy discussion for each subject</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-primary font-bold">✓</span>
                    <span className="text-muted-foreground">Motivation & accountability calls</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-8 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-200">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <TrendingUp className="text-purple-600" />
                  Performance Tracking
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Score analysis after each test</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Subject-wise performance breakdown</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Weakness identification & action plan</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Progress reports (bi-weekly/weekly)</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Improvement recommendations</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-8 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl border border-green-200">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FileText className="text-green-600" />
                  Test Evaluation
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Detailed answer sheet review</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Marks breakdown & analysis</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Common mistakes identified</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Topic-specific feedback</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Improvement strategies shared</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-8 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-200">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Clock className="text-orange-600" />
                  Feedback Mechanism
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-orange-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Written feedback on test submissions</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-orange-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Video explanations for key mistakes</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-orange-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Personalized study material</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-orange-600 font-bold">✓</span>
                    <span className="text-muted-foreground">Monthly progress summaries</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-orange-600 font-bold">✓</span>
                    <span className="text-muted-foreground">24/7 response within 24 hours</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 7. COMPARISON: COURSE vs MENTORSHIP ==================== */}
      <section className="py-20 bg-gradient-to-br from-background via-slate-50 to-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Why Mentorship Beats Tests Alone</h2>
            <p className="text-lg text-muted-foreground">A clear comparison</p>
          </div>

          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-primary/10 to-blue-100">
                  <th className="border border-gray-200 p-4 text-left font-bold text-foreground">Feature</th>
                  <th className="border border-gray-200 p-4 text-center font-bold text-foreground">Test Series Only</th>
                  <th className="border border-gray-200 p-4 text-center font-bold text-primary">With Mentorship</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ["Personal Study Plan", false, true],
                  ["1:1 Mentor Sessions", false, true],
                  ["Performance Tracking", false, true],
                  ["Personalized Feedback", false, true],
                  ["Test Evaluation", false, true],
                  ["Accountability Check-ins", false, true],
                  ["Doubt Clarification", false, true],
                  ["Test Papers Available", true, true],
                  ["Self-paced Learning", true, true],
                  ["Community Support", false, false],
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-200 p-4 font-medium text-foreground">{row[0]}</td>
                    <td className="border border-gray-200 p-4 text-center">
                      {row[1] ? (
                        <Check className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-400 mx-auto" />
                      )}
                    </td>
                    <td className="border border-gray-200 p-4 text-center bg-primary/5">
                      {row[2] ? (
                        <Check className="w-5 h-5 text-primary mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==================== 8. FAQs ==================== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">Clear answers to common questions</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: "How does test series mentorship work?",
                a: "You attempt our test series, submit your answer sheets, and your mentor evaluates them in detail. You get feedback on mistakes, areas to improve, and strategies for next attempt."
              },
              {
                q: "How often will I get feedback on my answers?",
                a: "In Basic plan: bi-weekly. In Golden: weekly. In Platinum: weekly with dedicated mentor. Turnaround time is typically 2-3 days."
              },
              {
                q: "Can I start mentorship without purchasing test series?",
                a: "Yes, mentorship works best with our test series, but you can also submit any practice papers you have. However, we recommend taking our test series for structured evaluation."
              },
              {
                q: "How long should I stay on mentorship?",
                a: "Most students see significant improvement in 2-3 months of consistent participation. You can continue as long as you're attempting tests and working with feedback."
              },
              {
                q: "Can I switch mentors?",
                a: "Yes. In Basic and Golden plans, you may work with different mentors. In Platinum, you get a dedicated mentor, but can request a change if needed within first 2 weeks."
              },
              {
                q: "What if I miss a scheduled evaluation?",
                a: "You can submit your sheet anytime. Mentor will evaluate it within 2-3 days. No penalty, but consistency helps track your improvement better."
              },
              {
                q: "Is there a refund policy?",
                a: "Yes. 14-day money-back guarantee if you're not satisfied. After that, you can pause your mentorship for up to 30 days without charges."
              },
              {
                q: "Can I get mentorship for specific subjects only?",
                a: "Yes. Let us know which subjects you want focused mentorship on, and we'll customize your plan accordingly."
              },
              {
                q: "How are performance evaluations done?",
                a: "Mentors mark your answers, provide subject-wise breakdown, identify common mistakes, and give specific improvement tips based on what went wrong."
              },
              {
                q: "What if I don't see improvement?",
                a: "We track your progress closely. If you're consistent but not improving, mentor adjusts strategy. Our success guarantee ensures you get extended mentorship FREE if improvement stalls with full engagement."
              }
            ].map((faq, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden hover:border-primary/50 transition">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 flex items-center justify-between bg-gradient-to-r from-slate-50 to-gray-50 hover:bg-slate-100 transition"
                >
                  <span className="font-semibold text-left text-foreground">{faq.q}</span>
                  {expandedFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === idx && (
                  <div className="p-5 bg-white border-t border-gray-200">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== 9. FINAL CTA SECTION ==================== */}
      <section className="py-24 bg-gradient-to-r from-primary via-blue-600 to-indigo-700 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"><div className="absolute w-96 h-96 bg-white rounded-full -top-48 right-0"></div></div>
        <div className="absolute inset-0 opacity-10"><div className="absolute w-96 h-96 bg-white rounded-full -bottom-48 -left-48"></div></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-white">
              Score More with Guided Test Series Mentorship
            </h2>
            
            <p className="text-xl text-white/90 mb-8">
              Stop attempting tests in the dark. Get expert feedback, strategic guidance, and real improvement with every attempt.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/test-series')}
                className="bg-white text-primary hover:bg-white/95 font-semibold px-8 py-3 rounded-lg shadow-lg transition text-base"
              >
                View Test Series
              </button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-semibold px-8">
                Start Mentorship
              </Button>
            </div>

            <p className="mt-8 text-sm text-white/70">
              Basic ₹1,499 • Golden ₹2,999 • Platinum ₹4,999 per month
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Mentorship;