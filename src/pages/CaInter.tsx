import { FC, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Star, CheckCircle, BarChart, Users, RefreshCw, Loader } from 'lucide-react';
import Layout from '@/components/layout/Layout';

const CaInter: FC = () => {
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [formLoadFailed, setFormLoadFailed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isFormLoading) {
        setFormLoadFailed(true);
      }
    }, 15000); // 15 seconds timeout

    return () => clearTimeout(timer);
  }, [isFormLoading]);

  const handleReloadForm = () => {
    setFormLoadFailed(false);
    setIsFormLoading(true);
    // Force iframe to reload by changing the key
    setIframeKey(prevKey => prevKey + 1);
  };
  
  const [iframeKey, setIframeKey] = useState(0);


  const features = [
    {
      icon: <BarChart className="h-10 w-10 text-primary" />,
      title: "Detailed Performance Analytics",
      description: "Track your progress with in-depth reports and identify your strengths and weaknesses."
    },
    {
      icon: <CheckCircle className="h-10 w-10 text-green-500" />,
      title: "100% Syllabus Coverage",
      description: "Our tests cover the entire CA Inter syllabus, ensuring you're prepared for anything."
    },
    {
      icon: <Users className="h-10 w-10 text-purple-500" />,
      title: "Expert-Crafted Questions",
      description: "Questions designed by experienced CAs to mirror the actual exam pattern and difficulty."
    }
  ];

  return (
    <Layout>
      {/* Heading Section */}
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground animate-fade-in-down">
            CA Inter Test Series
          </h1>
          <p className="text-primary-foreground/80 mt-2 text-lg animate-fade-in-down animation-delay-200">
            Your journey to becoming a CA starts here. Get ready for our upcoming test series!
          </p>
        </div>
      </div>

      <div className="relative bg-gray-50 min-h-screen overflow-hidden">
        <main className="container mx-auto px-4 py-16 relative z-10">
          
          {/* Interest Form Section */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-500 hover:shadow-2xl animate-fade-in-up">
            <div className="px-6 py-10 md:p-12">
              <div className="text-center mb-8">
                <Star className="mx-auto h-12 w-12 text-yellow-400 animate-bounce" />
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mt-4">
                  Register Your Interest!
                </h2>
                <p className="text-md text-gray-600 mt-2">
                  Join our waitlist for exclusive early-bird discounts and launch updates.
                </p><br />
                <p><a href="https://forms.gle/2nqz9RpQYFYCiwzt5" target='_blank'>Register  Your Self 👉🏻 https://forms.gle/2nqz9RpQYFYCiwzt5</a></p>
              </div>
              
              <div className="relative min-h-[500px]">
                {isFormLoading && !formLoadFailed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 rounded-xl">
                    <Loader className="h-12 w-12 text-primary animate-spin" />
                    <p className="mt-4 text-gray-600">Loading form, please wait...</p>
                  </div>
                )}
                {formLoadFailed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 rounded-xl p-4">
                    <p className="text-red-500 text-center mb-4">The form is taking a long time to load.</p>
                    <Button onClick={handleReloadForm}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Reloading the Form
                    </Button>
                  </div>
                )}
                <iframe
                  key={iframeKey}
                  src="https://forms.gle/2nqz9RpQYFYCiwzt5"
                  width="100%"
                  height="800"
                  frameBorder="0"
                  marginHeight={0}
                  marginWidth={0}
                  className={`rounded-xl border-2 border-gray-200/50 transition-opacity duration-500 ${isFormLoading ? 'opacity-0' : 'opacity-100'}`}
                  title="CA Inter Interest Form"
                  onLoad={() => setIsFormLoading(false)}
                  loading="lazy"
                >
                  Loading…
                </iframe>
              </div>
            </div>
          </div>

          {/* What to Expect Section */}
          <div className="mt-24 text-center animate-fade-in-up animation-delay-400">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What to Expect</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
              Our CA Inter Test Series is being built from the ground up to provide you with the best preparation experience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-2">
                  <div className="flex justify-center items-center h-20 w-20 bg-gray-100 rounded-full mx-auto mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Explore Other Offerings Section */}
          <div className="text-center mt-24 animate-fade-in-up animation-delay-600">
            <p className="text-xl font-semibold text-gray-800 mb-6">While you wait, explore our other offerings:</p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Button size="lg" variant="outline" className="text-lg py-6 px-8 rounded-xl shadow-md transition-transform hover:scale-105" onClick={() => window.location.href = '/test-series'}>
                <Star className="mr-3 h-6 w-6 text-yellow-500" />
                View CA Final Test Series
              </Button>
              <Button size="lg" className="text-lg py-6 px-8 rounded-xl shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-transform hover:scale-105" onClick={() => window.location.href = '/free-resources'}>
                <BookOpen className="mr-3 h-6 w-6" />
                Explore Free Resources
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default CaInter;
