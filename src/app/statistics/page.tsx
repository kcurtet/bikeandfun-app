'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface RentalStats {
  total_revenue: number;
  total_rentals: number;
  average_price: number;
  by_bike_type: {
    bike_type_id: number;
    type_name: string;
    revenue: number;
    count: number;
  }[];
  by_month: {
    month: string;
    revenue: number;
    count: number;
  }[];
}

interface RepairStats {
  total_revenue: number;
  total_repairs: number;
  average_price: number;
  by_status: {
    status: string;
    count: number;
    revenue: number;
  }[];
  by_month: {
    month: string;
    revenue: number;
    count: number;
  }[];
}

interface RentalPricing {
  price: number;
}

interface RentalItem {
  bike_type_id: number;
  quantity: number;
  rental_pricing: RentalPricing;
}

interface Rental {
  id: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  start_date: string;
  rental_items: RentalItem[];
}

export default function StatisticsPage() {
  const [rentalStats, setRentalStats] = useState<RentalStats | null>(null);
  const [repairStats, setRepairStats] = useState<RepairStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'rentals' | 'repairs'>('rentals');

  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      let startDate = new Date();

      // Calcular la fecha de inicio según el rango seleccionado
      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Obtener estadísticas de alquileres
      const { data: rentals, error: rentalsError } = await supabase
        .from('rentals')
        .select(`
          id,
          status,
          created_at,
          start_date,
          rental_items!inner (
            bike_type_id,
            quantity,
            rental_pricing!inner (
              price
            )
          )
        `)
        .eq('status', 'completed')
        .gte('start_date', startDate.toISOString());

      if (rentalsError) throw rentalsError;

      console.log('Fecha inicio:', startDate.toISOString());
      console.log('Fecha fin:', now.toISOString());
      console.log('Alquileres:', rentals);

      // Obtener tipos de bicicletas
      const { data: bikeTypes, error: bikeTypesError } = await supabase
        .from('bike_types')
        .select('id, type_name');

      if (bikeTypesError) throw bikeTypesError;

      console.log('Tipos de bicicletas:', bikeTypes);

      // Calcular estadísticas de alquileres
      const totalRentalRevenue = rentals?.reduce((sum, rental) => {
        const rentalTotal = rental.rental_items.reduce((itemSum, item) => 
          itemSum + ((item.rental_pricing as any).price || 0) * item.quantity, 0
        );
        return sum + rentalTotal;
      }, 0) || 0;

      console.log('Ingresos totales alquileres:', totalRentalRevenue);

      const totalRentals = rentals?.length || 0;
      const averageRentalPrice = totalRentals > 0 ? totalRentalRevenue / totalRentals : 0;

      // Estadísticas por tipo de bicicleta
      const byBikeType = bikeTypes?.map(type => {
        const typeRentals = rentals?.filter(rental => 
          rental.rental_items.some(item => item.bike_type_id === type.id)
        ) || [];
        
        const revenue = typeRentals.reduce((sum, rental) => {
          const typeItems = rental.rental_items.filter(item => item.bike_type_id === type.id);
          return sum + typeItems.reduce((itemSum, item) => 
            itemSum + ((item.rental_pricing as any).price || 0) * item.quantity, 0
          );
        }, 0);

        return {
          bike_type_id: type.id,
          type_name: type.type_name,
          revenue,
          count: typeRentals.length
        };
      }) || [];

      // Estadísticas mensuales de alquileres
      const rentalByMonth = rentals?.reduce((acc: { [key: string]: { revenue: number; count: number } }, rental) => {
        const month = new Date(rental.created_at).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        if (!acc[month]) {
          acc[month] = { revenue: 0, count: 0 };
        }
        const rentalTotal = rental.rental_items.reduce((itemSum, item) => 
          itemSum + ((item.rental_pricing as any).price || 0) * item.quantity, 0
        );
        acc[month].revenue += rentalTotal;
        acc[month].count += 1;
        return acc;
      }, {}) || {};

      const rentalMonthlyStats = Object.entries(rentalByMonth)
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          count: data.count,
          date: new Date(month)
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map(({ month, revenue, count }) => ({ month, revenue, count }));

      setRentalStats({
        total_revenue: totalRentalRevenue,
        total_rentals: totalRentals,
        average_price: averageRentalPrice,
        by_bike_type: byBikeType,
        by_month: rentalMonthlyStats
      });

      // Obtener estadísticas de reparaciones
      const { data: repairs, error: repairsError } = await supabase
        .from('repairs')
        .select('*')
        .eq('status', 'delivered')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (repairsError) throw repairsError;

      console.log('Reparaciones:', repairs);

      // Calcular estadísticas de reparaciones
      const totalRepairRevenue = repairs?.reduce((sum, repair) => sum + (repair.price || 0), 0) || 0;
      console.log('Ingresos totales reparaciones:', totalRepairRevenue);

      const totalRepairs = repairs?.length || 0;
      const averageRepairPrice = totalRepairs > 0 ? totalRepairRevenue / totalRepairs : 0;

      // Estadísticas por estado de reparación
      const byStatus = repairs?.reduce((acc: { [key: string]: { count: number; revenue: number } }, repair) => {
        if (!acc[repair.status]) {
          acc[repair.status] = { count: 0, revenue: 0 };
        }
        acc[repair.status].count += 1;
        acc[repair.status].revenue += repair.price || 0;
        return acc;
      }, {}) || {};

      const repairByStatus = Object.entries(byStatus).map(([status, data]) => ({
        status,
        count: data.count,
        revenue: data.revenue
      }));

      // Estadísticas mensuales de reparaciones
      const repairByMonth = repairs?.reduce((acc: { [key: string]: { revenue: number; count: number } }, repair) => {
        const month = new Date(repair.created_at).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        if (!acc[month]) {
          acc[month] = { revenue: 0, count: 0 };
        }
        acc[month].revenue += repair.price || 0;
        acc[month].count += 1;
        return acc;
      }, {}) || {};

      const repairMonthlyStats = Object.entries(repairByMonth)
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          count: data.count,
          date: new Date(month)
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map(({ month, revenue, count }) => ({ month, revenue, count }));

      setRepairStats({
        total_revenue: totalRepairRevenue,
        total_repairs: totalRepairs,
        average_price: averageRepairPrice,
        by_status: repairByStatus,
        by_month: repairMonthlyStats
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      if (error instanceof Error) {
        setError(`Error al cargar las estadísticas: ${error.message}`);
      } else {
        setError('Error al cargar las estadísticas');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
                  {rentalStats.total_revenue.toFixed(2)}€
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Alquileres</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {rentalStats.total_rentals}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Precio Promedio</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {rentalStats.average_price.toFixed(2)}€
                </p>
              </div>
            </div>

            {/* Estadísticas por tipo de bicicleta */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingresos por Tipo de Bicicleta</h2>
              <div className="space-y-4">
                {rentalStats.by_bike_type.map((type) => (
                  <div key={type.bike_type_id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{type.type_name}</h3>
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
                {rentalStats.by_month.map((month) => (
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
                  {repairStats.total_revenue.toFixed(2)}€
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Reparaciones</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {repairStats.total_repairs}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Precio Promedio</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {repairStats.average_price.toFixed(2)}€
                </p>
              </div>
            </div>

            {/* Estadísticas por estado */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Reparaciones por Estado</h2>
              <div className="space-y-4">
                {repairStats.by_status.map((status) => (
                  <div key={status.status} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">
                        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
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
                {repairStats.by_month.map((month) => (
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