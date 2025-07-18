import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { neonStockService } from "@/services/neonStockService";
import {
  Database,
  Package,
  AlertTriangle,
  TrendingDown,
  Clock,
} from "lucide-react";

const NeonStockStats = () => {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["neon-stock-stats"],
    queryFn: () => neonStockService.getStockStats(),
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 60 * 1000, // Actualizar cada minuto
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Stock Stats (Neon)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Database className="h-5 w-5" />
            Stock Stats (Neon) - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">
            Error loading stock statistics from Neon
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return "Never";
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          Stock Stats (Neon)
          <Badge variant="outline" className="ml-auto">
            Real-time
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Products */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package className="h-4 w-4" />
              Products
            </div>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </div>

          {/* Total Variations */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package className="h-4 w-4" />
              Variations
            </div>
            <div className="text-2xl font-bold">{stats.totalVariations}</div>
          </div>

          {/* Out of Stock */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Out of Stock
            </div>
            <div className="text-2xl font-bold text-red-600">
              {stats.outOfStock}
            </div>
          </div>

          {/* Low Stock */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <TrendingDown className="h-4 w-4" />
              Low Stock
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {stats.lowStock}
            </div>
          </div>
        </div>

        {/* Last Sync Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            Last sync: {formatLastSync(stats.lastSync)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NeonStockStats;
