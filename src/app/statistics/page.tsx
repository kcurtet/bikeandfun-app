'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface BikeType {
  id: number;
  type_name: string;
}

interface RentalPricing {
  price: number;
}

interface RentalItem {
  bike_type_id: number;
  bike_type?: BikeType;
  rental_pricing?: RentalPricing;
}

interface Rental {
  id: number;
  created_at: string;
  rental_items: RentalItem[];
}

interface Repair {
  id: number;
  created_at: string;
  total_price: number;
  bike_type?: BikeType;
}

interface RentalStats {
  totalRevenue: number;
  totalRentals: number;
  averagePrice: number;
  byBikeType: Array<{
    type: string;
    count: number;
    revenue: number;
    averagePrice: number;
  }>;
  byMonth: Array<{
    month: string;
    count: number;
    revenue: number;
    averagePrice: number;
  }>;
}

interface RepairStats {
  totalRevenue: number;
  totalRepairs: number;
  averagePrice: number;
  byBikeType: Array<{
    type: string;
    count: number;
    revenue: number;
    averagePrice: number;
  }>;
  byMonth: Array<{
    month: string;
    count: number;
    revenue: number;
    averagePrice: number;
  }>;
}

export default function StatisticsPage() {
  const [rentalStats, setRentalStats] = useState<RentalStats>({
    totalRevenue: 0,
    totalRentals: 0,
    averagePrice: 0,
    byBikeType: [],
    byMonth: [],
  });
  const [repairStats, setRepairStats] = useState<RepairStats>({
    totalRevenue: 0,
    totalRepairs: 0,
    averagePrice: 0,
    byBikeType: [],
    byMonth: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'rentals' | 'repairs'>('rentals');
  const supabase = createClientComponentClient();

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      switch (timeRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Fetch rentals
      const { data: rentals, error: rentalsError } = await supabase
        .from('rentals')
        .select(`
          *,
          rental_items (
            *,
            bike_type: bike_types (
              type_name
            ),
            rental_pricing (
              price
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (rentalsError) throw rentalsError;

      // Calculate rental statistics
      const rentalData = rentals as unknown as Rental[];
      const totalRentalRevenue = rentalData.reduce((sum, rental) => {
        return sum + rental.rental_items.reduce((itemSum, item) => {
          return itemSum + (item.rental_pricing?.price || 0);
        }, 0);
      }, 0);

      const totalRentals = rentalData.length;
      const averageRentalPrice = totalRentals > 0 ? totalRentalRevenue / totalRentals : 0;

      // Calculate statistics by bike type
      const typeRentals = rentalData.reduce((acc, rental) => {
        rental.rental_items.forEach(item => {
          const typeName = item.bike_type?.type_name || 'Unknown';
          if (!acc[typeName]) {
            acc[typeName] = { count: 0, revenue: 0 };
          }
          acc[typeName].count++;
          acc[typeName].revenue += item.rental_pricing?.price || 0;
        });
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      const byBikeType = Object.entries(typeRentals).map(([type, stats]) => ({
        type,
        count: stats.count,
        revenue: stats.revenue,
        averagePrice: stats.revenue / stats.count,
      }));

      // Calculate statistics by month
      const rentalByMonth = rentalData.reduce((acc, rental) => {
        const month = new Date(rental.created_at).toLocaleString('default', { month: 'long' });
        if (!acc[month]) {
          acc[month] = { count: 0, revenue: 0 };
        }
        acc[month].count++;
        acc[month].revenue += rental.rental_items.reduce((sum, item) => {
          return sum + (item.rental_pricing?.price || 0);
        }, 0);
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      const byMonth = Object.entries(rentalByMonth).map(([month, stats]) => ({
        month,
        count: stats.count,
        revenue: stats.revenue,
        averagePrice: stats.revenue / stats.count,
      }));

      setRentalStats({
        totalRevenue: totalRentalRevenue,
        totalRentals,
        averagePrice: averageRentalPrice,
        byBikeType,
        byMonth,
      });

      // Fetch repairs
      const { data: repairs, error: repairsError } = await supabase
        .from('repairs')
        .select(`
          *,
          bike_type: bike_types (
            type_name
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (repairsError) throw repairsError;

      // Calculate repair statistics
      const repairData = repairs as unknown as Repair[];
      const totalRepairRevenue = repairData.reduce((sum, repair) => sum + (repair.total_price || 0), 0);
      const totalRepairs = repairData.length;
      const averageRepairPrice = totalRepairs > 0 ? totalRepairRevenue / totalRepairs : 0;

      // Calculate statistics by bike type
      const repairTypeStats = repairData.reduce((acc, repair) => {
        const typeName = repair.bike_type?.type_name || 'Unknown';
        if (!acc[typeName]) {
          acc[typeName] = { count: 0, revenue: 0 };
        }
        acc[typeName].count++;
        acc[typeName].revenue += repair.total_price || 0;
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      const repairByBikeType = Object.entries(repairTypeStats).map(([type, stats]) => ({
        type,
        count: stats.count,
        revenue: stats.revenue,
        averagePrice: stats.revenue / stats.count,
      }));

      // Calculate statistics by month
      const repairByMonth = repairData.reduce((acc, repair) => {
        const month = new Date(repair.created_at).toLocaleString('default', { month: 'long' });
        if (!acc[month]) {
          acc[month] = { count: 0, revenue: 0 };
        }
        acc[month].count++;
        acc[month].revenue += repair.total_price || 0;
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      const repairByMonthStats = Object.entries(repairByMonth).map(([month, stats]) => ({
        month,
        count: stats.count,
        revenue: stats.revenue,
        averagePrice: stats.revenue / stats.count,
      }));

      setRepairStats({
        totalRevenue: totalRepairRevenue,
        totalRepairs,
        averagePrice: averageRepairPrice,
        byBikeType: repairByBikeType,
        byMonth: repairByMonthStats,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Error al cargar las estadísticas');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, timeRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg ${
              timeRange === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Última semana
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg ${
              timeRange === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Último mes
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-4 py-2 rounded-lg ${
              timeRange === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Último año
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('rentals')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'rentals'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Alquileres
          </button>
          <button
            onClick={() => setActiveTab('repairs')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'repairs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Reparaciones
          </button>
        </div>
      </div>

      {activeTab === 'rentals' ? (
        rentalStats ? (
          <>
            {/* Resumen general de alquileres */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ingresos Totales</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {rentalStats.totalRevenue.toFixed(2)}€
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Alquileres</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {rentalStats.totalRentals}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Precio Promedio</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {rentalStats.averagePrice.toFixed(2)}€
                </p>
              </div>
            </div>

            {/* Estadísticas por tipo de bicicleta */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingresos por Tipo de Bicicleta</h2>
              <div className="space-y-4">
                {rentalStats.byBikeType.map((type) => (
                  <div key={type.type} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{type.type}</h3>
                      <p className="text-sm text-gray-600">{type.count} alquileres</p>
                    </div>
                    <p className="text-lg font-semibold text-blue-600">{type.revenue.toFixed(2)}€</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Estadísticas mensuales */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingresos Mensuales</h2>
              <div className="space-y-4">
                {rentalStats.byMonth.map((month) => (
                  <div key={month.month} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{month.month}</h3>
                      <p className="text-sm text-gray-600">{month.count} alquileres</p>
                    </div>
                    <p className="text-lg font-semibold text-blue-600">{month.revenue.toFixed(2)}€</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">No hay datos disponibles para el período seleccionado</p>
          </div>
        )
      ) : (
        repairStats ? (
          <>
            {/* Resumen general de reparaciones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ingresos Totales</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {repairStats.totalRevenue.toFixed(2)}€
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Reparaciones</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {repairStats.totalRepairs}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Precio Promedio</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {repairStats.averagePrice.toFixed(2)}€
                </p>
              </div>
            </div>

            {/* Estadísticas por estado */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Reparaciones por Estado</h2>
              <div className="space-y-4">
                {repairStats.byBikeType.map((status) => (
                  <div key={status.type} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">
                        {status.type.charAt(0).toUpperCase() + status.type.slice(1)}
                      </h3>
                      <p className="text-sm text-gray-600">{status.count} reparaciones</p>
                    </div>
                    <p className="text-lg font-semibold text-blue-600">{status.revenue.toFixed(2)}€</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Estadísticas mensuales */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingresos Mensuales</h2>
              <div className="space-y-4">
                {repairStats.byMonth.map((month) => (
                  <div key={month.month} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{month.month}</h3>
                      <p className="text-sm text-gray-600">{month.count} reparaciones</p>
                    </div>
                    <p className="text-lg font-semibold text-blue-600">{month.revenue.toFixed(2)}€</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">No hay datos disponibles para el período seleccionado</p>
          </div>
        )
      )}
    </div>
  );
}
