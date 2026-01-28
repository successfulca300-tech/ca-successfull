import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, BookOpen, Video, FileText, CheckCircle } from 'lucide-react';

interface ResourceCardProps {
  title: string;
  description: string;
  resourceCategory: 'video' | 'book' | 'test' | 'notes';
  creator: {
    name: string;
    email: string;
  };
  createdAt: string;
  fileUrl?: string;
  price?: number;
  onView?: () => void;
  onDownload?: () => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  title,
  description,
  resourceCategory,
  creator,
  createdAt,
  fileUrl,
  price,
  onView,
  onDownload,
}) => {
  const getCategoryIcon = () => {
    switch (resourceCategory) {
      case 'video':
        return <Video className="w-5 h-5 text-blue-600" />;
      case 'book':
        return <BookOpen className="w-5 h-5 text-green-600" />;
      case 'test':
        return <CheckCircle className="w-5 h-5 text-purple-600" />;
      case 'notes':
        return <FileText className="w-5 h-5 text-orange-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryLabel = () => {
    const labels: { [key: string]: string } = {
      video: 'Video Course',
      book: 'Book',
      test: 'Test/Quiz',
      notes: 'Notes/PDF',
    };
    return labels[resourceCategory] || resourceCategory;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getCategoryIcon()}
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <CardDescription className="text-sm">
              {getCategoryLabel()}
            </CardDescription>
          </div>
          {price && price > 0 && (
            <div className="text-sm font-semibold text-green-600">
              ₹{price.toLocaleString()}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-gray-700 line-clamp-3">{description}</p>

        <div className="text-xs text-gray-500">
          <p className="font-medium">{creator.name}</p>
          <p>{creator.email}</p>
          <p>{new Date(createdAt).toLocaleDateString()}</p>
        </div>

        <div className="flex gap-2 pt-2">
          {onView && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onView}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
          )}
          {fileUrl && onDownload && (
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={onDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResourceCard;
