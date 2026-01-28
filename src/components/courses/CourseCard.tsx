import { Link } from "react-router-dom";
import { Clock, User, Star, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Course {
  _id: string;
  title: string;
  category: {
    _id: string;
    name: string;
  };
  instructor?: string;
  thumbnail?: string;
  price: number;
  duration?: string;
  level?: string;
  rating?: number;
  enrollmentCount?: number;
  isPublished?: boolean;
  publishStatus?: string;
  description?: string;
}

interface CourseCardProps {
  course: Course;
  index?: number;
}

const CourseCard = ({ course, index = 0 }: CourseCardProps) => {
  return (
    <div
      className="course-card group animate-fade-in"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Course Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={course.thumbnail || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop"}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            {course.category?.name || 'Course'}
          </span>
        </div>
      </div>

      {/* Course Info */}
      <div className="p-5">
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 min-h-[48px] group-hover:text-primary transition-colors">
          {course.title}
        </h3>

        {/* Description */}
        {course.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[40px]">
            {course.description}
          </p>
        )}

        {/* Instructor Info */}
        {course.instructor && typeof course.instructor === 'string' && course.instructor.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{course.instructor}</p>
            </div>
          </div>
        )}

        {/* Duration & Rating */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          {course.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{course.duration}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-foreground font-medium">{(4.5 + (index % 6) * 0.1).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{1000 + (index % 5) * 500}+ enrolled</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            {course.price > 0 ? (
              <span className="text-xl font-bold text-primary">₹{course.price.toLocaleString()}</span>
            ) : (
              <span className="text-lg font-bold text-green-600">Free</span>
            )}
          </div>
          <Link to={`/course/${course._id}`}>
            <Button size="sm" className="bg-primary hover:bg-navy-light text-primary-foreground">
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;