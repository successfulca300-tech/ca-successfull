import Layout from "@/components/layout/Layout";

const Terms = () => {
  return (
    <Layout>
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
            Terms & Conditions
          </h1>
          <p className="text-primary-foreground/80 mt-3">
            Please read these terms carefully before using our platform.
          </p>
        </div>
      </div>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">1. Use of Platform</h2>
              <p className="text-muted-foreground">
                By using CA Successful, you agree to use the platform for personal learning purposes
                only. Sharing, reselling, or distributing test series papers, or
                solutions is strictly prohibited.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">2. Account Responsibility</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your login credentials and
                all activities under your account. Report unauthorized access immediately.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">3. Payments & Refunds</h2>
              <p className="text-muted-foreground">
                Purchases are valid for the selected Mentorship or test series only. All purchases are
                final and non-refundable.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">4. Test Series Submissions</h2>
              <p className="text-muted-foreground">
                Answer sheet submissions must follow the given deadlines. Late submissions may not be
                evaluated. Evaluation results are for guidance and learning purposes only.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">5. Content Ownership</h2>
              <p className="text-muted-foreground">
                All content on this platform including videos, notes, PDFs, and test series material is
                owned by CA Successful. Unauthorized use may lead to account termination and legal action.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">6. Service Changes</h2>
              <p className="text-muted-foreground">
                We may update or discontinue any part of the platform without prior notice. We may also
                update these terms, and continued use means acceptance of the updated terms.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">7. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about these Terms & Conditions, please contact us through the
                Contact page.
              </p>
            </div>

            {/* <div className="text-sm text-muted-foreground text-center">
              Last updated: {new Date().toLocaleDateString("en-IN")}
            </div> */}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Terms;
