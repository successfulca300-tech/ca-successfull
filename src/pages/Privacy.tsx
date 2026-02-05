import Layout from "@/components/layout/Layout";

const Privacy = () => {
  return (
    <Layout>
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
            Privacy Policy
          </h1>
          <p className="text-primary-foreground/80 mt-3">
            Your trust matters to us. This page explains how we handle your data.
          </p>
        </div>
      </div>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
              <ul className="text-muted-foreground space-y-2">
                <li>Account details like name, email, phone number, and password.</li>
                <li>Payment and transaction information for test series or course purchases.</li>
                <li>Uploaded files such as test series answers (for evaluation).</li>
                <li>Usage data like pages visited and interactions for improving learning experience.</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
              <ul className="text-muted-foreground space-y-2">
                <li>To create and manage your account and enrollments.</li>
                <li>To process payments and deliver purchased content.</li>
                <li>To evaluate test series answers and provide feedback.</li>
                <li>To send important updates related to your Mentorship or test series.</li>
                <li>To improve our teaching content, analytics, and platform performance.</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">3. Data Sharing & Security</h2>
              <p className="text-muted-foreground">
                We do not sell your personal data. We may share data only with trusted service
                providers (payment gateway, storage, or analytics) strictly for platform operations.
                We follow industry-standard security practices to protect your information.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">4. Cookies & Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies or similar technologies to keep you signed in and to improve user
                experience. You can disable cookies in your browser settings, but some features
                may not work properly.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">5. Your Rights</h2>
              <ul className="text-muted-foreground space-y-2">
                <li>Access and update your account details anytime.</li>
                <li>Request deletion of your account (subject to legal/financial records).</li>
                <li>Opt out of promotional messages if enabled in future.</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-3">6. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please reach out through the
                Contact page. We will respond as quickly as possible.
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

export default Privacy;
