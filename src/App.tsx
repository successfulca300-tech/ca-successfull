import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import CourseDetail from "./pages/CourseDetail";
import EnrollmentPayment from "./pages/EnrollmentPayment";
import TestSeries from "./pages/TestSeries";
import TestSeriesDetail from "./pages/TestSeriesDetail";
import Books from "./pages/Books";
import BookDetail from "./pages/BookDetail";
import BookReader from "./pages/BookReader";
import CourseContent from "./pages/CourseContent";
import TestSeriesContent from "./pages/TestSeriesContent";
import FreeResources from "./pages/FreeResources";
import Mentorship from "./pages/Mentorship";
import ResourceDetail from "./pages/ResourceDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Login from "./pages/Login";
import VerifyEmail from "./pages/VerifyEmail";
import Cart from "./pages/Cart";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SubAdminDashboard from "./pages/SubAdminDashboard";
import CoursesManager from "./pages/admin/CoursesManager";
import CreateCourse from "./pages/admin/CreateCourse";
import EditCourse from "./pages/admin/EditCourse";
import OffersManager from "./pages/admin/OffersManager";
import CategoriesManager from "./pages/admin/CategoriesManager";
import TestimonialsManager from "./pages/admin/TestimonialsManager";
import PublishRequestsManager from "./pages/admin/PublishRequestsManager";
import UsersManager from "./pages/admin/UsersManager";
import ResourcesManager from "./pages/admin/ResourcesManager";
import AdminSettings from "./pages/admin/AdminSettings";
import SubadminTestSeries from "./pages/SubadminTestSeries";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/classes" element={<Navigate to="/mentorship" replace />} />
          <Route path="/classes/:category" element={<Navigate to="/mentorship" replace />} />
          <Route path="/course/:id" element={<CourseDetail />} />
          <Route path="/course/:id/content" element={<ProtectedRoute><CourseContent /></ProtectedRoute>} />
          <Route path="/course/:courseId/enroll" element={<ProtectedRoute><EnrollmentPayment /></ProtectedRoute>} />
          <Route path="/mentorship" element={<Mentorship />} />
          <Route path="/resource/:resourceId" element={<ResourceDetail />} />
          <Route path="/test-series" element={<TestSeries />} />
          <Route path="/testseries/:id" element={<TestSeriesDetail />} />
          <Route path="/testseries/:id/content" element={<ProtectedRoute><TestSeriesContent /></ProtectedRoute>} />
          <Route path="/books" element={<Books />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/books/:id/read" element={<ProtectedRoute><BookReader /></ProtectedRoute>} />
          <Route path="/free-resources" element={<FreeResources />} />

          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute requiredRole="admin"><CoursesManager /></ProtectedRoute>} />
          <Route path="/admin/courses/create" element={<ProtectedRoute requiredRole="admin"><CreateCourse /></ProtectedRoute>} />
          <Route path="/admin/offers" element={<ProtectedRoute requiredRole="admin"><OffersManager /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute requiredRole="admin"><CategoriesManager /></ProtectedRoute>} />
          <Route path="/admin/testimonials" element={<ProtectedRoute requiredRole="admin"><TestimonialsManager /></ProtectedRoute>} />
          <Route path="/admin/publish-requests" element={<ProtectedRoute requiredRole="admin"><PublishRequestsManager /></ProtectedRoute>} />
          <Route path="/admin/resources" element={<ProtectedRoute requiredRole="admin"><ResourcesManager /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><UsersManager /></ProtectedRoute>} />
          <Route path="/subadmin" element={<ProtectedRoute requiredRole="subadmin"><SubAdminDashboard /></ProtectedRoute>} />
          <Route path="/subadmin/test-series" element={<ProtectedRoute requiredRole="subadmin"><SubadminTestSeries /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
