'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { formatDateTime } from '@/utils/dateUtils';

interface Rental {
  id: number;
  customer_id: number;
  status: 'active' | 'completed' | 'canceled';
  start_date: string;
  created_at: string;
  rental_items?: {
    id: number;
    bike_type_id: number;
    rental_pricing_id: number;
    rental_pricing?: {
      duration: number;
      duration_unit: string;
      price: number;
    };
  }[];
}

interface Customer {
  id: number;
  name: string;
}

interface BikeType {
  id: number;
  type_name: string;
}

// Status-related functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'canceled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function RentalHistoryPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bikeTypes, setBikeTypes] = useState<BikeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchRentals();
    fetchCustomers();
    fetchBikeTypes();
  }, []);

  const fetchRentals = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('rentals')
        .select(`
          *,
          rental_items (
            id,
            bike_type_id,
            rental_pricing_id,
            rental_pricing:rental_pricing_id (
              duration,
              duration_unit,
              price
            )
          )
        `)
        .not('status', 'eq', 'active')
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Error fetching rentals: ${error.message}`);
      setRentals(data || []);
    } catch (error) {
      console.error('Error fetching rentals:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while fetching rentals');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('customers')
        .select('id, name');

      if (error) throw new Error(`Error fetching customers: ${error.message}`);
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while fetching customers');
    }
  };

  const fetchBikeTypes = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('bike_types')
        .select('*');

      if (error) throw new Error(`Error fetching bike types: ${error.message}`);
      setBikeTypes(data || []);
    } catch (error) {
      console.error('Error fetching bike types:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while fetching bike types');
    }
  };

  const calculateEndDate = (startDate: string, duration: number, durationUnit: string): string => {
    try {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) {
        return '-';
      }

      let endDate = new Date(date);
      switch (durationUnit) {
        case 'hour':
          endDate.setHours(endDate.getHours() + duration);
          break;
        case 'day':
          endDate.setDate(endDate.getDate() + duration);
          break;
        case 'week':
          endDate.setDate(endDate.getDate() + (duration * 7));
          break;
        default:
          return '-';
      }

      return formatDateTime(endDate.toISOString());
    } catch (error) {
      console.error('Error calculating end date:', error);
      return '-';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Rental History</h1>
        </div>
        <Link
          href="/rentals"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Back to Active Rentals
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rentals.map((rental) => (
            <div 
              key={rental.id} 
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedRental(rental)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {customers.find(c => c.id === rental.customer_id)?.name}
                </h3>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(rental.status)}`}>
                  {rental.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {rental.rental_items?.map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-1">
                      <span className="font-medium text-gray-900">
                        {bikeTypes.find(b => b.id === item.bike_type_id)?.type_name}
                      </span>
                      {item.rental_pricing && (
                        <span className="text-sm text-gray-600 block">
                          {item.rental_pricing.duration} {item.rental_pricing.duration_unit}
                        </span>
                      )}
                    </div>
                    {item.rental_pricing && (
                      <span className="font-bold text-gray-900 text-lg">
                        ${item.rental_pricing.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center py-3 border-t border-gray-200">
                <span className="text-gray-600 font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-gray-900">
                  ${rental.rental_items?.reduce((total, item) => 
                    total + (item.rental_pricing?.price || 0), 0
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rental Details Modal */}
      {selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Rental Details</h2>
              <button
                onClick={() => setSelectedRental(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Information</h3>
                  <p className="text-gray-600">
                    {customers.find(c => c.id === selectedRental.customer_id)?.name}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedRental.status)}`}>
                    {selectedRental.status}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bikes</h3>
                <div className="space-y-3">
                  {selectedRental.rental_items?.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900">
                            {bikeTypes.find(b => b.id === item.bike_type_id)?.type_name}
                          </p>
                          {item.rental_pricing && (
                            <p className="text-sm text-gray-600">
                              Duration: {item.rental_pricing.duration} {item.rental_pricing.duration_unit}
                            </p>
                          )}
                        </div>
                        {item.rental_pricing && (
                          <p className="text-xl font-bold text-gray-900">
                            ${item.rental_pricing.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Time</h3>
                  <p className="text-gray-600">{formatDateTime(selectedRental.start_date)}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Amount</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    ${selectedRental.rental_items?.reduce((total, item) => 
                      total + (item.rental_pricing?.price || 0), 0
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 