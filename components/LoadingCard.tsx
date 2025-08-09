'use client'; // Used to specify that this is a client component (nextjs defaults to server components)

const LoadingCard: React.FC = () => {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Transport Icon Skeleton */}
          <div className="w-10 h-10 bg-gray-200 rounded-lg loading-skeleton"></div>

          {/* Route Info Skeleton */}
          <div className="flex-1">
            <div className="h-5 w-16 bg-gray-200 rounded loading-skeleton mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 rounded loading-skeleton mb-1"></div>
            <div className="h-3 w-24 bg-gray-200 rounded loading-skeleton"></div>
          </div>
        </div>

        {/* Time Info Skeleton */}
        <div className="text-right">
          <div className="h-5 w-12 bg-gray-200 rounded loading-skeleton mb-2"></div>
          <div className="h-4 w-16 bg-gray-200 rounded loading-skeleton mb-1"></div>
          <div className="h-3 w-12 bg-gray-200 rounded loading-skeleton"></div>
        </div>

        {/* Maps Icon Skeleton */}
        <div className="ml-2">
          <div className="w-5 h-5 bg-gray-200 rounded loading-skeleton"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingCard;
