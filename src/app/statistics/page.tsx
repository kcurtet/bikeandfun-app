'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';


interface RentalItem {
  id: number;
  bike_type_id: number;
  rental_pricing_id: number;
  quantity: number;
  bike_type?: {
    type_name: string;
  };
  rental_pricing?: {
    duration: number;
    duration_unit: string;
    price: number;
  };
}

interface Rental {
  id: number;
  customer_id: number;
  status: 'active' | 'completed' | 'canceled';
  start_date: string;
  created_at: string;
  rental_items: RentalItem[];
}

interface Repair {
  id: number;
  customer_id: number;
  bike_model: string;
  repair_start: string;
  repair_end: string | null;
  delivery_date: string | null;
  price: number;
  notes: string;
  status: 'pending' | 'in progress' | 'completed' | 'delivered' | 'canceled';
  created_at: string;
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
  const supabase = createClient();

  const calculateStats = (rentals: Rental[], repairs: Repair[]) => {
    const rentalStats: RentalStats = {
      totalRevenue: 0,
      totalRentals: 0,
      averagePrice: 0,
      byBikeType: [],
      byMonth: [],
    };

    const repairStats: RepairStats = {
      totalRevenue: 0,
      totalRepairs: 0,
      averagePrice: 0,
      byBikeType: [],
      byMonth: [],
    };

    // Calculate rental statistics
    rentals.forEach(rental => {
      if (rental.status === 'canceled') return; // Skip canceled rentals

      const startDate = new Date(rental.created_at);
      const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

      rental.rental_items?.forEach(item => {
        const bikeType = item.bike_type;
        if (!bikeType) return;

        const price = item.rental_pricing?.price || 0;
        const quantity = item.quantity || 0;
        const totalPrice = price * quantity;

        // Update total revenue
        rentalStats.totalRevenue += totalPrice;

        // Update rentals by bike type
        if (!rentalStats.byBikeType.some(b => b.type === bikeType.type_name)) {
          rentalStats.byBikeType.push({ type: bikeType.type_name, count: 0, revenue: 0, averagePrice: 0 });
        }
        const bikeTypeStats = rentalStats.byBikeType.find(b => b.type === bikeType.type_name);
        if (bikeTypeStats) {
          bikeTypeStats.count += quantity;
          bikeTypeStats.revenue += totalPrice;
          bikeTypeStats.averagePrice = bikeTypeStats.revenue / bikeTypeStats.count;
        }

        // Update rentals by month
        if (!rentalStats.byMonth.some(m => m.month === monthKey)) {
          rentalStats.byMonth.push({ month: monthKey, count: 0, revenue: 0, averagePrice: 0 });
        }
        const monthStats = rentalStats.byMonth.find(m => m.month === monthKey);
        if (monthStats) {
          monthStats.count += quantity;
          monthStats.revenue += totalPrice;
          monthStats.averagePrice = monthStats.revenue / monthStats.count;
        }
      });

      rentalStats.totalRentals++;
    });

    // Calculate repair statistics
    repairs.forEach(repair => {
      if (repair.status === 'canceled') return; // Skip canceled repairs

      const startDate = new Date(repair.created_at);
      const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

      // Update total revenue
      repairStats.totalRevenue += repair.price;

      // Update repairs by bike type
      if (!repairStats.byBikeType.some(b => b.type === repair.bike_model)) {
        repairStats.byBikeType.push({ type: repair.bike_model, count: 0, revenue: 0, averagePrice: 0 });
      }
      const bikeTypeStats = repairStats.byBikeType.find(b => b.type === repair.bike_model);
      if (bikeTypeStats) {
        bikeTypeStats.count++;
        bikeTypeStats.revenue += repair.price;
        bikeTypeStats.averagePrice = bikeTypeStats.revenue / bikeTypeStats.count;
      }

      // Update repairs by month
      if (!repairStats.byMonth.some(m => m.month === monthKey)) {
        repairStats.byMonth.push({ month: monthKey, count: 0, revenue: 0, averagePrice: 0 });
      }
      const monthStats = repairStats.byMonth.find(m => m.month === monthKey);
      if (monthStats) {
        monthStats.count++;
        monthStats.revenue += repair.price;
        monthStats.averagePrice = monthStats.revenue / monthStats.count;
      }
    });

    // Calculate overall averages
    if (rentalStats.totalRentals > 0) {
      rentalStats.averagePrice = rentalStats.totalRevenue / rentalStats.totalRentals;
    }

    if (repairStats.totalRepairs > 0) {
      repairStats.averagePrice = repairStats.totalRevenue / repairStats.totalRepairs;
    }

    return { rentalStats, repairStats };
  };

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

      if (rentalsError) {
        console.error('Error fetching rentals:', rentalsError);
        throw new Error(`Error fetching rentals: ${rentalsError.message}`);
      }

      // Fetch repairs
      const { data: repairs, error: repairsError } = await supabase
        .from('repairs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (repairsError) {
        console.error('Error fetching repairs:', repairsError);
        throw new Error(`Error fetching repairs: ${repairsError.message}`);
      }

      const rentalData = rentals as unknown as Rental[];
      const repairData = repairs as unknown as Repair[];

      const { rentalStats, repairStats } = calculateStats(rentalData, repairData);

      setRentalStats(rentalStats);
      setRepairStats(repairStats);
    } catch (error) {
      console.error('Error in fetchStats:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while fetching statistics');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, timeRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Estadísticas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg ${
              timeRange === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg ${
              timeRange === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-4 py-2 rounded-lg ${
              timeRange === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Año
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('rentals')}
            className={`flex-1 py-3 px-4 rounded-lg text-center font-medium ${
              activeTab === 'rentals'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Alquileres
          </button>
          <button
            onClick={() => setActiveTab('repairs')}
            className={`flex-1 py-3 px-4 rounded-lg text-center font-medium ${
              activeTab === 'repairs'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Reparaciones
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'rentals' ? (
            <>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Alquileres</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Ingresos Totales</p>
                    <p className="text-2xl font-bold text-gray-900">{rentalStats.totalRevenue.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total de Alquileres</p>
                    <p className="text-2xl font-bold text-gray-900">{rentalStats.totalRentals}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Precio Promedio</p>
                    <p className="text-2xl font-bold text-gray-900">{rentalStats.averagePrice.toFixed(2)}€</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Tipo de Bicicleta</h3>
                <div className="space-y-4">
                  {rentalStats.byBikeType.map((stat) => (
                    <div key={stat.type} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{stat.type}</p>
                        <p className="text-sm text-gray-600">{stat.count} alquileres</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{stat.revenue.toFixed(2)}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Mes</h3>
                <div className="space-y-4">
                  {rentalStats.byMonth.map((stat) => (
                    <div key={stat.month} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{stat.month}</p>
                        <p className="text-sm text-gray-600">{stat.count} alquileres</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{stat.revenue.toFixed(2)}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Reparaciones</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Ingresos Totales</p>
                    <p className="text-2xl font-bold text-gray-900">{repairStats.totalRevenue.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total de Reparaciones</p>
                    <p className="text-2xl font-bold text-gray-900">{repairStats.totalRepairs}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Precio Promedio</p>
                    <p className="text-2xl font-bold text-gray-900">{repairStats.averagePrice.toFixed(2)}€</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Modelo de Bicicleta</h3>
                <div className="space-y-4">
                  {repairStats.byBikeType.map((stat) => (
                    <div key={stat.type} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{stat.type}</p>
                        <p className="text-sm text-gray-600">{stat.count} reparaciones</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{stat.revenue.toFixed(2)}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Mes</h3>
                <div className="space-y-4">
                  {repairStats.byMonth.map((stat) => (
                    <div key={stat.month} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{stat.month}</p>
                        <p className="text-sm text-gray-600">{stat.count} reparaciones</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{stat.revenue.toFixed(2)}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
