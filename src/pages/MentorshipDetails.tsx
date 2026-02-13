import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowLeft, FileText, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { enrollmentsAPI } from '@/lib/api';

const paperDetails: Record<string, { series: string; subject: string; name: string; icon: React.ReactNode }> = {
  s1_series1_fr: { series: 'Series 1', subject: 'Financial Reporting', name: 'FR Paper', icon: <FileText size={24} /> },
  s1_series1_afm: { series: 'Series 1', subject: 'Advanced Financial Management', name: 'AFM Paper', icon: <FileText size={24} /> },
  s1_series1_audit: { series: 'Series 1', subject: 'Auditing and Assurance', name: 'Audit Paper', icon: <FileText size={24} /> },
  s1_series1_dt: { series: 'Series 1', subject: 'Direct Tax', name: 'DT Paper', icon: <FileText size={24} /> },
  s1_series1_idt: { series: 'Series 1', subject: 'Indirect Tax', name: 'IDT Paper', icon: <FileText size={24} /> },
  
  s1_series2_fr: { series: 'Series 2', subject: 'Financial Reporting', name: 'FR Paper', icon: <FileText size={24} /> },
  s1_series2_afm: { series: 'Series 2', subject: 'Advanced Financial Management', name: 'AFM Paper', icon: <FileText size={24} /> },
  s1_series2_audit: { series: 'Series 2', subject: 'Auditing and Assurance', name: 'Audit Paper', icon: <FileText size={24} /> },
  s1_series2_dt: { series: 'Series 2', subject: 'Direct Tax', name: 'DT Paper', icon: <FileText size={24} /> },
  s1_series2_idt: { series: 'Series 2', subject: 'Indirect Tax', name: 'IDT Paper', icon: <FileText size={24} /> },
  
  s1_series3_fr: { series: 'Series 3', subject: 'Financial Reporting', name: 'FR Paper', icon: <FileText size={24} /> },
  s1_series3_afm: { series: 'Series 3', subject: 'Advanced Financial Management', name: 'AFM Paper', icon: <FileText size={24} /> },
  s1_series3_audit: { series: 'Series 3', subject: 'Auditing and Assurance', name: 'Audit Paper', icon: <FileText size={24} /> },
  s1_series3_dt: { series: 'Series 3', subject: 'Direct Tax', name: 'DT Paper', icon: <FileText size={24} /> },
  s1_series3_idt: { series: 'Series 3', subject: 'Indirect Tax', name: 'IDT Paper', icon: <FileText size={24} /> },
};

const mentorshipPlans: Record<string, { name: string; color: string }> = {
  mentorship_basic_01: { name: 'Basic Mentorship Plan', color: 'from-blue-500 to-cyan-500' },
  mentorship_golden_02: { name: 'Golden Mentorship Plan', color: 'from-amber-500 to-orange-500' },
  mentorship_platinum_03: { name: 'Platinum Mentorship Plan', color: 'from-purple-500 to-pink-500' },
};

interface MentorshipEnrollment {
  _id: string;
  mentorshipId: string;
  mentorshipPapers: string[];
  enrollmentDate: string;
}

const MentorshipDetails: React.FC = () => {
  const navigate = useNavigate();
  const { enrollmentId } = useParams();
  const [enrollment, setEnrollment] = useState<MentorshipEnrollment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrollment = async () => {
      try {
        setLoading(true);
        const res = await enrollmentsAPI.getAll() as any;
        const mentorshipEnrollments = (res?.enrollments || []).filter((e: any) => e.mentorshipId);
        
        if (mentorshipEnrollments.length > 0) {
          // Use the most recent mentorship enrollment if enrollmentId not provided
          const selectedEnrollment = enrollmentId
            ? mentorshipEnrollments.find((e: any) => e._id === enrollmentId)
            : mentorshipEnrollments[0];
          
          if (selectedEnrollment) {
            setEnrollment(selectedEnrollment);
          }
        }
      } catch (err) {
        console.error('Error fetching mentorship enrollment:', err);
        toast.error('Failed to load mentorship details');
        navigate('/dashboard?tab=courses');
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollment();
  }, [enrollmentId, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-96 flex items-center justify-center">
          <p className="text-muted-foreground">Loading mentorship details...</p>
        </div>
      </Layout>
    );
  }

  if (!enrollment) {
    return (
      <Layout>
        <div className="min-h-96 flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-4">No mentorship enrollment found</p>
          <Button onClick={() => navigate('/dashboard?tab=courses')} className="btn-primary">
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const planInfo = mentorshipPlans[enrollment.mentorshipId];
  const selectedPapers = enrollment.mentorshipPapers || [];

  return (
    <Layout>
      <div className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/dashboard?tab=courses')}
              className="flex items-center gap-2 text-primary-foreground hover:opacity-80 transition-opacity"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">Mentorship Details</h1>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Plan Overview */}
            <div className={`bg-gradient-to-r ${planInfo?.color} rounded-xl p-8 text-white shadow-lg`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen size={32} />
                    <h2 className="text-3xl font-bold">{planInfo?.name}</h2>
                  </div>
                  <p className="text-white/80">
                    Enrolled on {new Date(enrollment.enrollmentDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <CheckCircle2 size={40} className="text-white" />
              </div>
            </div>

            {/* Selected Papers */}
            <div className="bg-card rounded-xl border border-border p-8">
              <h3 className="text-xl font-semibold mb-6">Your Selected Papers</h3>
              
              {selectedPapers.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedPapers.map((paperId) => {
                    const paper = paperDetails[paperId];
                    if (!paper) return null;

                    return (
                      <div
                        key={paperId}
                        className="flex items-start gap-4 p-5 bg-secondary/30 rounded-lg border border-border hover:border-primary/30 transition-all"
                      >
                        <div className="p-3 bg-primary/10 rounded-lg text-primary">{paper.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{paper.name}</h4>
                          <p className="text-sm text-muted-foreground">{paper.subject}</p>
                          <p className="text-xs text-muted-foreground/75 mt-1">{paper.series}</p>
                        </div>
                        <CheckCircle2 size={20} className="text-success flex-shrink-0 mt-1" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No papers selected for this mentorship plan</p>
                </div>
              )}
            </div>

            {/* Next Steps */}
            <div className="bg-card rounded-xl border border-border p-8">
              <h3 className="text-xl font-semibold mb-4">What's Next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-success flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Your mentor will reach out soon to discuss your study plan</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-success flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Access your selected papers from the mentorship portal</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-success flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Participate in doubt-solving sessions and group discussions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-success flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Receive performance evaluations and personalized feedback</span>
                </li>
              </ul>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate('/dashboard?tab=courses')}
                className="btn-primary flex-1"
              >
                Back to Dashboard
              </Button>
              <Button
                onClick={() => navigate('/mentorship')}
                variant="outline"
                className="flex-1"
              >
                View Other Plans
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default MentorshipDetails;
