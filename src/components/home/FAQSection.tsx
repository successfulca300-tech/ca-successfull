import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is CA Successful?",
    answer: "CA Successful is India's premier online coaching platform for Chartered Accountancy (CA) aspirants. We provide comprehensive test series, study materials, and expert guidance designed by AIR holders to help you excel in your CA exams."
  },
  {
    question: "How do I enroll in a test series?",
    answer: "Enrolling is simple! Visit our Test Series page, select your preferred series (S1, S2, S3, or S4), choose your subjects, and complete the payment. You'll get instant access to download papers and start your preparation."
  },
  {
    question: "What subjects are covered in the test series?",
    answer: "Our test series covers all major CA subjects including Accounting, Corporate Laws, Cost and Management Accounting, Taxation, Financial Reporting, Strategic Cost Management, Risk Management, and more. You can select specific subjects based on your needs."
  },
  {
    question: "How long do I have access to the test series?",
    answer: "Once purchased, you get lifetime access to the test series materials. You can download papers, attempt them at your convenience, and access solutions and feedback whenever needed."
  },
  {
    question: "What is the evaluation process?",
    answer: "After attempting a test paper, upload your answer sheet within the deadline. Our expert evaluators, including AIR holders, will provide detailed feedback, marking scheme, solutions, performance analytics, and all-India rankings."
  },
  {
    question: "Is there a refund policy?",
    answer: "We offer a 7-day refund policy for test series purchases. If you're not satisfied with the quality of materials within the first week, you can request a full refund. Contact our support team for assistance."
  },
  {
    question: "Can I get personalized doubt clearing?",
    answer: "Yes! All test series purchases include access to our doubt clearing sessions. You can submit your queries through our platform, and our experts will provide detailed explanations and guidance."
  },
  {
    question: "Are the test papers updated regularly?",
    answer: "Absolutely. Our test papers are regularly updated to reflect the latest exam patterns, syllabus changes, and current affairs. We ensure our materials stay relevant and comprehensive for your exam preparation."
  }
];

const FAQSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto">
            Find answers to common questions about our CA coaching programs and test series
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-foreground">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 pt-8 border-t border-primary/20">
          <h3 className="text-2xl font-bold text-foreground mb-3">Still have questions?</h3>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Our support team is here to help. Reach out to us for personalized assistance.
          </p>
          <a
            href="/contact"
            className="inline-block px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Contact Us →
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
